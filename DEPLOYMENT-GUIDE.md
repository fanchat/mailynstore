# 部署生产环境问题指南

> 记录 mailyn.cn 项目部署到远程机器的经验教训和已知问题。
> 目标机器：Mac Mini（德国，192.168.1.126，Ubuntu），域名 lubaca.cyou

---

## 架构一览

```
用户 → lubaca.cyou → Cloudflare CDN → Cloudflare Tunnel → Mini :80 → Caddy → 各服务
```

| 组件 | 端口 | 说明 |
|------|------|------|
| Caddy (反向代理) | 80 (HTTP) | 用 Caddyfile.lubaca 配置路由 |
| Storefront (Next.js) | 8000 | 商城前端 |
| Medusa 后端 | 9000 | 商城 API |
| Mailynback 管理后台 | 7777 | 中控后台 |
| Call-server (语音) | 3001 | WebRTC 信令 |
| Umami 统计 | 3000 | 访问统计 |
| PostgreSQL (Docker) | 5432 | Docker: `postgres:16-alpine` |
| Redis (Docker) | 6379 | Docker: `redis:7-alpine` |
| Cloudflared Tunnel | - | 连 Cloudflare 边缘 |

---

## 已知密码

| 位置 | 邮箱 | 密码 |
|------|------|------|
| **Mailynback 管理后台** | `admin@mailyn.cn` | **`mailynback`** |
| Mini 上 mailynback 实际密码 | 同上 | **`mailynback`**（`.env` 中配置，非默认值） |
| PostgreSQL Docker (Mini) | 用户: `medusa` | `medusa_pg_pass` |
| Medusa 后台 (开发) | `admin@dtc-demo.com` | `demo1234` |

---

## 关键运维命令

### SSH 连接 Mini
```bash
ssh ding@192.168.1.126
```

### 查看服务状态
```bash
pm2 status                          # 所有服务概览
pm2 logs mailynback --lines 20      # 看 mailynback 日志
pm2 show mailynback                 # 进程详情（cwd 等）
```

### 重启单个服务
```bash
pm2 restart mailynback              # 重启后台
pm2 restart storefront              # 重启商城
pm2 restart medusa-backend          # 重启 Medusa
```

### 重新注册 PM2 进程（修复工作目录问题）
```bash
pm2 delete mailynback
cd /srv/mailyns/mailynback && pm2 start server.js --name mailynback
pm2 save
```

### 进入 Docker PostgreSQL 容器
```bash
docker exec -it medusa-postgres psql -U medusa
```
或者执行单条 SQL：
```bash
docker exec medusa-postgres psql -U medusa -c "SQL 语句"
```

### 查看 Caddy 配置
```bash
cat /srv/mailyns/Caddyfile.lubaca
caddy reload --config /srv/mailyns/Caddyfile.lubaca
```

---

## 部署流程

```
本机 WSL (~/mailyns/) → git commit → git push
  → Mini 上 crontab deploy.sh 检测新提交
    → git pull → 构建 → pm2 restart all
```

自动部署脚本：`/srv/mailyns/deploy.sh`
- 有锁机制，防止并发运行
- 超时 120 秒
- mailynback 单独变更时直接重启，跳过重构建
- 日志：`/home/ding/deploy.log`

---

### 配置分层架构原则

> 核心思想：每一层只负责自己该管的事，不越界。

### 四层分离

| 层 | 管什么 | 放哪里 | 示例 |
|---|--------|--------|------|
| **代码** | 逻辑、流程、算法 | 源码（`.ts`/`.js`） | `const url = process.env.API_URL` |
| **业务功能** | 用户可调的参数 | 管理后台界面 | 开启/关闭某个功能、设置轮播速度 |
| **环境配置** | 网络、端口、域名、密码 | 配置文件（`.env`/`yaml`/`toml`） | `DATABASE_URL`、`PORT`、`API_KEY` |
| **安装交互** | 配置文件的填写操作 | 表单界面（如安装向导） | Hermes 的 `hermes config set` 式交互 |

### 戒律

1. **代码里不准写明文 IP、端口、密码、密钥**——全部用变量引用
2. **业务参数不走配置文件**——给用户一个后台界面去设置，不要让用户去改 `.env`
3. **环境配置不写死**——不同机器的 `.env`/`yaml` 各自独立，不同步到 git
4. **表单优于手动编辑**——操作配置文件数值时，最好做成表单界面，减少手误

### 排障方法论

```
现象（浏览器 F12 看 Console + Network）
  → 定位哪一层出问题（代码 / 业务 / 环境 / 安装）
    → 检查对应层的值是否正确
      → 修复 → 验证
```

每次部署和排障的经验都积累到本指南，后续同类问题查这里就能快速定位。

---

# 已知问题 & 解决方案

### 1. ❗ PM2 工作目录导致 `.env` 加载失败

