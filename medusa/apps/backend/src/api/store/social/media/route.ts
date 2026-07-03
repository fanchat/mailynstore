import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getCustomerId } from "../utils"
import * as fs from "fs"
import * as path from "path"
import Busboy from "busboy"

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

// POST /store/social/media/upload — upload image/video for posts
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  try {
    const busboy = Busboy({ headers: req.headers })

    req.pipe(busboy)

    let fileBuffer: Buffer[] = []
    let fileExt = ".jpg"
    let fileSize = 0

    const result = await new Promise<{ url: string }>((resolve, reject) => {
      busboy.on("file", (fieldname, file, info) => {
        const ext = path.extname(info.filename).toLowerCase()
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".avi", ".webm", ".mp3", ".wav", ".ogg", ".m4a"]
        fileExt = allowed.includes(ext) ? ext : ".bin"

        file.on("data", (chunk: Buffer) => {
          fileSize += chunk.length
          if (fileSize > MAX_SIZE) {
            file.resume()
            return
          }
          fileBuffer.push(chunk)
        })
      })

      busboy.on("error", (err) => {
        console.error("[media] busboy error:", err)
        reject(new Error("upload_error"))
      })

      busboy.on("finish", async () => {
        if (fileBuffer.length === 0 || fileSize > MAX_SIZE) {
          reject(new Error(fileSize > MAX_SIZE ? "file_too_large" : "no_file"))
          return
        }

        const buffer = Buffer.concat(fileBuffer)
        const uploadDir = path.join(process.cwd(), "uploads", "media")
        fs.mkdirSync(uploadDir, { recursive: true })

        const filename = `${customerId}_${Date.now()}${fileExt}`
        const filePath = path.join(uploadDir, filename)
        await fs.promises.writeFile(filePath, buffer)

        const url = `/uploads/media/${filename}`
        resolve({ url })
      })
    })

    return res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === "file_too_large") {
      return res.status(400).json({ error: "file too large (max 20MB)" })
    }
    if (msg === "no_file") {
      return res.status(400).json({ error: "no file uploaded" })
    }
    if (msg === "upload_error") {
      return res.status(400).json({ error: "upload_error" })
    }
    console.error("[social/media] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: msg })
  }
}