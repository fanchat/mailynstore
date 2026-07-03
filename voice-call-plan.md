# 实时语音通话 — Phase 1 信令 + 前端核心（局域网）

## 目标

在局域网环境下实现好友间一键拨通实时语音通话（WebRTC PeerConnection + Socket.IO 信令）。

## 范围

| 包含 | 不包含 |
|------|--------|
| Socket.IO 信令服务器（端口 3001） | TURN 服务器（Phase 4） |
| JWT 鉴权 + 在线用户管理 | 通话历史记录写入 DB（Phase 5） |
| CALL_OFFER/CALL_ANSWER/ICE_CANDIDATE/HANGUP 信令协议 | 拒绝来电时留言 |
| useVoiceCall React Hook（WebRTC 核心） | 通话时长统计 |
| Chat 页 📞 按钮 + 来电弹窗 + 通话中 UI | 群通话 |
| 局域网 STUN-only（无需 TURN） | 外网穿透 |

## 架构

```
浏览器 (Storefront:8000)
  ├── HTTP → Next.js proxy → Medusa:9000 (已有)
  └── WebSocket → Socket.IO 信令服务器 :3001 (新增)
                        │
                        └── PostgreSQL (medusa-backend)
                            └── customer 表 (鉴权、用户信息)
```

## 信令协议

所有消息 JSON 格式，sender_id / target_id 为 customer.id。

### 客户端 → 服务端

| 事件 | 载荷 | 说明 |
|------|------|------|
| `call:offer` | `{ target_id, sdp }` | 主叫发起通话 |
| `call:answer` | `{ target_id, sdp }` | 被叫接受通话 |
| `ice:candidate` | `{ target_id, candidate }` | 交换 ICE 候选 |
| `call:hangup` | `{ target_id }` | 任一方挂断 |
| `call:reject` | `{ target_id }` | 被叫拒绝 |

### 服务端 → 客户端

| 事件 | 载荷 | 说明 |
|------|------|------|
| `call:incoming` | `{ caller_id, caller_nickname, caller_avatar, sdp }` | 转发给被叫 |
| `call:accepted` | `{ sdp }` | 对方已接听 |
| `ice:candidate` | `{ candidate }` | 转发 ICE 候选 |
| `call:ended` | `{ by }` | 通话已结束 |
| `call:rejected` | `{}` | 对方拒绝 |
| `call:busy` | `{}` | 对方忙 |
| `user:online` | `{ online }` | 在线状态更新 |

## 文件清单

### 新增 — 信令服务器

| 文件 | 说明 |
|------|------|
| `~/mailyns/call-server/package.json` | ws + @types/ws + tsx |
| `~/mailyns/call-server/tsconfig.json` | TypeScript 配置 |
| `~/mailyns/call-server/src/index.ts` | 主入口：socket.io 服务器、在线用户映射 |
| `~/mailyns/call-server/src/auth.ts` | JWT 验证 + 用户信息查询 |
| `~/mailyns/call-server/src/call-handler.ts` | 呼叫路由逻辑 |

### 修改 — Storefront

| 文件 | 说明 |
|------|------|
| `storefront/src/lib/useVoiceCall.ts` | **新增** — WebRTC + Socket.IO hook |
| `storefront/src/app/[countryCode]/social/chat/[id]/page.tsx` | **修改** — 加通话按钮、来电弹窗、通话 UI |

### 其他

| 文件 | 说明 |
|------|------|
| `storefront/package.json` | 加 `socket.io-client` 依赖 |

## 实现细节

### 信令服务器

```typescript
// 用户映射: socket.id → { customer_id, nickname, avatar }
const onlineUsers = new Map<string, UserInfo>()
const userSockets = new Map<string, string>() // customer_id → socket.id

io.on("connection", async (socket) => {
  // 1. 验证 JWT token (从 auth 查询参数获取)
  const token = socket.handshake.auth.token
  const user = await verifyToken(token)
  if (!user) return socket.disconnect()

  // 2. 注册在线
  onlineUsers.set(socket.id, user)
  userSockets.set(user.customer_id, socket.id)
  socket.broadcast.emit("user:online", { ...user, online: true })

  // 3. 信令转发
  socket.on("call:offer", ({ target_id, sdp }) => { ... })
  socket.on("call:answer", ({ target_id, sdp }) => { ... })
  socket.on("ice:candidate", ({ target_id, candidate }) => { ... })
  socket.on("call:hangup", ({ target_id }) => { ... })
  socket.on("call:reject", ({ target_id }) => { ... })

  // 4. 断线清理
  socket.on("disconnect", () => { ... })
})
```

### useVoiceCall Hook

```typescript
function useVoiceCall(convId: string, myId: string, otherUser: UserInfo) {
  // 连接 socket.io（带 JWT token）
  // 管理 RTCPeerConnection
  // 提供: startCall, acceptCall, rejectCall, hangup, endCall
  // 状态: idle, calling, ringing, connected, ended
}
```

### WebRTC 配置（LAN only）

```typescript
const pcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
}
```

### Chat 页改动

- 对话 Header 右侧加 📞 按钮（对方在线时可用、点按发起呼叫）
- `useVoiceCall` 返回 `incomingCall` 时弹 Modal（显示对方 + 接听/拒绝）
- 通话中：全屏 overlay，显示通话计时 + 挂断按钮

### 端口

- 信令服务器运行在 `0.0.0.0:3001`
- 局域网内浏览器直连 `ws://10.255.255.254:3001` 或 `ws://localhost:3001`
- Storefront 配置信令服务器地址通过环境变量 `NEXT_PUBLIC_SIGNALING_URL`

## 不做的

- ❌ TURN 服务器（局域网不需要）
- ❌ 通话记录写入 DB（Phase 5）
- ❌ 通话中的静音/扬声器切换（Phase 6）
- ❌ 来电铃声（Phase 6）
- ❌ 群通话
- ❌ 视频通话