**现象：** Mailynback 日志显示 `injected env (0) from .env`，所有环境变量未加载，导致：
- 数据库连接失败（用了代码里的默认值）
- 管理后台 stats 报 500（`database "medusa-backend" does not exist`）
- 管理员密码变成默认值（`admin123`）

**根因：** PM2 默认 `exec cwd` 是 `/home/ding`，而 `.env` 在 `/srv/mailyns/mailynback/`，
`require("dotenv").config()` 从 `cwd` 找 `.env`，找不到。

**修复：** 删除 PM2 进程，从正确目录重新注册：
```bash
pm2 delete mailynback
cd /srv/mailyns/mailynback && pm2 start server.js --name mailynback
pm2 save
```

**预防：** 首次部署时务必从项目目录执行 `pm2 start`。

**缓解：** AI 生成的大图（通常 ~1.8MB）上传前先裁剪压缩，可降到 ~100K，
避免 CF 隧道超时（中国→德国）。

### 2. ❗ PostgreSQL Docker 缺少角色

**现象：** `chatadmin/api/stats` 返回 500 `role "ding" does not exist`

**根因：** Mini 的 PG 是 Docker 容器，初始化时指定了
`POSTGRES_USER=medusa`（非默认 `postgres`），且没有创建 `ding` 角色。
Mailynback 的 `.env` 用 `DATABASE_URL=postgres://medusa:***@localhost:5432/medusa`。

**修复：**
```bash
docker exec medusa-postgres psql -U medusa -c "CREATE ROLE ding WITH LOGIN;"
```

### 3. ❗ Mailynback 数据库指向不同

**现象：** 连接成功但报 `database "medusa-backend" does not exist`

**根因：** Mini 的 `.env` 里 `DATABASE_URL` 指向 `medusa` 库（不是 `medusa-backend`），
最老的代码版本默认回退到 `medusa-backend`。dotenv 未加载时就用错了库。

**修复：** 与问题 1 相同——确保 dotenv 正确加载 `.env`。

### 4. ⚠️ URL 规范化代码（补救措施）

**背景：** `server.js` 中有一段代码将非 `postgres` 用户自动替换为 `postgres`：
```javascript
const DB_URL = (() => {
  const u = new URL(DB_URL_init)
  if (u.protocol === 'postgres:' && u.username && u.username !== 'postgres') {
    u.username = 'postgres'
  }
  return u.toString()
})()
```

**注意：** 这段代码在 Mini 尚部署旧版代码时未生效。Mini 上的 `server.js` 是旧版本（无此逻辑），
依赖 `.env` 正确加载。该补救代码只适用于本地或其他标准 PG 环境。

### 5. ⚠️ 管理后台登录密码

Mailynback 的管理员密码优先级：
1. `.env` 中的 `ADMIN_PASSWORD` 变量
2. 代码默认值 `admin123`

**本机 WSL：** `.env` 中有 `ADMIN_PASSWORD=mailynback` → 密码 = `mailynback`
**Mini 德国：** `.env` 中有 `ADMIN_PASSWORD=mailynback` → 密码 = `mailynback`
（dotenv 未加载时才会退回 `admin123`）

### 6. ❗ Caddy 实际配置文件不是 Caddyfile.lubaca

**现象：** `/api/banners`、`/api/client-error` 等路由返回 404，
响应头带 `connect.sid` cookie（说明请求走到了 Medusa 而非 storefront）。

**根因：** Mini 上 Caddy 是用 systemd 服务启动的，配置文件是
**`/etc/caddy/Caddyfile`**，不是 `/srv/mailyns/Caddyfile.lubaca`。
之前修改 `Caddyfile.lubaca` 从来没生效过。

**修复：** 直接在 `/etc/caddy/Caddyfile` 中添加缺失的路由，
**特定路由必须放在 catch-all `/api/*` 之前**，否则永远匹配不到：
```caddy
# Storefront API routes — go via storefront (must be BEFORE /api/*)
handle /api/banners {
    reverse_proxy localhost:8000
}
handle /api/client-error {
    reverse_proxy localhost:8000
}
handle /api/auth/jwt {
    reverse_proxy localhost:8000
}
handle /api/carousel {
    reverse_proxy localhost:8000
}
handle /api/social/* {
    reverse_proxy localhost:8000
}
handle /api/nt/* {
    reverse_proxy localhost:8000
}
handle /api/account/delete {
    reverse_proxy localhost:8000
}
handle /api/sso/grochat {
    reverse_proxy localhost:8000
}
handle /api/sso/logout {
    reverse_proxy localhost:8000
}

# Medusa API (catch-all — must be after specific /api/ routes)
handle_path /api/* {
    reverse_proxy localhost:9000
}
```

