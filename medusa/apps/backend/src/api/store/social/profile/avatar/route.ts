import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../utils"
import * as fs from "fs"
import * as path from "path"
import Busboy from "busboy"

// Module-level shared connection pool (one per process, not per request)
const databaseUrl = process.env.DATABASE_URL!
const pool = new Pool({ connectionString: databaseUrl })

// POST /store/social/profile/avatar — upload avatar (multipart)
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  try {
    const busboy = Busboy({ headers: req.headers })

    // Pipe the raw request stream into busboy
    req.pipe(busboy)

    let fileBuffer: Buffer[] = []
    let fileExt = ".jpg"
    let fileSize = 0

    const result = await new Promise<{ url: string }>((resolve, reject) => {
      busboy.on("file", (fieldname, file, info) => {
        const mimeMap: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/gif": ".gif",
        }
        fileExt = mimeMap[info.mimeType] || ".jpg"

        file.on("data", (chunk: Buffer) => {
          fileSize += chunk.length
          if (fileSize > 5 * 1024 * 1024) {
            file.resume() // drop excess data
            return
          }
          fileBuffer.push(chunk)
        })
      })

      busboy.on("error", (err) => {
        console.error("[avatar] busboy error:", err)
        reject(new Error("upload_error"))
      })

      busboy.on("finish", async () => {
        if (fileBuffer.length === 0 || fileSize > 5 * 1024 * 1024) {
          reject(new Error(fileSize > 5 * 1024 * 1024 ? "file_too_large" : "no_file"))
          return
        }

        const buffer = Buffer.concat(fileBuffer)
        const uploadDir = path.join(process.cwd(), "uploads", "avatars")
        fs.mkdirSync(uploadDir, { recursive: true })

        const filename = `${customerId}_${Date.now()}${fileExt}`
        const filePath = path.join(uploadDir, filename)
        await fs.promises.writeFile(filePath, buffer)

        const avatarUrl = `/uploads/avatars/${filename}`

        // Update customer avatar column
        await pool.query(
          `UPDATE customer SET avatar = $1 WHERE id = $2`,
          [avatarUrl, customerId]
        )

        resolve({ url: avatarUrl })
      })
    })

    return res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === "file_too_large") {
      return res.status(400).json({ error: "avatar too large (max 5MB)" })
    }
    if (msg === "no_file") {
      return res.status(400).json({ error: "no file uploaded" })
    }
    if (msg === "upload_error") {
      return res.status(400).json({ error: "upload_error" })
    }
    console.error("[social/profile/avatar] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: msg })
  }
}