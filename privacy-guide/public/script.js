// ── Steps definition ──
const steps = [
  {
    title: "您的手机是什么品牌？",
    desc: "不同品牌的系统设置位置不一样，知道品牌才能给您精准的操作指引。",
    type: "single",
    options: [
      { emoji: "📱", label: "华为 / 荣耀" },
      { emoji: "📱", label: "小米 / Redmi" },
      { emoji: "📱", label: "OPPO / 一加" },
      { emoji: "📱", label: "vivo / iQOO" },
      { emoji: "🍎", label: "苹果 iPhone" },
      { emoji: "📱", label: "三星" },
      { emoji: "📱", label: "其他品牌" },
    ],
    key: "brand",
  },
  {
    title: "最近是不是经常看到奇怪的通知？",
    desc: "有些App会推送虚假中奖、色情、赌博、贷款类广告，点进去就有风险。",
    type: "multi",
    options: [
      { emoji: "🔞", label: "色情/交友类弹窗" },
      { emoji: "🎰", label: "赌博/博彩类广告" },
      { emoji: "💰", label: "贷款/网贷推销" },
      { emoji: "🎁", label: "虚假中奖/红包" },
      { emoji: "✅", label: "都没有 — 挺干净的" },
    ],
    key: "notifications",
  },
  {
    title: "有没有遇到过自动发短信的情况？",
    desc: "有些恶意App会在您不知情时用您的手机发扣费短信、订阅垃圾服务。",
    type: "single",
    options: [
      { emoji: "⚠️", label: "有，手机莫名扣过费" },
      { emoji: "🤔", label: "不确定，没留意过" },
      { emoji: "✅", label: "没有，一切正常" },
    ],
    key: "sms",
  },
  {
    title: "以下App，您觉得哪些在偷偷越界？",
    desc: "有些App申请的权限和它的功能完全无关——比如手电筒要读通讯录。",
    type: "multi",
    options: [
      { emoji: "💬", label: "微信/QQ — 读通讯录、读取短信" },
      { emoji: "📷", label: "美颜/拍照App — 要位置权限" },
      { emoji: "🔦", label: "手电筒/工具类 — 要通讯录" },
      { emoji: "🎮", label: "游戏App — 要短信权限" },
      { emoji: "🛒", label: "购物App — 后台弹窗" },
      { emoji: "✅", label: "没发现异常 — 都正常" },
    ],
    key: "abusive_apps",
  },
  {
    title: "您最在意哪个问题？",
    desc: "选一个最困扰您的，我们会重点给出解决建议。",
    type: "single",
    options: [
      { emoji: "🔒", label: "隐私泄露 — App在偷看我的数据" },
      { emoji: "🔔", label: "骚扰通知 — 天天弹广告" },
      { emoji: "💸", label: "莫名扣费 — 被偷偷订阅了服务" },
      { emoji: "📶", label: "流量偷跑 — 月底发现超了很多" },
      { emoji: "📦", label: "存储爆满 — 手机空间不够" },
    ],
    key: "priority",
  },
]

// ── State ──
let currentStep = 0
const answers = {}

// ── Page navigation ──
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"))
  document.getElementById("page-" + id).classList.add("active")
}

// ── Start Wizard ──
function startWizard() {
  currentStep = 0
  showPage("wizard")
  renderStep()
}

// ── Render current step ──
function renderStep() {
  const step = steps[currentStep]
  const body = document.getElementById("wizardBody")
  document.getElementById("stepCounter").textContent = `${currentStep + 1} / ${steps.length}`

  // Dots
  const dotsHtml = steps
    .map(
      (_, i) =>
        `<span class="step-dot ${i < currentStep ? "done" : ""} ${i === currentStep ? "active" : ""}"></span>`
    )
    .join("")
  document.getElementById("stepDots").innerHTML = dotsHtml

  // Options
  const optsHtml = step.options
    .map(
      (o, i) =>
        `<div class="option-item" data-index="${i}" onclick="selectOption(${i})">
          <span class="emoji">${o.emoji}</span>
          <span>${o.label}</span>
        </div>`
    )
    .join("")

  body.innerHTML = `
    <h3>${step.title}</h3>
    <p class="step-desc">${step.desc}</p>
    <div class="option-grid">${optsHtml}</div>
  `

  // Restore previous selection
  const prev = answers[currentStep]
  if (prev !== undefined) {
    const sel = Array.isArray(prev) ? prev : [prev]
    sel.forEach((idx) => {
      const el = body.querySelector(`.option-item[data-index="${idx}"]`)
      if (el) el.classList.add("selected")
    })
  }

  // Buttons
  document.getElementById("btnPrev").style.visibility = currentStep === 0 ? "hidden" : "visible"
  document.getElementById("btnNext").textContent =
    currentStep === steps.length - 1 ? "生成报告" : "下一步 →"

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" })
}

