#!/usr/bin/env bash
# Docker openclaw-gateway + localclaw 레포 workspace (Mac 전략 A)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

echo "=== Apply Docker workspace: ${ROOT_DIR} ==="

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env — run ./scripts/setup.sh first."
  exit 1
fi

if [[ "$(uname)" == "Darwin" ]]; then
  sed -i '' "s|^OPENCLAW_WORKSPACE_DIR=.*|OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}|" "${ENV_FILE}"
  if grep -q '^OPENCLAW_RUNTIME=' "${ENV_FILE}"; then
    sed -i '' 's|^OPENCLAW_RUNTIME=.*|OPENCLAW_RUNTIME=docker|' "${ENV_FILE}"
  else
    echo "OPENCLAW_RUNTIME=docker" >> "${ENV_FILE}"
  fi
else
  sed -i "s|^OPENCLAW_WORKSPACE_DIR=.*|OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}|" "${ENV_FILE}"
  grep -q '^OPENCLAW_RUNTIME=' "${ENV_FILE}" && sed -i 's|^OPENCLAW_RUNTIME=.*|OPENCLAW_RUNTIME=docker|' "${ENV_FILE}" || echo "OPENCLAW_RUNTIME=docker" >> "${ENV_FILE}"
fi

# shellcheck source=/dev/null
set -a
source "${ENV_FILE}"
set +a

echo "Stopping native openclaw daemon (frees port 18789)..."
if command -v openclaw &>/dev/null; then
  openclaw daemon stop 2>/dev/null || true
  launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
  sleep 2
fi

if lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | grep -q node; then
  echo "WARN: node still on 18789 — kill manually or: openclaw daemon stop"
  lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null || true
fi

"${SCRIPT_DIR}/sync-openclaw-config.sh" --docker
"${SCRIPT_DIR}/reset-agent-main-session.sh"

cd "${ROOT_DIR}"
docker compose down 2>/dev/null || true
docker compose up -d

echo "Waiting for gateway health..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:18789/healthz" &>/dev/null; then
    echo "Gateway healthy on 127.0.0.1:18789 (Docker)"
    break
  fi
  sleep 1
done

if ! docker exec openclaw-gateway curl -sf "http://127.0.0.1:18789/healthz" &>/dev/null; then
  echo "Gateway not responding — check: docker compose logs openclaw-gateway"
  exit 1
fi

# Host port forward can return empty body on some Mac/Docker builds; Tailscale uses 127.0.0.1:18789
if ! curl -sf "http://127.0.0.1:18789/healthz" &>/dev/null; then
  echo "WARN: curl from host to 127.0.0.1:18789 failed (container internal health OK)."
  echo "      If Tailscale returns 502, run: docker compose up -d --force-recreate"
fi

if curl -sf "http://127.0.0.1:8080/health" &>/dev/null; then
  echo "llama-server OK on :8080"
else
  echo "WARN: llama-server not on :8080 — run ./scripts/start-llamacpp.sh"
fi

echo ""
echo "Done. Verify: ./scripts/verify-agent-workspace.sh"
echo "Tailscale Funnel should proxy to this host's 127.0.0.1:18789"
