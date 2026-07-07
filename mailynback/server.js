const express = require("express")
const { Pool } = require("pg")
const path = require("path")
const crypto = require("crypto")
require("dotenv").config()

const PORT = parseInt(process.env.PORT || "7777", 10)
const DB_URL = process.env.DATABASE_URL || "postgres://ding@localhost:5432/medusa-backend"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mailyn.cn"

const app = express()
const pool = new Pool({ connectionString: DB_URL })
const sessions = new Map()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Serve admin page ──
// Mount the admin app at both / and /chatadmin (for different deployment modes)
const adminApp = express()
adminApp.use(express.static(path.join(__dirname, "public")))
adminApp.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")))
adminApp.get("/index.html", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")))

app.use("/", adminApp)
app.use("/chatadmin", adminApp)

// ── Auth middleware ──
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "未登录" })
  }
  sessions.get(token).lastAccess = Date.now()
  req.admin = sessions.get(token)
  next()
}

// ── Login ──
app.post("/chatadmin/api/login", (req, res) => {
  const { email, password } = req.body
  if (!email || email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: "邮箱或密码错误" })
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "邮箱或密码错误" })
  }
  const token = crypto.randomBytes(24).toString("hex")
  sessions.set(token, { token, loginAt: Date.now(), lastAccess: Date.now() })
  res.json({ token })
})

app.get("/chatadmin/api/check", requireAuth, (req, res) => {
  res.json({ ok: true })
})

