import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const ua = req.headers.get("user-agent") || "unknown"

  const timestamp = new Date().toISOString()
  const log = `[${timestamp}] CONNECT  IP=${ip}  UA=${ua.substring(0, 60)}`
  console.log(log)

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>网络连通性测试</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;padding:16px;max-width:500px;margin:0 auto}
h1{font-size:18px;color:#333;margin-bottom:8px}
.status{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:12px}
.pulse{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.dot{width:12px;height:12px;border-radius:50%;background:#bbb}
.dot.success{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4)}
.dot.fail{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.4)}
.dot.pending{animation:blink 1s infinite}
@keyframes blink{50%{opacity:0.3}}
.timer{font-size:12px;color:#999;margin-left:auto}
#log{max-height:60vh;overflow-y:auto;font-size:12px;font-family:monospace;background:#1e1e1e;color:#ddd;border-radius:8px;padding:12px;line-height:1.6}
.log-entry{display:flex;align-items:center;gap:6px;border-bottom:1px solid #333;padding:3px 0}
.log-entry:last-child{border-bottom:none}
.log-time{color:#888;white-space:nowrap}
.log-ok{color:#22c55e;font-weight:bold}
.log-fail{color:#ef4444;font-weight:bold}
.count{font-size:14px;color:#666;margin-bottom:8px}
.footer{text-align:center;font-size:11px;color:#aaa;margin-top:16px}
</style>
</head>
<body>
<h1>🌐 网络连通性测试</h1>
<div class="status">
  <div class="pulse">
    <div class="dot" id="dot"></div>
    <span id="statusText" style="font-size:14px">正在测试...</span>
    <span class="timer" id="timer"></span>
  </div>
  <div class="count">成功: <span id="successCount">0</span> &nbsp;|&nbsp; 失败: <span id="failCount">0</span></div>
  <div class="count">当前网络: <span id="networkInfo">检测中...</span></div>
</div>
<div id="log"></div>
<div class="footer">每 5 秒自动测试一次 · 打开后请保持前台运行</div>

<script>
const logEl = document.getElementById('log')
const dot = document.getElementById('dot')
const statusText = document.getElementById('statusText')
const timerEl = document.getElementById('timer')
const successCountEl = document.getElementById('successCount')
const failCountEl = document.getElementById('failCount')
const networkInfo = document.getElementById('networkInfo')

let success = 0, fail = 0
const MAX_LOG = 50

// Detect network info (mobile connection type)
if (navigator.connection) {
  const conn = navigator.connection
  networkInfo.textContent = conn.effectiveType || (conn.type || 'unknown')
  conn.addEventListener('change', () => {
    networkInfo.textContent = conn.effectiveType || (conn.type || 'changed')
  })
} else {
  networkInfo.textContent = 'WLAN / 未知'
}

function addLog(ok, ms, ipHint) {
  const now = new Date()
  const time = now.toLocaleTimeString()
  const div = document.createElement('div')
  div.className = 'log-entry'
  div.innerHTML = '<span class="log-time">' + time + '</span> <span class="' + (ok ? 'log-ok' : 'log-fail') + '">' + (ok ? '✓' : '✗') + '</span> <span>' + ms + 'ms' + (ipHint ? ' ' + ipHint : '') + '</span>'
  logEl.appendChild(div)
  while (logEl.children.length > MAX_LOG) logEl.removeChild(logEl.firstChild)
  logEl.scrollTop = logEl.scrollHeight
}

let currentTest = 0
function test() {
  currentTest++
  const seq = currentTest
  dot.className = 'dot pending'
  statusText.textContent = '测试中 #' + seq + ' ...'
  const start = Date.now()

  fetch('/api/nt/ping?_=' + start)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then(data => {
      if (seq !== currentTest) return // stale
      const elapsed = Date.now() - start
      dot.className = 'dot success'
      const geo = data.geo || {}
      const ipInfo = data.ip ? ' IP=' + data.ip : ''
      const geoInfo = (geo.isp || '') + (geo.city ? ' ' + geo.city : '')
      statusText.textContent = '✅ ' + ipInfo + ' ' + geoInfo + ' (' + elapsed + 'ms)'
      success++
      successCountEl.textContent = success
      addLog(true, elapsed, geoInfo || '')
    })
    .catch(err => {
      if (seq !== currentTest) return
      dot.className = 'dot fail'
      statusText.textContent = '❌ 失败: ' + err.message
      fail++
      failCountEl.textContent = fail
      addLog(false, Date.now() - start, err.message.substring(0, 30))
    })
}

// First test immediately
test()
// Then every 5 seconds
setInterval(test, 5000)

// Timer display
setInterval(() => {
  const now = new Date()
  timerEl.textContent = now.toLocaleTimeString()
}, 1000)
</script>
</body>
</html>`

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