// ── Select option ──
function selectOption(index) {
  const step = steps[currentStep]
  const items = document.querySelectorAll("#wizardBody .option-item")

  if (step.type === "single") {
    items.forEach((el) => el.classList.remove("selected"))
    items[index].classList.add("selected")
    answers[currentStep] = index
  } else {
    items[index].classList.toggle("selected")
    const selected = []
    items.forEach((el, i) => {
      if (el.classList.contains("selected")) selected.push(i)
    })
    answers[currentStep] = selected.length > 0 ? selected : undefined
  }
}

// ── Next / Prev ──
function nextStep() {
  if (answers[currentStep] === undefined) {
    alert("请先选择一个选项")
    return
  }
  // Validate multi-select has at least one
  const step = steps[currentStep]
  if (step.type === "multi") {
    const sel = answers[currentStep]
    if (!sel || (Array.isArray(sel) && sel.length === 0)) {
      alert("请至少选择一个")
      return
    }
  }

  if (currentStep === steps.length - 1) {
    generateReport()
  } else {
    currentStep++
    renderStep()
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--
    renderStep()
  }
}

// ── Brand guide knowledge base ──
const brandGuides = {
  "华为 / 荣耀": {
    permissions: "打开「设置」→「应用」→「权限管理」→ 逐个App检查不必要的权限",
    notifications: "打开「设置」→「通知」→「批量管理」→ 关掉非必要App的通知",
    sms: "打开「手机管家」→「骚扰拦截」→ 开启智能拦截",
  },
  "小米 / Redmi": {
    permissions: "打开「设置」→「应用设置」→「应用管理」→ 选App →「权限管理」",
    notifications: "打开「设置」→「通知与控制中心」→「通知管理」→ 关掉骚扰App的通知",
    sms: "打开「短信」→ 右上角设置 →「骚扰拦截」→ 开启",
  },
  "OPPO / 一加": {
    permissions: "打开「设置」→「应用」→「应用管理」→ 选App →「权限」",
    notifications: "打开「设置」→「通知与状态栏」→「通知管理」→ 逐App关闭",
    sms: "打开「手机管家」→「安全工具」→「骚扰拦截」",
  },
  "vivo / iQOO": {
    permissions: "打开「设置」→「应用与权限」→「权限管理」→ 按权限类型查看",
    notifications: "打开「设置」→「通知与状态栏」→「应用通知管理」→ 关闭骚扰通知",
    sms: "打开「i管家」→「骚扰拦截」→ 开启智能拦截",
  },
  "苹果 iPhone": {
    permissions: "打开「设置」→「隐私与安全性」→ 逐项检查哪些App有权限",
    notifications: "打开「设置」→「通知」→ 逐个App关闭不必要的通知",
    sms: "打开「设置」→「信息」→ 开启「过滤未知发件人」",
  },
  "三星": {
    permissions: "打开「设置」→「应用」→「权限管理器」→ 按类型查看",
    notifications: "打开「设置」→「通知」→「高级设置」→ 管理各App通知",
    sms: "打开「手机管家」→「骚扰拦截」→ 开启智能拦截",
  },
  "其他品牌": {
    permissions: "打开「设置」→ 搜索「权限管理」→ 逐个App检查",
    notifications: "打开「设置」→ 搜索「通知管理」→ 关闭骚扰通知",
    sms: "打开手机自带的「安全中心」或「手机管家」→ 开启骚扰拦截",
  },
}

