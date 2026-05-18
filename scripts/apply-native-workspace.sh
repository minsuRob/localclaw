#!/usr/bin/env bash
# 네이티브 openclaw daemon + localclaw 레포 workspace 일괄 적용 (맥 권장)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

echo "=== Apply native workspace: ${ROOT_DIR} ==="

if [[ -f "${ENV_FILE}" ]]; then
  if grep -q '^OPENCLAW_WORKSPACE_DIR=' "${ENV_FILE}"; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^OPENCLAW_WORKSPACE_DIR=.*|OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}|" "${ENV_FILE}"
    else
      sed -i "s|^OPENCLAW_WORKSPACE_DIR=.*|OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}|" "${ENV_FILE}"
    fi
  else
    echo "OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}" >> "${ENV_FILE}"
  fi
  if grep -q '^OPENCLAW_RUNTIME=' "${ENV_FILE}"; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' 's|^OPENCLAW_RUNTIME=.*|OPENCLAW_RUNTIME=native|' "${ENV_FILE}"
    else
      sed -i 's|^OPENCLAW_RUNTIME=.*|OPENCLAW_RUNTIME=native|' "${ENV_FILE}"
    fi
  else
    echo "OPENCLAW_RUNTIME=native" >> "${ENV_FILE}"
  fi
  echo "Updated ${ENV_FILE}"
else
  echo "No .env — copy from .env.example and re-run."
  exit 1
fi

"${SCRIPT_DIR}/sync-openclaw-config.sh" --native
"${SCRIPT_DIR}/reset-agent-main-session.sh"

if command -v openclaw &>/dev/null; then
  openclaw daemon restart || openclaw gateway restart || true
fi

echo ""
echo "Done. Verify: ./scripts/verify-agent-workspace.sh"
echo "Do NOT run docker compose if openclaw daemon already uses port 18789."
