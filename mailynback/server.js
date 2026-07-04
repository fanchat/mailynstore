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

// ── Start ──
app.listen(PORT, () => {
  console.log(`[mailynback] Admin panel running on http://localhost:${PORT}`)
  console.log(`[mailynback] Via Caddy: https://mailyn.cn:8443/chatadmin`)
})
