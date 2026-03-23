#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌  config.env 파일을 찾을 수 없습니다."
  exit 1
fi

set -a
source <(grep -v '^\s*#' "$CONFIG_FILE" | grep -v '^\s*$')
set +a

# nginx location 스니펫 생성
cat > "$SCRIPT_DIR/nginx-location.conf" <<EOF
# nginx 에 아래 location 블록을 추가하세요
# (server {} 블록 안에 붙여넣기)

location = ${BASE_URL} {
    return 301 ${BASE_URL}/;
}

location ${BASE_URL}/ {
    proxy_pass         http://127.0.0.1:${SERVE_PORT}/;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade \$http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host \$host;
    proxy_set_header   X-Real-IP \$remote_addr;
    proxy_cache_bypass \$http_upgrade;
}
EOF

echo "✅  nginx 설정 스니펫 생성: nginx-location.conf"
echo "🚀  포트 $SERVE_PORT 에서 시작합니다. (Ctrl+C 로 종료)"
npx serve "$SCRIPT_DIR" -p "$SERVE_PORT" --no-clipboard
