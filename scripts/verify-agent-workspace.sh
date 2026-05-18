#!/usr/bin/env bash
# 게이트웨이 에이전트 workspace·파일 도구 스모크 테스트
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "${ENV_FILE}"
  set +a
fi

OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-${ROOT_DIR}}"
TAILSCALE_GATEWAY_API_BASE_URL="${TAILSCALE_GATEWAY_API_BASE_URL:-}"
if [[ -z "${TAILSCALE_GATEWAY_API_BASE_URL}" ]]; then
  TAILSCALE_GATEWAY_API_BASE_URL="https://robertlee-macbookpro.tail15c8bb.ts.net/v1"
fi

echo ""
echo -e "${BLUE}=== OpenClaw agent workspace verification ===${NC}"
echo ""

info "Expected repo / workspace on host: ${OPENCLAW_WORKSPACE_DIR}"
if [[ ! -d "${OPENCLAW_WORKSPACE_DIR}" ]]; then
  warn "Directory does not exist on this machine (OK if testing remote gateway only)"
fi

if command -v openclaw &>/dev/null; then
  info "openclaw sandbox explain (session agent:main:main)"
  openclaw sandbox explain --session agent:main:main 2>/dev/null || warn "sandbox explain failed (gateway down?)"
else
  warn "openclaw CLI not in PATH — skip sandbox explain"
fi

echo ""
info "Config on disk: ${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}/config/openclaw.json"
CFG_FILE="${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}/config/openclaw.json"
if [[ -f "${CFG_FILE}" ]]; then
  node -e "const c=require(process.argv[1]); console.log('  agents.defaults.workspace:', c?.agents?.defaults?.workspace)" "${CFG_FILE}" 2>/dev/null \
    || grep '"workspace"' "${CFG_FILE}" || true
fi

echo ""
if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  warn "OPENCLAW_GATEWAY_TOKEN unset — skipping authenticated chat test"
  echo ""
  echo "Manual checklist:"
  echo "  1. Control UI → /agents → Tools → confirm read/edit appear"
  echo "  2. Same prompt in Control UI vs GitHub Pages chat"
  echo "  3. If both fail: llama-server tool_calls / try gateway model override"
  exit 0
fi

PROMPT="Use the read tool on ${OPENCLAW_WORKSPACE_DIR}/README.md and quote the first heading line only. Do not ask the user to paste files."
info "POST ${TAILSCALE_GATEWAY_API_BASE_URL}/chat/completions (short stream)"

RESPONSE="$(
  OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN}" \
  TAILSCALE_GATEWAY_API_BASE_URL="${TAILSCALE_GATEWAY_API_BASE_URL}" \
  OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
  PROMPT="${PROMPT}" \
  node <<'NODE'
const base = new URL(process.env.TAILSCALE_GATEWAY_API_BASE_URL);
const apiUrl = `${base.origin}${base.pathname.replace(/\/$/, '')}/chat/completions`;
const root = process.env.OPENCLAW_WORKSPACE_DIR;
const system = [
  '[verify-agent-workspace]',
  `Repository root: ${root}`,
  'Attempt read/list tools before claiming no filesystem access.',
].join('\n');

(async () => {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`,
      'x-openclaw-session-key': 'main',
    },
    body: JSON.stringify({
      model: 'openclaw',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: process.env.PROMPT },
      ],
      stream: true,
      max_tokens: 512,
    }),
  });
  if (!res.ok) {
    console.error('HTTP_' + res.status);
    process.exit(1);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = '';
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data: ')) continue;
      const data = t.slice(6);
      if (data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        text += j.choices?.[0]?.delta?.content || '';
      } catch {}
    }
  }
  console.log(text.slice(0, 2000));
})().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
NODE
)" || fail "Gateway chat request failed"

echo ""
echo "--- Assistant excerpt ---"
echo "${RESPONSE}"
echo "---"

if echo "${RESPONSE}" | grep -qiE 'localclaw|OpenClaw|# '; then
  pass "Response mentions README-like content (possible successful read)"
elif echo "${RESPONSE}" | grep -qiE 'cannot read|paste|unable to access|읽을 수 없|붙여'; then
  warn "Model refused filesystem access — likely empty tool_calls or workspace mismatch"
  echo ""
  echo "Try:"
  echo "  ./scripts/sync-openclaw-config.sh --docker   # or --native"
  echo "  docker compose restart openclaw-gateway"
  echo "  Settings → model override to a tool-capable model"
  exit 1
else
  warn "Inconclusive — compare with Control UI using the same prompt"
fi

echo ""
pass "Verification finished"
