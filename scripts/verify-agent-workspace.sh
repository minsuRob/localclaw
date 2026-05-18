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

REPO_ROOT="${ROOT_DIR}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-${REPO_ROOT}}"
TAILSCALE_GATEWAY_API_BASE_URL="${TAILSCALE_GATEWAY_API_BASE_URL:-https://robertlee-macbookpro.tail15c8bb.ts.net/v1}"
OPENCLAW_HOME="${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}"
MAIN_CONFIG="${OPENCLAW_HOME}/openclaw.json"
SESSION_STORE="${OPENCLAW_HOME}/agents/main/sessions/sessions.json"

echo ""
echo -e "${BLUE}=== OpenClaw agent workspace verification ===${NC}"
echo ""

if [[ "${OPENCLAW_WORKSPACE_DIR}" != "${REPO_ROOT}" ]]; then
  warn ".env OPENCLAW_WORKSPACE_DIR=${OPENCLAW_WORKSPACE_DIR}"
  warn "  Expected localclaw repo: ${REPO_ROOT}"
  warn "  Fix: ./scripts/apply-native-workspace.sh"
fi

info "Repo root: ${REPO_ROOT}"
info "OPENCLAW_WORKSPACE_DIR (.env): ${OPENCLAW_WORKSPACE_DIR}"

if lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | head -3 | grep -q .; then
  info "Port 18789 listener:"
  lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | head -3 | sed 's/^/  /'
  if lsof -iTCP:18789 -sTCP:LISTEN -P -n 2>/dev/null | grep -q node; then
    info "Native openclaw daemon is using 18789 — use --native sync, not docker compose."
  fi
else
  warn "Nothing listening on 18789 — start: openclaw daemon restart OR docker compose up -d"
fi

if [[ -f "${MAIN_CONFIG}" ]]; then
  info "Gateway config: ${MAIN_CONFIG}"
  node -e "const c=require(process.argv[1]); console.log('  agents.defaults.workspace:', c?.agents?.defaults?.workspace)" "${MAIN_CONFIG}" 2>/dev/null || true
else
  warn "Missing ${MAIN_CONFIG} — run ./scripts/sync-openclaw-config.sh --native"
fi

if [[ -f "${SESSION_STORE}" ]]; then
  STALE="$(node -e "
    const d=require(process.argv[1]);
    const e=d['agent:main:main'];
  if(!e) process.exit(0);
  const w=e.systemPromptReport?.workspaceDir||e.workspaceDir||'';
  console.log(w);
  " "${SESSION_STORE}" 2>/dev/null || true)"
  if [[ -n "${STALE}" && "${STALE}" != "${REPO_ROOT}" ]]; then
    warn "Session agent:main:main still pinned to workspace: ${STALE}"
    warn "  Fix: ./scripts/reset-agent-main-session.sh && openclaw daemon restart"
  elif [[ "${STALE}" == "${REPO_ROOT}" ]]; then
    pass "Session agent:main:main workspace matches repo"
  fi
fi

if command -v openclaw &>/dev/null; then
  info "openclaw sandbox explain --session agent:main:main"
  openclaw sandbox explain --session agent:main:main 2>/dev/null || warn "sandbox explain failed"
else
  warn "openclaw CLI not in PATH"
fi

echo ""
if [[ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]]; then
  warn "OPENCLAW_GATEWAY_TOKEN unset — skipping chat test"
  exit 0
fi

PROMPT="Use the read tool on ${REPO_ROOT}/README.md and quote the first markdown heading line only. Do not ask the user to paste files."
info "POST ${TAILSCALE_GATEWAY_API_BASE_URL}/chat/completions"

RESPONSE="$(
  OPENCLAW_GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN}" \
  TAILSCALE_GATEWAY_API_BASE_URL="${TAILSCALE_GATEWAY_API_BASE_URL}" \
  REPO_ROOT="${REPO_ROOT}" \
  PROMPT="${PROMPT}" \
  node <<'NODE'
const base = new URL(process.env.TAILSCALE_GATEWAY_API_BASE_URL);
const apiUrl = `${base.origin}${base.pathname.replace(/\/$/, '')}/chat/completions`;
const root = process.env.REPO_ROOT;
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

if echo "${RESPONSE}" | grep -qiE 'localclaw|OpenClaw|Gemma|llama'; then
  pass "Response mentions README-like content"
elif echo "${RESPONSE}" | grep -qiE 'cannot read|paste|unable to access|읽을 수 없|붙여'; then
  warn "Model refused or no tool_calls — try model override or Control UI"
  exit 1
else
  warn "Inconclusive — compare with Control UI"
fi

pass "Verification finished"
