#!/usr/bin/env python3
"""
lubaca 状态采集报告
每10分钟收集环境信息并发送邮件到指定邮箱
"""

import subprocess
import time
import smtplib
import json
from email.mime.text import MIMEText
from datetime import datetime
import os
import socket

# ===== 配置 =====
# 接收报告的邮箱（多个用逗号分隔）
RECIPIENTS = ["dingyunfeng@hotmail.com"]
SENDER_EMAIL = "admin@mailyn.cn"
SENDER_PASSWORD = "mailynback"  # 邮件密码
SMTP_SERVER = "smtp.mailyn.cn"  # 待确认
SMTP_PORT = 587

# 缓存文件（记录上次发送时间，避免刚开机10分钟频繁发送）
CACHE_FILE = "/tmp/lubaca_report_cache.json"

# ===== 采集函数 =====

def run(cmd, timeout=5):
    """执行命令并返回输出"""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() or r.stderr.strip() or "(无输出)"
    except Exception as e:
        return f"(错误: {e})"


def collect():
    data = {}
    data["时间"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data["主机名"] = run("hostname")
    data["运行时间"] = run("uptime")
    
    # 网络
    data["公网IPv4"] = run("curl -s --connect-timeout 5 ifconfig.me")
    data["公网IPv6"] = run("curl -s --connect-timeout 5 https://api6.ipify.org")
    data["局域网IP"] = run("ip -4 addr show | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | tr '\n' ' '")
    data["网关"] = run("ip route | grep default | awk '{print $3}' | head -1")
    data["DNS"] = run("cat /etc/resolv.conf 2>/dev/null | grep nameserver | head -3")
    
    # 域名解析
    for domain in ["lubaca.shop", "lubaca.cyou"]:
        data[f"DNS_{domain}"] = run(f"nslookup {domain} 2>&1 | grep 'Address' | tail -3 | tr '\n' ' '")
    
    # 服务状态
    data["Caddy状态"] = run("systemctl is-active caddy 2>/dev/null || echo '未安装/未运行'")
    data["Caddy配置"] = run("cat /srv/mailyns/Caddyfile.lubaca 2>/dev/null | head -30 || echo '未找到'")
    data["Cloudflared状态"] = run("pm2 show cloudflared-tunnel 2>/dev/null | grep 'status' | head -1 || systemctl is-active cloudflared 2>/dev/null || echo '未知'")
    
    # PM2 进程
    data["PM2列表"] = run("pm2 list 2>/dev/null | tail -20 || echo 'PM2未安装'")
    
    # 系统资源
    data["磁盘"] = run("df -h / /srv 2>/dev/null | tail -4")
    data["内存"] = run("free -h | head -3")
    data["CPU负载"] = run("cat /proc/loadavg")
    
    # 最近启动时间
    data["开机时间"] = run("who -b | awk '{print $3,$4}'")
    
    # 进程数
    data["进程数"] = run("ps aux | wc -l")
    
    return data


def format_email(data):
    lines = []
    lines.append("=" * 60)
    lines.append(f"  📡 lubaca 服务器状态报告")
    lines.append(f"  {data['时间']}")
    lines.append("=" * 60)
    lines.append("")
    
    sections = [
        ("🔧 系统", ["主机名", "运行时间", "开机时间", "进程数"]),
        ("🌐 网络", ["公网IPv4", "公网IPv6", "局域网IP", "网关", "DNS"]),
        ("📡 域名", ["DNS_lubaca.shop", "DNS_lubaca.cyou"]),
        ("⚙️ 服务", ["Caddy状态", "Cloudflared状态"]),
        ("💾 资源", ["磁盘", "内存", "CPU负载"]),
        ("📋 PM2进程", ["PM2列表"]),
        ("📄 Caddy配置", ["Caddy配置"]),
    ]
    
    for title, keys in sections:
        lines.append(f"─── {title} ───")
        for k in keys:
            if k in data:
                val = data[k]
                if len(val) > 200:
                    val = val[:200] + "...(截断)"
                lines.append(f"  {k}: {val}")
        lines.append("")
    
    lines.append("─" * 60)
    lines.append("由 lubaca 自动报告系统生成")
    return "\n".join(lines)


def should_send():
    """检查是否需要发送（10分钟间隔）"""
    if not os.path.exists(CACHE_FILE):
        return True
    try:
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        last = cache.get("last_send", 0)
        now = time.time()
        if now - last < 600:  # 10分钟
            return False
    except:
        pass
    return True


def mark_sent():
    """记录发送时间"""
    with open(CACHE_FILE, "w") as f:
        json.dump({"last_send": time.time()}, f)


def send_email(body, subject=None):
    if not subject:
        subject = f"[lubaca] 状态报告 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = ", ".join(RECIPIENTS)
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as s:
            s.starttls()
            s.login(SENDER_EMAIL, SENDER_PASSWORD)
            s.send_message(msg)
        return True, "邮件发送成功"
    except Exception as e:
        return False, f"邮件发送失败: {e}"


def main():
    # 1. 采集
    data = collect()
    body = format_email(data)
    
    # 2. 保存日志
    log_dir = "/var/log/lubaca-reports"
    os.makedirs(log_dir, exist_ok=True)
    log_file = f"{log_dir}/report-{datetime.now().strftime('%Y%m%d-%H%M')}.log"
    with open(log_file, "w") as f:
        f.write(body)
    
    # 3. 发送
    if should_send():
        ok, msg = send_email(body)
        if ok:
            mark_sent()
            print(f"[OK] {msg}")
        else:
            print(f"[FAIL] {msg}")
            # 失败时保存到本地，下次一起发
            with open("/tmp/lubaca_report_pending.log", "w") as f:
                f.write(body)
    else:
        print("[SKIP] 距上次发送不足10分钟，仅保存本地日志")


if __name__ == "__main__":
    main()
