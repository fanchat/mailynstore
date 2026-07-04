#!/bin/bash
# Auto-deploy: check GitHub for new commits, pull, build, restart
# With lock file + stale build cleanup to prevent process pileup

PROJECT_DIR="/srv/mailyns"
LOG_FILE="/home/ding/deploy.log"
LOCK_FILE="/tmp/deploy.lock"
BUILD_TIMEOUT=120  # 2 minutes max per build

# Prevent concurrent runs
if ! mkdir "$LOCK_FILE" 2>/dev/null; then
    echo "[$(date)] Deploy already running, skipping" >> "$LOG_FILE"
    exit 0
fi
trap 'rm -rf "$LOCK_FILE"' EXIT

cd "$PROJECT_DIR" || { echo "cd failed"; exit 1; }

# Kill any previous stuck build processes
STALE_BUILDS=$(pgrep -f "medusa.*cli.*build" 2>/dev/null)
if [ -n "$STALE_BUILDS" ]; then
    echo "[$(date)] Killing stale build processes: $STALE_BUILDS" | tee -a "$LOG_FILE"
    kill -9 $STALE_BUILDS 2>/dev/null
fi

# Fetch without merging
git fetch origin master 2>&1 | tee -a "$LOG_FILE"

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "[$(date)] No new commits" >> "$LOG_FILE"
    exit 0
fi

echo "[$(date)] New commits detected. Deploying..." | tee -a "$LOG_FILE"

# Pull latest
git pull origin master 2>&1 | tee -a "$LOG_FILE"

# Build: serial to avoid OOM (4GB RAM limit), with timeout
echo "[$(date)] Building Medusa..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/medusa/apps/backend" || exit 1
timeout $BUILD_TIMEOUT npm run build 2>&1 | tee -a "$LOG_FILE"
BUILD1_EXIT=${PIPESTATUS[0]}

echo "[$(date)] Building Storefront..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR/storefront" || exit 1
timeout $BUILD_TIMEOUT npm run build 2>&1 | tee -a "$LOG_FILE"
BUILD2_EXIT=${PIPESTATUS[0]}

if [ "$BUILD1_EXIT" -ne 0 ] || [ "$BUILD2_EXIT" -ne 0 ]; then
    echo "[$(date)] BUILD FAILED! (medusa=$BUILD1_EXIT, storefront=$BUILD2_EXIT) Not restarting." | tee -a "$LOG_FILE"
    exit 1
fi

# Restart all PM2 processes
echo "[$(date)] Restarting all services..." | tee -a "$LOG_FILE"
pm2 restart all 2>&1 | tee -a "$LOG_FILE"

echo "[$(date)] Deploy complete!" | tee -a "$LOG_FILE"
