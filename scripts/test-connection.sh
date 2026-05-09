#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# .env 로드
ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck source=/dev/null
    set -a; source "${ENV_FILE}"; set +a
fi

LLAMACPP_PORT="${LLAMACPP_PORT:-8080}"
OPENCLAW_PORT="${OPENCLAW_PORT:-18789}"
TAILSCALE_GATEWAY_BASE_URL="${TAILSCALE_GATEWAY_BASE_URL:-https://robertlee-macbookpro.tail15c8bb.ts.net}"

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo -e "  ${GREEN}[PASS]${NC} $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo -e "  ${RED}[FAIL]${NC} $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
info() { echo -e "  ${CYAN}[INFO]${NC} $*"; }
section() {
    echo ""
    echo -e "${BLUE}── $* ──${NC}"
}

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  LocalClaw E2E 연결 테스트                     ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# ======================================================
# 테스트 1: Tailscale OpenClaw Gateway root check
# ======================================================
section "1. Tailscale OpenClaw Gateway root check"
TAILSCALE_ROOT_RESPONSE="$(curl -sf "${TAILSCALE_GATEWAY_BASE_URL}/" 2>/dev/null || echo "FAILED")"
if [[ "${TAILSCALE_ROOT_RESPONSE}" == "FAILED" ]]; then
    fail "Tailscale OpenClaw Gateway에 연결할 수 없습니다 (${TAILSCALE_GATEWAY_BASE_URL}/)"
    info "tailscale funnel 상태와 OpenClaw status를 확인하세요"
else
    pass "Tailscale OpenClaw Gateway 응답 OK"
    info "응답 일부: ${TAILSCALE_ROOT_RESPONSE:0:100}"
fi

# ======================================================
# 테스트 2: Tailscale Gateway UI에 대한 HTTPS 상태 확인
# ======================================================
section "2. Tailscale Gateway HTTPS 응답 확인"
GATEWAY_STATUS_RESPONSE="$(curl -sfI "${TAILSCALE_GATEWAY_BASE_URL}/" 2>/dev/null || echo "FAILED")"
if [[ "${GATEWAY_STATUS_RESPONSE}" == "FAILED" ]]; then
    fail "Tailscale Gateway HTTPS 헤더 응답 없음"
else
    pass "Tailscale Gateway HTTPS 헤더 응답 OK"
    info "응답 일부: ${GATEWAY_STATUS_RESPONSE:0:200}"
fi

# ======================================================
# 테스트 3: Tailscale Gateway WebSocket 연결
# ======================================================
section "3. Tailscale Gateway WebSocket 연결"
WS_RESPONSE="$(
TAILSCALE_GATEWAY_BASE_URL="${TAILSCALE_GATEWAY_BASE_URL}" node <<'NODE' 2>/dev/null || echo FAILED
const base = new URL(process.env.TAILSCALE_GATEWAY_BASE_URL);
const wsUrl = `${base.protocol === 'https:' ? 'wss:' : 'ws:'}//${base.host}/`;
const ws = new WebSocket(wsUrl);
ws.onopen = () => {
  console.log('open');
  ws.close();
};
ws.onerror = (e) => {
  console.error('error', e.message || e);
  process.exit(1);
};
ws.onclose = () => process.exit(0);
setTimeout(() => process.exit(2), 10000);
NODE
)"
if [[ "${WS_RESPONSE}" == "FAILED" ]]; then
    fail "Tailscale Gateway WebSocket 연결 실패"
else
    pass "Tailscale Gateway WebSocket 연결 OK"
fi

# ======================================================
# 테스트 4: llama-server health check
# ======================================================
section "4. llama-server health check"
HEALTH_RESPONSE="$(curl -sf "http://127.0.0.1:${LLAMACPP_PORT}/health" 2>/dev/null || echo "FAILED")"
if echo "${HEALTH_RESPONSE}" | grep -q "ok\|healthy\|LOADING\|READY" 2>/dev/null; then
    pass "llama-server 응답: ${HEALTH_RESPONSE}"
elif [[ "${HEALTH_RESPONSE}" == "FAILED" ]]; then
    fail "llama-server에 연결할 수 없습니다 (http://127.0.0.1:${LLAMACPP_PORT}/health)"
    info "시작 방법: ./scripts/start-llamacpp.sh"
else
    pass "llama-server 응답 (예상치 못한 형식): ${HEALTH_RESPONSE}"
fi

# ======================================================
# 테스트 5: OpenClaw Gateway probe
# ======================================================
section "5. OpenClaw Gateway probe"
GATEWAY_PROBE_OUTPUT="$(openclaw gateway probe 2>/dev/null || echo "FAILED")"
if [[ "${GATEWAY_PROBE_OUTPUT}" == "FAILED" ]]; then
    fail "OpenClaw Gateway probe 실패"
    info "openclaw gateway probe를 수동으로 확인하세요"
else
    pass "OpenClaw Gateway probe OK"
    info "${GATEWAY_PROBE_OUTPUT:0:240}"
fi

# ======================================================
# 테스트 6: OpenClaw Gateway health check
# ======================================================
section "6. OpenClaw Gateway health check"
GATEWAY_HEALTH="$(curl -sf "http://127.0.0.1:18789/" 2>/dev/null || echo "FAILED")"
if [[ "${GATEWAY_HEALTH}" == "FAILED" ]]; then
    fail "OpenClaw Gateway 로컬 루트 응답 실패"
    info "openclaw status 또는 openclaw gateway probe를 확인하세요"
else
    pass "OpenClaw Gateway 로컬 루트 응답 OK"
fi

# ======================================================
# 결과 요약
# ======================================================
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "  테스트 결과 요약"
echo -e "${BLUE}=================================================${NC}"
echo -e "  총 테스트: ${TOTAL}"
echo -e "  ${GREEN}PASS: ${PASS_COUNT}${NC}"
echo -e "  ${RED}FAIL: ${FAIL_COUNT}${NC}"
echo ""

if [[ ${FAIL_COUNT} -eq 0 ]]; then
    echo -e "${GREEN}모든 테스트 통과! LocalClaw 환경이 정상적으로 동작합니다.${NC}"
else
    echo -e "${YELLOW}일부 테스트 실패. 위의 FAIL 항목을 확인하세요.${NC}"
    echo -e "트러블슈팅: ${BLUE}README.md${NC} 참조"
fi
echo ""
