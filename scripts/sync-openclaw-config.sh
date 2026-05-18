#!/usr/bin/env bash
# 레포 config/openclaw.json 을 ~/.openclaw/config/openclaw.json 에 병합합니다.
# 사용: ./scripts/sync-openclaw-config.sh [--native|--docker]
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
  echo "  --docker  workspace = /home/node/.openclaw/workspace (default, Docker compose mount)"
  echo "  --native  workspace = localclaw repo root on the Mac host"
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
CONFIG_DST="${OPENCLAW_CONFIG_DIR}/config/openclaw.json"
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

BACKUP=""
if [[ -f "${CONFIG_DST}" ]]; then
  BACKUP="${CONFIG_DST}.bak.$(date +%Y%m%d%H%M%S)"
  cp "${CONFIG_DST}" "${BACKUP}"
  echo -e "${BLUE}[INFO]${NC}  Backed up existing config to ${BACKUP}"
fi

export CONFIG_SRC="${CONFIG_SRC}" CONFIG_DST="${CONFIG_DST}" WORKSPACE="${WORKSPACE}" RUNTIME="${RUNTIME}"
node <<'NODE'
const fs = require('fs');
const srcPath = process.env.CONFIG_SRC;
const dstPath = process.env.CONFIG_DST;
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

const mergeKeys = ['browser', 'tools', 'gateway', 'models'];
for (const key of mergeKeys) {
  if (src[key] !== undefined) dst[key] = src[key];
}

dst.agents = dst.agents || {};
dst.agents.defaults = {
  ...(dst.agents.defaults || {}),
  ...(src.agents?.defaults || {}),
  workspace,
};

fs.writeFileSync(dstPath, JSON.stringify(dst, null, 2) + '\n');
console.log(JSON.stringify({ dstPath, workspace, runtime }, null, 2));
NODE

echo -e "${GREEN}[OK]${NC}    Synced OpenClaw config (${RUNTIME})"
echo -e "${BLUE}[INFO]${NC}  workspace = ${WORKSPACE}"
echo -e "${BLUE}[INFO]${NC}  ${CONFIG_DST}"
echo ""
echo "Next:"
if [[ "${RUNTIME}" == "native" ]]; then
  echo "  openclaw daemon restart   # or: launchctl kickstart -k gui/\$(id -u)/ai.openclaw.gateway"
else
  echo "  cd ${ROOT_DIR} && docker compose restart openclaw-gateway"
  echo "  Ensure .env OPENCLAW_WORKSPACE_DIR points at this repo, then: docker compose up -d"
fi