// ── Generate Report ──
function generateReport() {
  const brand = steps[0].options[answers[0]].label
  const notifs = answers[1] || []
  const sms = answers[2]
  const abusive = answers[3] || []
  const priority = answers[4] !== undefined ? steps[4].options[answers[4]].label : ""

  const hasProblems = notifs.length > 0 || sms === 0 || abusive.length > 0
  const guide = brandGuides[brand] || brandGuides["其他品牌"]

  // Build report sections
  let sections = ""

  // Safe/Problem summary
  if (!hasProblems) {
    sections += `
      <div class="report-section">
        <h4>🟢 您的手机目前状态良好</h4>
        <p style="font-size:14px;color:#6b7280;">没有发现明显的隐私风险，继续保持！建议每半年检查一次权限设置。</p>
      </div>`
  } else {
    sections += `<div class="report-section"><h4>🔍 需要关注的${notifs.length + (sms === 0 ? 1 : 0) + abusive.length}个问题</h4>`

    if (notifs.length > 0 && !notifs.includes(5)) {
      sections += notifs
        .map(
          (i) =>
            `<div class="report-item"><span class="report-warn">⚠️</span> 收到「${steps[1].options[i].label}」类骚扰通知，建议关闭相关App的通知权限</div>`
        )
        .join("")
    }

    if (sms === 0) {
      sections += `<div class="report-item"><span class="report-danger">🚨</span> 曾莫名扣费，请立即检查短信订阅，关闭不必要的增值服务</div>`
    }

    if (abusive.length > 0 && !abusive.includes(5)) {
      sections += abusive
        .map(
          (i) =>
            `<div class="report-item"><span class="report-warn">⚠️</span> ${steps[3].options[i].label} — 建议限制其不合理权限</div>`
        )
        .join("")
    }

    sections += "</div>"
  }

  // Recommendations
  sections += `
    <div class="report-section">
      <h4>📌 对${brand}用户的建议</h4>
      <div class="report-item">🔒 <b>检查权限：</b>${guide.permissions}</div>
      <div class="report-item">🔔 <b>管理通知：</b>${guide.notifications}</div>
      <div class="report-item">🛡️ <b>骚扰拦截：</b>${guide.sms}</div>
    </div>`

  // Priority tip
  if (priority) {
    const tips = {
      "隐私泄露": "建议关掉不常用App的所有非必要权限，每月检查一次权限列表。",
      "骚扰通知": "建议只保留微信、短信、电话等核心App的通知权限，其余全关。",
      "莫名扣费": "立即联系运营商查询增值业务订阅，关闭未知订阅，修改支付密码。",
      "流量偷跑": "在设置中查看各App的流量使用情况，限制后台数据。",
      "存储爆满": "微信是存储大户，在微信「设置→通用→存储空间」中清理缓存。",
    }
    const tip = tips[priority.split("—")[0].trim()]
    if (tip) {
      sections += `<div class="report-tip">💡 <b>关于「${priority}」：</b>${tip}</div>`
    }
  }

  // Brand-specific step-by-step
  sections += `
    <div class="brand-guide">
      <h4>📖 ${brand} — 三步清理指南</h4>
      <div class="guide-step"><span class="num">1</span> <span>${guide.permissions}</span></div>
      <div class="guide-step"><span class="num">2</span> <span>${guide.notifications}</span></div>
      <div class="guide-step"><span class="num">3</span> <span>${guide.sms}</span></div>
    </div>`

  // Footer
  sections += `
    <div class="report-section" style="text-align:center;background:#f0fdf4;">
      <h4>✅ 体检完成</h4>
      <p style="font-size:14px;color:#6b7280;">把报告发送到邮箱，随时查看，永久保存。</p>
    </div>`

  document.getElementById("reportBody").innerHTML = sections
  window._reportEmailHtml = buildEmailHtml(sections, brand)
  showPage("report")
}

// ── Build email HTML ──
function buildEmailHtml(sections, brand) {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,sans-serif;padding:20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;">🛡️</div>
        <h1 style="font-size:22px;color:#1a1a2e;">您的手机隐私体检报告</h1>
        <p style="color:#9ca3af;font-size:13px;">精拾 · 为您的数字生活把关</p>
      </div>
      ${sections.replace(/class="[^"]*"/g, "").replace(/style="[^"]*"/g, (m) => m)}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="text-align:center;font-size:12px;color:#9ca3af;">
        精拾 — 免费手机隐私体检工具<br>
        如果对您有帮助，可以请我们喝杯咖啡 ❤️
      </p>
    </div>`
}

// ── Send report via email ──
async function sendReport() {
  const email = document.getElementById("emailInput").value.trim()
  if (!email || !email.includes("@")) {
    document.getElementById("sendStatus").textContent = "请输入有效的邮箱地址"
    document.getElementById("sendStatus").className = "send-status error"
    return
  }

  const btn = document.getElementById("sendBtn")
  btn.disabled = true
  btn.textContent = "发送中..."
  document.getElementById("sendStatus").textContent = ""
  document.getElementById("sendStatus").className = "send-status"

  try {
    const res = await fetch("/api/send-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, report: window._reportEmailHtml }),
    })
    const data = await res.json()
    if (res.ok) {
      document.getElementById("sendStatus").textContent = "✅ 报告已发送到您的邮箱！"
      document.getElementById("sendStatus").className = "send-status success"
    } else {
      document.getElementById("sendStatus").textContent = "❌ " + (data.error || "发送失败")
      document.getElementById("sendStatus").className = "send-status error"
    }
  } catch (e) {
    document.getElementById("sendStatus").textContent = "❌ 网络错误，请稍后重试"
    document.getElementById("sendStatus").className = "send-status error"
  } finally {
    btn.disabled = false
    btn.textContent = "发送报告"
  }
}

// ── Reset ──
function resetAll() {
  currentStep = 0
  for (const k in answers) delete answers[k]
  showPage("home")
}