**重载 Caddy：**
```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

### 7. ❗ `NEXT_PUBLIC_*` 变量写死 IP → 换网络就报 500

**现象：** 一台机器在家跑 Medusa + Storefront 正常，拿到别的网络下，
`https://域名/` 返回 500。后台管理页（Medusa admin）能显示登录表单，
但前台 SSR 页面全炸。

**根因：** Storefront 的 `.env` 中 `NEXT_PUBLIC_MEDUSA_BACKEND_URL` 写死了局域网 IP
（如 `http://192.168.1.176:9000`），且 `NEXT_PUBLIC_*` 变量在 `next build` 时
**编译进 JS 包**，不是运行时读 .env。换网络后机器 IP 变了，SSR 请求连不上那个 IP。
后台 admin 能显示是因为 Medusa 后端直接渲染 HTML，不涉及前端编译。

**修复三步曲：**

1. 把 `.env` 中的 `NEXT_PUBLIC_MEDUSA_BACKEND_URL` 从固定 IP 改为 `http://localhost:9000`
2. 重新 `next build`（这一步必须！光改 .env 不 build 等于没改）
3. 重启 storefront

```bash
# storefront 项目目录下
sed -i 's|NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://192.168.1.x:9000|NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000|' .env
npx next build
npx next start -p 8000
```

**原理：** 前端和后端在同一台机器上，用 `localhost` 通信完全不需要网络。
拿到任何网络下都能正常工作。

**戒律：** 任何代码、配置文件、环境变量里都**不准写死 IP 地址**。
一律用 `localhost`（本机通信）或域名（跨机/公网通信）。

---

### 8. ❗ Next.js fetch 缓存导致数据陈旧

**现象：** 在管理后台上传了新横幅，页面显示"成功"，
但首页依旧显示旧图（或空白）。

**根因：** Storefront 的 API 路由 `api/banners/route.ts` 中使用了
`next: { revalidate: 60 }`，生产模式下 Next.js 将 fetch 响应缓存到
磁盘（`.next/cache/fetch-cache/`），即使超时后仍返回旧数据。

**修复：** 清除 Next.js 缓存后重启：
```bash
rm -rf /srv/mailyns/storefront/.next/cache/fetch-cache/
pm2 restart storefront
```

**根治方案：** 去掉 `next: { revalidate: ... }` 选项，每次请求直接查后端。
或者改为 `cache: 'no-store'`：
```javascript
const res = await fetch(`${host}/chatadmin/api/banners/public`, {
  cache: 'no-store',
})
```

---

## 排障速查

| 症状 | 检查点 | 常见原因 |
|------|--------|---------|
| Stats 返回 undefined | F12 → Network → stats 请求 | 数据库连接失败 |
| Stats 500 `role * does not exist` | PG 用户是否存在 | Docker PG 缺少对应角色 |
| Stats 500 `database * does not exist` | DATABASE_URL 是否正确 | dotenv 未加载，用了默认值 |
| 登录失败"邮箱或密码错误" | `ADMIN_PASSWORD` 值 | dotenv 未加载，或用错密码 |
| 轮播图加载慢 | 图片大小 | Mini 在德国，国内访问走 CF 隧道，大图慢 |
| 商城页面是旧版 | git log vs Mini 上的 commit | 自动部署未触发或未拉取 |
| PM2 日志 `injected env (0)` | pm2 show 的 exec cwd | 启动时不在项目目录 |
| `/api/banners` 404 | 响应头有没有 `connect.sid` | Caddy 路由到 Medusa 而非 storefront |
| 横幅上传成功但首页不更新 | storefront API 返回值 | Next.js fetch 缓存陈旧 |

---

## 目录结构（Mini）

```
/srv/mailyns/
├── medusa/           # Medusa 后端 monorepo
│   └── apps/backend/ # 后端源码
├── storefront/       # Next.js 商城前端
├── mailynback/       # 管理后台
│   ├── server.js
│   ├── public/       # 前端 HTML/CSS/JS
│   └── .env          # 环境变量（!!! 关键文件）
├── call-server/      # 语音信令服务器
├── umami/            # 统计
├── deploy.sh         # 自动部署脚本
└── Caddyfile.lubaca  # Caddy 路由配置

/home/ding/
└── .pm2/dump.pm2     # PM2 进程列表（开机自启）
```

---

## 注意（戒律）

1. **不改 Mini 源码**——源码从 git 拉，手动改的不会同步回仓库，导致代码分裂
2. **配置只存在各自机器上**——Caddyfile、带具体域名/端口/密码的配置属于具体部署实例，不做 git 管理。Mini 的配置只在 Mini 上改，本机的配置只在本机改，不同机器不互相同步
3. **运维操作可 SSH：** 看日志、重启服务、改 `.env`、改 Caddyfile、查数据库
4. **PM2 开机自启已设：** `pm2-ding` systemd 服务，断电重启后 1-2 分钟自动恢复
5. **Docker 容器也有自启：** `postgres:16-alpine` 和 `redis:7-alpine` 设了 restart policy