// ── Dashboard stats ──
app.get("/chatadmin/api/stats", requireAuth, async (req, res) => {
  try {
    const [users, convs, msgs, posts] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM customer WHERE deleted_at IS NULL"),
      pool.query("SELECT COUNT(*)::int AS count FROM conversations"),
      pool.query("SELECT COUNT(*)::int AS count FROM messages"),
      pool.query("SELECT COUNT(*)::int AS count FROM posts"),
    ])
    res.json({
      users: users.rows[0].count,
      conversations: convs.rows[0].count,
      messages: msgs.rows[0].count,
      posts: posts.rows[0].count,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Users list ──
app.get("/chatadmin/api/users", requireAuth, async (req, res) => {
  try {
    const q = req.query.q || ""
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)))
    const offset = (page - 1) * limit

    let where = "WHERE c.deleted_at IS NULL"
    const params = []
    if (q) {
      where = `WHERE c.deleted_at IS NULL AND (c.email ILIKE $1 OR c.nickname ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1 OR c.id::text LIKE $1)`
      params.push(`%${q}%`)
    }

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM customer c ${where}`, params),
      pool.query(`
        SELECT c.id, c.email, c.nickname, c.first_name, c.last_name, c.avatar, c.region,
               c.gender, c.birthday, c.last_seen, c.created_at, c.has_account,
               (SELECT COUNT(*)::int FROM messages m WHERE m.sender_id = c.id) AS msg_count,
               (SELECT COUNT(*)::int FROM posts p WHERE p.customer_id = c.id) AS post_count
        FROM customer c ${where}
        ORDER BY c.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
    ])

    res.json({ total: countRes.rows[0].total, page, limit, data: dataRes.rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Single user detail ──
app.get("/chatadmin/api/users/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const userRes = await pool.query(
      `SELECT c.*,
        (SELECT json_agg(json_build_object('id', p.id, 'type', p.type, 'content', LEFT(p.content, 200), 'created_at', p.created_at) ORDER BY p.created_at DESC)
         FROM posts p WHERE p.customer_id = c.id LIMIT 10) AS recent_posts
       FROM customer c WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [id]
    )
    if (!userRes.rows.length) return res.status(404).json({ error: "用户不存在" })

    const convsRes = await pool.query(`
      SELECT conv.*, cm.last_read_at,
        (SELECT json_agg(json_build_object('customer_id', cm2.customer_id, 'nickname', c2.nickname, 'email', c2.email, 'avatar', c2.avatar))
         FROM conversation_members cm2 JOIN customer c2 ON c2.id = cm2.customer_id
         WHERE cm2.conversation_id = conv.id) AS members,
        (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = conv.id) AS msg_count,
        (SELECT content FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_msg
      FROM conversations conv
      JOIN conversation_members cm ON cm.conversation_id = conv.id AND cm.customer_id = $1
      ORDER BY conv.updated_at DESC NULLS LAST
    `, [id])

    res.json({ user: userRes.rows[0], conversations: convsRes.rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Conversations list ──
app.get("/chatadmin/api/conversations", requireAuth, async (req, res) => {
  try {
    const q = req.query.q || ""
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)))
    const offset = (page - 1) * limit

    let where = ""
    const params = []
    if (q) { where = "WHERE conv.name ILIKE $1 OR conv.id::text = $1"; params.push(`%${q}%`) }

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM conversations conv ${where}`, params),
      pool.query(`
        SELECT conv.*,
          (SELECT json_agg(json_build_object('customer_id', cm.customer_id, 'nickname', c.nickname, 'email', c.email, 'avatar', c.avatar))
           FROM conversation_members cm JOIN customer c ON c.id = cm.customer_id
           WHERE cm.conversation_id = conv.id) AS members,
          (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = conv.id) AS msg_count,
          (SELECT json_build_object('content', m.content, 'sender_id', m.sender_id, 'created_at', m.created_at)
           FROM messages m WHERE m.conversation_id = conv.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
        FROM conversations conv ${where}
        ORDER BY conv.updated_at DESC NULLS LAST, conv.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
    ])
    res.json({ total: countRes.rows[0].total, page, limit, data: dataRes.rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Conversation messages ──
app.get("/chatadmin/api/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "50", 10)))
    const offset = (page - 1) * limit

    const [countRes, dataRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM messages WHERE conversation_id = $1", [id]),
      pool.query(`
        SELECT m.*, c.nickname AS sender_nickname, c.email AS sender_email, c.avatar AS sender_avatar
        FROM messages m LEFT JOIN customer c ON c.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC LIMIT $2 OFFSET $3
      `, [id, limit, offset]),
    ])
    res.json({ total: countRes.rows[0].total, page, limit, conversation_id: parseInt(id), data: dataRes.rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Delete ──
app.delete("/chatadmin/api/messages/:id", requireAuth, async (req, res) => {
  try { await pool.query("DELETE FROM messages WHERE id = $1", [req.params.id]); res.json({ ok: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete("/chatadmin/api/conversations/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM messages WHERE conversation_id = $1", [req.params.id])
    await pool.query("DELETE FROM conversation_members WHERE conversation_id = $1", [req.params.id])
    await pool.query("DELETE FROM conversations WHERE id = $1", [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Posts list ──
app.get("/chatadmin/api/posts", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)))
    const offset = (page - 1) * limit
    const [countRes, dataRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM posts"),
      pool.query(`
        SELECT p.*, c.nickname, c.email, c.avatar
        FROM posts p LEFT JOIN customer c ON c.id = p.customer_id
        ORDER BY p.created_at DESC LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ])
    res.json({ total: countRes.rows[0].total, page, limit, data: dataRes.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Messages search ──
app.get("/chatadmin/api/messages/search", requireAuth, async (req, res) => {
  try {
    const q = req.query.q || ""
    if (!q) return res.json({ data: [] })
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)))
    const offset = (page - 1) * limit
    const [countRes, dataRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM messages WHERE content ILIKE $1", [`%${q}%`]),
      pool.query(`
        SELECT m.*, c.nickname AS sender_nickname, c.email AS sender_email
        FROM messages m LEFT JOIN customer c ON c.id = m.sender_id
        WHERE m.content ILIKE $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3
      `, [`%${q}%`, limit, offset]),
    ])
    res.json({ total: countRes.rows[0].total, page, limit, data: dataRes.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── multer for image upload ──
const multer = require("multer")
// Ensure upload directories exist
const uploadDirs = ["carousel", "banners"].map(d =>
  path.join(__dirname, "public", "uploads", d)
)
uploadDirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

const carouselUpload = multer({
  dest: path.join(__dirname, "public", "uploads", "carousel"),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(path.extname(file.originalname).toLowerCase())
    cb(null, ok)
  },
})

// ── Carousel CRUD ──

// List all carousel items (admin)
app.get("/chatadmin/api/carousel", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM carousel_items ORDER BY sort_order ASC, id ASC")
    res.json({ data: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Public: get active carousel items (no auth)
app.get("/chatadmin/api/carousel/public", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, title, subtitle, image_url, link_url, sort_order FROM carousel_items WHERE is_active = true ORDER BY sort_order ASC, id ASC"
    )
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.json({ data: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create carousel item
app.post("/chatadmin/api/carousel", requireAuth, carouselUpload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order } = req.body
    const maxRes = await pool.query("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM carousel_items")
    const order = sort_order ?? maxRes.rows[0].next
    let imageUrl = ""
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase()
      const filename = `carousel_${Date.now()}${ext}`
      const dest = path.join(__dirname, "public", "uploads", "carousel", filename)
      require("fs").renameSync(req.file.path, dest)
      imageUrl = `/chatadmin/uploads/carousel/${filename}`
    }
    const r = await pool.query(
      `INSERT INTO carousel_items (title, subtitle, image_url, link_url, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title || "", subtitle || "", imageUrl, link_url || "", order]
    )
    res.json({ data: r.rows[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update carousel item
app.put("/chatadmin/api/carousel/:id", requireAuth, carouselUpload.single("image"), async (req, res) => {
  try {
    const { id } = req.params
    const { title, subtitle, link_url, sort_order, is_active } = req.body
    const fields = []
    const params = []
    let idx = 1

    if (title !== undefined) { fields.push(`title = $${idx++}`); params.push(title) }
    if (subtitle !== undefined) { fields.push(`subtitle = $${idx++}`); params.push(subtitle) }
    if (link_url !== undefined) { fields.push(`link_url = $${idx++}`); params.push(link_url) }
    if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); params.push(parseInt(sort_order)) }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active === "true" || is_active === true) }
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase()
      const filename = `carousel_${Date.now()}${ext}`
      const dest = path.join(__dirname, "public", "uploads", "carousel", filename)
      require("fs").renameSync(req.file.path, dest)
      fields.push(`image_url = $${idx++}`)
      params.push(`/chatadmin/uploads/carousel/${filename}`)
    }
    if (fields.length === 0) return res.status(400).json({ error: "no fields to update" })
    fields.push(`updated_at = NOW()`)
    params.push(id)
    const r = await pool.query(
      `UPDATE carousel_items SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    )
    if (!r.rows.length) return res.status(404).json({ error: "not found" })
    res.json({ data: r.rows[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete carousel item
app.delete("/chatadmin/api/carousel/:id", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM carousel_items WHERE id = $1 RETURNING *", [req.params.id])
    if (!r.rows.length) return res.status(404).json({ error: "not found" })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Page Banners (top/bottom homepage bands) ──

// List all banners (admin)
app.get("/chatadmin/api/banners", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM page_banners ORDER BY id ASC")
    res.json({ data: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Public: get all banners (no auth)
app.get("/chatadmin/api/banners/public", async (req, res) => {
  try {
    const r = await pool.query("SELECT position, image_url FROM page_banners")
    res.setHeader("Access-Control-Allow-Origin", "*")
    const map = {}
    for (const row of r.rows) map[row.position] = row.image_url
    res.json({ data: map })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update banner image
app.put("/chatadmin/api/banners/:position", requireAuth, carouselUpload.single("image"), async (req, res) => {
  try {
    const { position } = req.params
    if (!["top", "bottom"].includes(position)) {
      return res.status(400).json({ error: "position must be 'top' or 'bottom'" })
    }
    let imageUrl = ""
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase()
      const filename = `banner_${position}_${Date.now()}${ext}`
      const dest = path.join(__dirname, "public", "uploads", "banners", filename)
      require("fs").renameSync(req.file.path, dest)
      imageUrl = `/chatadmin/uploads/banners/${filename}`
    }
    const r = await pool.query(
      `INSERT INTO page_banners (position, image_url, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (position) DO UPDATE SET image_url = $2, updated_at = NOW()
       RETURNING *`,
      [position, imageUrl]
    )
    res.json({ data: r.rows[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Broadcast notifications (资讯下发) ──

// List admins for sender name selection
app.get("/chatadmin/api/admins", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, email, COALESCE(NULLIF(first_name, ''), '') AS first_name,
              COALESCE(NULLIF(last_name, ''), '') AS last_name
       FROM "user" WHERE deleted_at IS NULL ORDER BY email`
    )
    res.json({ data: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// List customer groups for target selection
app.get("/chatadmin/api/broadcast/groups", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT cg.id, cg.name,
              (SELECT COUNT(*)::int FROM customer_group_customer cgc
               JOIN customer c ON c.id = cgc.customer_id AND c.deleted_at IS NULL
               WHERE cgc.customer_group_id = cg.id AND cgc.deleted_at IS NULL) AS member_count
       FROM customer_group cg WHERE cg.deleted_at IS NULL ORDER BY cg.name`
    )
    res.json({ data: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// List sent broadcast notifications
app.get("/chatadmin/api/broadcast/notifications", requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)))
    const offset = (page - 1) * limit
    const [countRes, dataRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM broadcast_notifications"),
      pool.query(
        "SELECT * FROM broadcast_notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      ),
    ])
    res.json({ total: countRes.rows[0].total, page, limit, data: dataRes.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Send a broadcast notification
app.post("/chatadmin/api/broadcast/notifications", requireAuth, async (req, res) => {
  try {
    const { title, content, target_type, target_ids, target_names, sender_name } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "请填写资讯内容" })
    }

    let targetCount = 0
    let targetNameStr = target_names || ""

    if (target_type === "all" || !target_type) {
      // Count all registered customers
      const cnt = await pool.query(
        "SELECT COUNT(*)::int AS c FROM customer WHERE deleted_at IS NULL AND has_account = true"
      )
      targetCount = cnt.rows[0].c
      targetNameStr = "全部注册会员"
    } else if (target_type === "group") {
      // Count members in selected groups
      const ids = Array.isArray(target_ids) ? target_ids : []
      if (ids.length === 0) {
        return res.status(400).json({ error: "请选择至少一个群组" })
      }
      const cnt = await pool.query(
        `SELECT COUNT(DISTINCT c.id)::int AS c
         FROM customer_group_customer cgc
         JOIN customer c ON c.id = cgc.customer_id AND c.deleted_at IS NULL AND c.has_account = true
         WHERE cgc.customer_group_id = ANY($1) AND cgc.deleted_at IS NULL`,
        [ids]
      )
      targetCount = cnt.rows[0].c
    }

    const r = await pool.query(
      `INSERT INTO broadcast_notifications (title, content, target_type, target_names, sender_name, status, created_by, target_count)
       VALUES ($1, $2, $3, $4, $5, 'sent', $6, $7) RETURNING *`,
      [title || "", content.trim(), target_type || "all", targetNameStr, sender_name || "系统通知", req.admin?.email || "", targetCount]
    )

    res.json({ data: r.rows[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete a broadcast notification
app.delete("/chatadmin/api/broadcast/notifications/:id", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM broadcast_notifications WHERE id = $1 RETURNING *", [req.params.id])
    if (!r.rows.length) return res.status(404).json({ error: "not found" })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Speed test: download a random file to measure tunnel speed ──
const fs = require("fs")
app.get("/chatadmin/api/speedtest/download", requireAuth, async (req, res) => {
  const sizeMB = Math.min(500, Math.max(1, parseInt(req.query.size) || 10))
  const sizeBytes = sizeMB * 1024 * 1024
  const tmpDir = path.join(__dirname, "tmp", "speedtest")
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  const filePath = path.join(tmpDir, `speedtest_${Date.now()}.bin`)

  try {
    // Stream-write random data to file (256KB chunks to avoid huge memory)
    const ws = fs.createWriteStream(filePath)
    let written = 0
    const CHUNK = 256 * 1024

    function writeNext() {
      let canContinue = true
      while (canContinue && written < sizeBytes) {
        const remaining = sizeBytes - written
        const chunkSize = Math.min(CHUNK, remaining)
        canContinue = ws.write(crypto.randomBytes(chunkSize))
        written += chunkSize
      }
      if (written >= sizeBytes) {
        ws.end()
      } else {
        ws.once("drain", writeNext)
      }
    }
    writeNext()

    await new Promise((resolve, reject) => {
      ws.on("finish", resolve)
      ws.on("error", reject)
    })

    // Send file, delete after download completes
    res.download(filePath, `speedtest_${sizeMB}MB.bin`, (err) => {
      fs.unlink(filePath, () => {})
      if (err && !res.headersSent) {
        res.status(500).json({ error: "download failed" })
      }
    })
  } catch (e) {
    // Clean up on error
    try { fs.unlinkSync(filePath) } catch {}
    res.status(500).json({ error: e.message })
  }
})

// ── Start ──
app.listen(PORT, () => {
  console.log(`[mailynback] Admin panel running on http://localhost:${PORT}`)
  console.log(`[mailynback] Via Caddy: https://mailyn.cn:8443/chatadmin`)
})
