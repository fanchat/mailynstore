#!/bin/bash
DB_URL="postgres://ding@localhost:5432/medusa-backend"
PK="pk_test"
if [ "$PK" = "pk_test" ]; then
    echo "请先在 env-config.env 中配置 PUBLISHABLE_KEY"
    exit 1
fi
PGPASSWORD= psql "$DB_URL" -c "
INSERT INTO api_key (id, token, salt, redacted, title, type, created_by, created_at, updated_at)
VALUES ('apk_' || replace(gen_random_uuid()::text, '-', ''), '$PK', '', '$PK', 'Auto Publishable Key', 'publishable', 'system', NOW(), NOW())
ON CONFLICT (token) DO NOTHING;
" 2>/dev/null && echo "OK publishable key created" || echo "create failed (may already exist)"
