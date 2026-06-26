import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as fs from "fs"
import * as path from "path"

// GET /uploads/avatars/:filename — serve avatar images publicly
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const filename = req.params.filename as string

  if (!filename || filename.includes("..") || path.isAbsolute(filename)) {
    return res.status(400).json({ error: "invalid path" })
  }

  const fullPath = path.join(process.cwd(), "uploads", "avatars", filename)

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "file not found" })
  }

  const fileContent = fs.readFileSync(fullPath)

  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp",
  }

  res.status(200)
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream")
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  return res.send(fileContent)
}