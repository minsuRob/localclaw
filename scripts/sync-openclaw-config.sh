#!/usr/bin/env bash
# 레포 config/openclaw.json → ~/.openclaw/openclaw.json (실제 게이트웨이 설정) 병합
# 사용: ./scripts/sync-openclaw-config.sh [--docker|--native]
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_SRC="${ROOT_DIR}/config/openclaw.json"
RUNTIME="docker"

usage() {
  echo "Usage: $0 [--docker|--native]"
  echo "  --docker  workspace = /home/node/.openclaw/workspace (Docker compose mount)"
  echo "  --native  workspace = localclaw repo root on the Mac host (openclaw daemon)"
  echo ""
  echo "Note: paste commands one line at a time. Do not include shell comments on the same line."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker) RUNTIME="docker"; shift ;;
    --native) RUNTIME="native"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -f "${ROOT_DIR}/.env" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "${ROOT_DIR}/.env"
  set +a
  if [[ -n "${OPENCLAW_RUNTIME:-}" ]]; then
    RUNTIME="${OPENCLAW_RUNTIME}"
  fi
fi

OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}"
CONFIG_DST="${OPENCLAW_CONFIG_DIR}/openclaw.json"
LEGACY_DST="${OPENCLAW_CONFIG_DIR}/config/openclaw.json"
mkdir -p "$(dirname "${CONFIG_DST}")"

if [[ ! -f "${CONFIG_SRC}" ]]; then
  echo -e "${RED}[ERROR]${NC} Missing ${CONFIG_SRC}" >&2
  exit 1
fi

if [[ "${RUNTIME}" == "native" ]]; then
  WORKSPACE="${ROOT_DIR}"
else
  WORKSPACE="/home/node/.openclaw/workspace"
fi

if lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | grep -q .; then
  if lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | grep -qv docker; then
    if [[ "${RUNTIME}" == "docker" ]]; then
      echo -e "${YELLOW}[WARN]${NC}  Port 18789 is already in use (likely openclaw daemon)."
      echo -e "${YELLOW}[WARN]${NC}  Use: $0 --native   and skip docker compose, OR stop the daemon first."
    fi
  fi
fi

BACKUP=""
if [[ -f "${CONFIG_DST}" ]]; then
  BACKUP="${CONFIG_DST}.bak.$(date +%Y%m%d%H%M%S)"
  cp "${CONFIG_DST}" "${BACKUP}"
  echo -e "${BLUE}[INFO]${NC}  Backed up ${CONFIG_DST} → ${BACKUP}"
fi

export CONFIG_SRC CONFIG_DST LEGACY_DST WORKSPACE RUNTIME
node <<'NODE'
const fs = require('fs');
const srcPath = process.env.CONFIG_SRC;
const dstPath = process.env.CONFIG_DST;
const legacyPath = process.env.LEGACY_DST;
const workspace = process.env.WORKSPACE;
const runtime = process.env.RUNTIME;

const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
let dst = {};
if (fs.existsSync(dstPath)) {
  try {
    dst = JSON.parse(fs.readFileSync(dstPath, 'utf8'));
  } catch {
    dst = {};
  }
}

const mergeKeys = ['browser', 'tools'];
for (const key of mergeKeys) {
  if (src[key] !== undefined) dst[key] = src[key];
}

if (src.gateway) {
  dst.gateway = { ...(dst.gateway || {}), ...src.gateway };
  if (src.gateway.controlUi) {
    dst.gateway.controlUi = {
      ...(dst.gateway.controlUi || {}),
      ...src.gateway.controlUi,
    };
  }
  if (src.gateway.http) {
    dst.gateway.http = { ...(dst.gateway.http || {}), ...src.gateway.http };
  }
}

if (src.models?.providers) {
  dst.models = dst.models || { mode: 'merge' };
  dst.models.providers = {
    ...(dst.models.providers || {}),
    ...src.models.providers,
  };
}

dst.agents = dst.agents || {};
const prevDefaults = dst.agents.defaults || {};
const srcDefaults = src.agents?.defaults || {};
dst.agents.defaults = {
  ...prevDefaults,
  ...srcDefaults,
  workspace,
  sandbox: { ...(prevDefaults.sandbox || {}), ...(srcDefaults.sandbox || {}) },
  models: { ...(prevDefaults.models || {}), ...(srcDefaults.models || {}) },
};

fs.writeFileSync(dstPath, JSON.stringify(dst, null, 2) + '\n');

// Legacy path (Docker image / old docs) — gateway fragment only
const legacy = {
  gateway: dst.gateway,
  models: dst.models,
  agents: { defaults: { workspace } },
};
fs.mkdirSync(require('path').dirname(legacyPath), { recursive: true });
fs.writeFileSync(legacyPath, JSON.stringify(legacy, null, 2) + '\n');

console.log(JSON.stringify({ dstPath, legacyPath, workspace, runtime }, null, 2));
NODE

echo -e "${GREEN}[OK]${NC}    Synced OpenClaw config (${RUNTIME})"
echo -e "${BLUE}[INFO]${NC}  workspace = ${WORKSPACE}"
echo -e "${BLUE}[INFO]${NC}  ${CONFIG_DST}"
echo ""
echo "Next:"
if [[ "${RUNTIME}" == "native" ]]; then
  echo "  ./scripts/reset-agent-main-session.sh   # if chat still uses old ~/.openclaw/workspace"
  echo "  openclaw daemon restart"
else
  echo "  Update .env: OPENCLAW_WORKSPACE_DIR=${ROOT_DIR}"
  echo "  docker compose up -d   # only if nothing else listens on 18789"
fi
