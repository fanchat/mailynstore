# 方案规格说明书

> 三段式 — Stage 1 方案
> 功能：社交"我的"页面头像上传修复
> 日期：2026-06-26

## 1. 范围

| # | 文件 | 操作 |
|---|------|------|
| 1 | `storefront/.../social/profile/page.tsx` | 修改（~5行） |
| 2 | `storefront/.../api/social/[...path]/route.ts` | 修改（~15行） |
| 3 | `medusa/.../store/social/profile/avatar/route.ts` | 重写 |
| 4 | `medusa/.../api/middlewares.ts` | **新建**（禁用 bodyParser） |
| — | `medusa/` 新增依赖 `busboy` | pnpm add |

**不动**: middleware.ts, social/layout.tsx, social/profile/route.ts, uploads/[...path]/route.ts, 其他任何文件

## 2. 改动细节

### 2.1 page.tsx — 前端

**现状**: FileReader.readAsDataURL → base64 → JSON body → proxy

**改为**: FormData.append("file", file) → multipart → proxy

```ts
// 之前
const reader = new FileReader()
reader.readAsDataURL(file)
await new Promise((resolve) => { reader.onload = resolve })
const base64 = reader.result as string
const res = await fetch("/api/social/profile/avatar", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ avatar: base64 }),
})

// 之后
const formData = new FormData()
formData.append("file", file)
const res = await fetch("/api/social/profile/avatar", {
  method: "POST",
  body: formData,  // 浏览器自动设 Content-Type: multipart/form-data; boundary=...
})
```

### 2.2 [...path]/route.ts — Proxy

**现状**: 对所有 POST/PUT 统一 `req.text()` → JSON body → 固定 `Content-Type: application/json`

**改为**: 检测 `Content-Type` 是否包含 `multipart/form-data`，是则分流：

```
if (contentType 包含 multipart/form-data):
  formData = await req.formData()
  // 转发时去掉 Content-Type header，让 fetch 自动生成正确的 boundary
  headers 不设 Content-Type
  body = formData
else:
  保持原有逻辑 (req.text() → JSON)
```

**注意关键点**：
- 不能覆盖 `Content-Type`，否则 boundary 丢失 → Medusa 端解析失败
- `headers` 对象中 `Content-Type` 不传入即可（删除 line 44 的固定值）
- `Authorization` + `x-publishable-api-key` 保持不动

### 2.3 avatar/route.ts — Medusa 后端

**现状**: 
- 接收 JSON body: `{ avatar: "data:image/...;base64,..." }`
- `Buffer.from(raw, "base64")` 同步解码 → CPU 100%
- `fs.writeFileSync` 同步写盘
- 扩展名硬编码 `.jpg`
- 每次连接 `new Pool()`

**改为**:

**新增依赖**：`busboy`（纯 JS 零编译，解析 multipart 流）

**核心逻辑**：

```ts
// 流式接收文件
const busboy = Busboy({ headers: req.headers })

// 🔴 必须有: 将请求流 pipe 进 busboy
req.pipe(busboy)

let fileBuffer: Buffer[] = []
let fileExt = ".jpg"
let fileSize = 0

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
      file.resume() // 丢弃后续
      return
    }
    fileBuffer.push(chunk)
  })
})

busboy.on("error", (err) => {
  console.error("[avatar] busboy error:", err)
  res.status(400).json({ error: "upload_error" })
})

busboy.on("finish", async () => {
  if (fileBuffer.length === 0 || fileSize > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "file too large or empty" })
  }
  
  const buffer = Buffer.concat(fileBuffer)
  const filename = `${customerId}_${Date.now()}${fileExt}`
  const filePath = path.join(uploadDir, filename)
  
  await fs.promises.writeFile(filePath, buffer)
  // ... update DB, return
})
```

**其他改动**:
- **新建 `/src/api/middlewares.ts`**: 为 `store/social/profile/avatar` 路由设置 `bodyParser: false`，防止 Express body parser 提前消耗请求流导致 busboy 收不到数据
- 使用**模块级共享 Pool**（`new Pool({ connectionString: DATABASE_URL })` 放在 route 文件顶部）
- 去掉 `pool.end()` — 连接池生命周期由模块管理
- 根据请求的 MIME 类型决定扩展名，不再硬编码 `.jpg`

## 3. 文件大小限制

- 前端: 5MB（保留已有检查）
- 后端: 5MB（改为流式检查，达到阈值后 resume() 丢弃，不接完再判断）

## 4. 风险

- `busboy` 是纯 JS 包，单文件 GB 级别也能流式处理，内存友好
- Proxy 侧仅增加 Content-Type 判断分支，不影响现有 JSON 请求
- 其他社交功能（发帖、好友、搜索）不受影响，不走上传路径

## 5. 验收标准

- [x] 选择图片 → 上传 → 头像立即更新显示
- [x] CPU 不飙升（无 base64 解码）
- [x] 5MB 以上图片被拒绝
- [x] 非图片文件被拒绝
- [x] 未登录用户 401
- [x] PNG/WebP/GIF 文件扩展名正确保留