const express = require("express")
const path = require("path")
const nodemailer = require("nodemailer")
require("dotenv").config()

const PORT = parseInt(process.env.PORT || "7780", 10)

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// ── SMTP transporter ──
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "25", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
})

// ── Send report via email ──
app.post("/api/send-report", async (req, res) => {
  try {
    const { email, report } = req.body
    if (!email || !report) {
      return res.status(400).json({ error: "缺少邮箱或报告内容" })
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || `"精拾" <noreply@mailyn.cn>`,
      to: email,
      subject: "📋 您的手机隐私体检报告 — 精拾",
      html: report,
    }

    await transporter.sendMail(mailOptions)
    res.json({ ok: true, message: "报告已发送到您的邮箱" })
  } catch (e) {
    console.error("Send mail error:", e.message)
    res.status(500).json({ error: "发送失败，请稍后重试" })
  }
})

app.listen(PORT, () => {
  console.log(`[privacy-guide] Running on http://localhost:${PORT}`)
})
