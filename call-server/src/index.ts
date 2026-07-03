import "dotenv/config"
import { createServer } from "node:http"
import { appendFileSync } from "node:fs"
import { Server as SocketIOServer } from "socket.io"
import type { Socket } from "socket.io"
import { verifyToken } from "./auth.js"
import { setupCallHandlers } from "./call-handler.js"

const LOGFILE = process.env.SIGNALING_LOG || "/tmp/call-server.log"

// Logger that writes to both console and file
function log(...args: any[]) {
  const msg = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ")
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(msg)
  try { appendFileSync(LOGFILE, line) } catch {}
}

const PORT = parseInt(process.env.SIGNALING_PORT || "3001", 10)
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"

const httpServer = createServer()

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN.split(",").map((s: string) => s.trim()),
    methods: ["GET", "POST"],
  },
  path: "/ws-call",
})

// ── Auth middleware ──
io.use(async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    log(`[call] Socket ${socket.id} rejected: no token`)
    return next(new Error("缺少认证令牌"))
  }

  const user = await verifyToken(token)
  if (!user) {
    log(`[call] Socket ${socket.id} rejected: invalid token (token length=${token.length})`)
    return next(new Error("认证失败"))
  }

  log(`[call] Socket ${socket.id} authenticated as ${user.customer_id} (${user.email})`)
  ;(socket as any).user = user
  next()
})

// ── Call handlers ──
setupCallHandlers(io)

httpServer.listen(PORT, () => {
  log(`[call-server] Signaling server running on ws://0.0.0.0:${PORT}`)
  log(`[call-server] CORS origin: ${CORS_ORIGIN}`)
})
