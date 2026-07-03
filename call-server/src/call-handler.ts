import { appendFileSync } from "node:fs"
import { Server, Socket } from "socket.io"

const LOGFILE = process.env.SIGNALING_LOG || "/tmp/call-server.log"

function log(...args: any[]) {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(msg)
  try {
    appendFileSync(LOGFILE, line)
  } catch {}
}

interface UserInfo {
  customer_id: string
  nickname: string | null
  avatar: string | null
  email: string
}

const onlineUsers = new Map<string, UserInfo>()
const customerSockets = new Map<string, string>()

export function setupCallHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    const user: UserInfo = (socket as any).user

    log(`[call] User connected: ${user.customer_id} (${user.nickname || user.email}) socket=${socket.id}`)
    log(`[call] Online: ${onlineUsers.size} users, ${customerSockets.size} sockets`)

    onlineUsers.set(socket.id, user)
    customerSockets.set(user.customer_id, socket.id)

    socket.broadcast.emit("user:online", {
      customer_id: user.customer_id,
      nickname: user.nickname,
      avatar: user.avatar,
      online: true,
    })

    // ── Call: offer ──
    socket.on("call:offer", ({ target_id, sdp }: { target_id: string; sdp: string }) => {
      log(`[call] Offer from ${user.customer_id} to ${target_id}`)
      const targetSocketId = customerSockets.get(target_id)
      if (!targetSocketId) {
        log(`[call] Target ${target_id} NOT online — sending error`)
        socket.emit("call:error", { message: "对方不在线" })
        return
      }
      log(`[call] Forwarding offer to socket ${targetSocketId}`)
      io.to(targetSocketId).emit("call:incoming", {
        caller_id: user.customer_id,
        caller_nickname: user.nickname,
        caller_avatar: user.avatar,
        sdp,
      })
    })

    // ── Call: answer ──
    socket.on("call:answer", ({ target_id, sdp }: { target_id: string; sdp: string }) => {
      log(`[call] Answer from ${user.customer_id} to ${target_id}`)
      const targetSocketId = customerSockets.get(target_id)
      if (!targetSocketId) {
        log(`[call] Answer target ${target_id} not online`)
        socket.emit("call:error", { message: "对方已离线" })
        return
      }
      io.to(targetSocketId).emit("call:accepted", { sdp })
    })

    // ── ICE candidate ──
    socket.on("ice:candidate", ({ target_id, candidate }: { target_id: string; candidate: string }) => {
      const targetSocketId = customerSockets.get(target_id)
      if (!targetSocketId) return
      io.to(targetSocketId).emit("ice:candidate", { candidate })
    })

    // ── Call: hangup ──
    socket.on("call:hangup", ({ target_id }: { target_id: string }) => {
      log(`[call] Hangup from ${user.customer_id}`)
      const targetSocketId = customerSockets.get(target_id)
      if (!targetSocketId) return
      io.to(targetSocketId).emit("call:ended", { by: user.customer_id })
    })

    // ── Call: reject ──
    socket.on("call:reject", ({ target_id }: { target_id: string }) => {
      log(`[call] Reject from ${user.customer_id}`)
      const targetSocketId = customerSockets.get(target_id)
      if (!targetSocketId) return
      io.to(targetSocketId).emit("call:rejected", {})
    })

    // ── Disconnect ──
    socket.on("disconnect", () => {
      log(`[call] User disconnected: ${user.customer_id} (${user.nickname || user.email})`)
      onlineUsers.delete(socket.id)
      customerSockets.delete(user.customer_id)

      socket.broadcast.emit("user:online", {
        customer_id: user.customer_id,
        online: false,
      })
    })
  })
}
