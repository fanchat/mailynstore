#!/bin/bash
# patches/sync-jwt-to-grochat.sh
# 将 Medusa 的 JWT_SECRET 同步到 GroChat Go 后端的 .env
# 每次启动 Medusa 后运行此脚本

MEDUSA_ENV="$HOME/mailyns/medusa/apps/backend/.env"
GROCHAT_ENV="$HOME/grochat/grochat-backend/.env"

if [ ! -f "$MEDUSA_ENV" ]; then
    echo "[patch] Medusa .env 不存在，跳过"
    exit 0
fi

MEDUSA_JWT=$(grep '^JWT_SECRET=' "$MEDUSA_ENV" | cut -d= -f2-)
if [ -z "$MEDUSA_JWT" ]; then
    echo "[patch] Medusa 未配置 JWT_SECRET"
    exit 0
fi

# 更新 GroChat .env 中的 MEDUSA_JWT_SECRET
if [ -f "$GROCHAT_ENV" ]; then
    if grep -q '^MEDUSA_JWT_SECRET=' "$GROCHAT_ENV"; then
        sed -i "s|^MEDUSA_JWT_SECRET=.*|MEDUSA_JWT_SECRET=$MEDUSA_JWT|" "$GROCHAT_ENV"
    else
        echo "MEDUSA_JWT_SECRET=$MEDUSA_JWT" >> "$GROCHAT_ENV"
    fi
    echo "[patch] JWT_SECRET 已同步到 GroChat: ${MEDUSA_JWT:0:10}..."
fi
