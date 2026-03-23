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

echo "🚀  포트 $SERVE_PORT 에서 시작합니다. (Ctrl+C 로 종료)"
npx serve "$SCRIPT_DIR" -p "$SERVE_PORT" --no-clipboard
