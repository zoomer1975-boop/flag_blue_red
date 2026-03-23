#!/usr/bin/env bash
# ============================================================
# 청기백기 게임 서버 시작 스크립트
# 사용법: bash start.sh [--nginx-conf /etc/nginx/conf.d/flag_game.conf]
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"
TEMPLATE_FILE="$SCRIPT_DIR/nginx.conf.template"
OUTPUT_CONF="${1:-$SCRIPT_DIR/flag_game.conf}"

# 두 번째 인자로 출력 경로 지정 가능
if [[ "$1" == "--nginx-conf" && -n "$2" ]]; then
  OUTPUT_CONF="$2"
fi

# ── 1. config.env 로드 ──────────────────────────────────────
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌  config.env 파일을 찾을 수 없습니다: $CONFIG_FILE"
  exit 1
fi

# 주석/빈줄 제거 후 export
set -a
# shellcheck source=/dev/null
source <(grep -v '^\s*#' "$CONFIG_FILE" | grep -v '^\s*$')
set +a

echo "✅  설정 로드 완료"
echo "    SERVE_PORT  = $SERVE_PORT"
echo "    NGINX_PORT  = $NGINX_PORT"
echo "    SERVER_NAME = $SERVER_NAME"

# ── 2. nginx.conf 생성 ──────────────────────────────────────
if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "❌  템플릿 파일을 찾을 수 없습니다: $TEMPLATE_FILE"
  exit 1
fi

envsubst '${NGINX_PORT} ${SERVER_NAME} ${ACCESS_LOG} ${ERROR_LOG} ${CLIENT_MAX_BODY_SIZE} ${GZIP} ${SERVE_PORT}' \
  < "$TEMPLATE_FILE" \
  > "$OUTPUT_CONF"

echo "✅  nginx 설정 생성: $OUTPUT_CONF"

# ── 3. nginx 설정 테스트 ────────────────────────────────────
if command -v nginx &>/dev/null; then
  echo "🔍  nginx 설정 검사 중..."
  nginx -t && echo "✅  nginx 설정 유효"
else
  echo "⚠️   nginx 명령어를 찾을 수 없습니다. 설정 파일만 생성했습니다."
fi

# ── 4. npx serve 실행 ───────────────────────────────────────
echo ""
echo "🚀  npx serve 시작 (포트 $SERVE_PORT)..."
echo "    Ctrl+C 로 종료"
echo ""

npx serve "$SCRIPT_DIR" --listen "$SERVE_PORT" --no-clipboard
