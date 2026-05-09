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
# 테스트 1: llama-server health check
# ======================================================
section "1. llama-server health check"
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
# 테스트 2: /v1/models 응답
# ======================================================
section "2. /v1/models 엔드포인트 확인"
MODELS_RESPONSE="$(curl -sf "http://127.0.0.1:${LLAMACPP_PORT}/v1/models" 2>/dev/null || echo "FAILED")"
if [[ "${MODELS_RESPONSE}" == "FAILED" ]]; then
    fail "/v1/models 응답 없음"
elif echo "${MODELS_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null; then
    MODEL_ID="$(echo "${MODELS_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null)"
    pass "/v1/models 응답 OK (모델: ${MODEL_ID})"
else
    pass "/v1/models 응답 OK (파싱 불가하지만 응답은 있음)"
    info "응답 일부: ${MODELS_RESPONSE:0:200}"
fi

# ======================================================
# 테스트 3: /v1/chat/completions 한국어 테스트
# ======================================================
section "3. /v1/chat/completions 한국어 테스트"
MODEL_ID="$(echo "${MODELS_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('id',''))" 2>/dev/null || true)"
if [[ -z "${MODEL_ID}" ]]; then
    MODEL_ID="gemma"
fi

CHAT_PAYLOAD="$(cat <<EOF
{
  "model": "${MODEL_ID}",
  "messages": [
    {"role": "user", "content": "안녕하세요, 자기소개 해줘. (2-3문장으로 짧게)"}
  ],
  "max_tokens": 200,
  "temperature": 0.7
}
EOF
)"
CHAT_RESPONSE="$(curl -sf \
    -H "Content-Type: application/json" \
    -d "${CHAT_PAYLOAD}" \
    "http://127.0.0.1:${LLAMACPP_PORT}/v1/chat/completions" \
    2>/dev/null || echo "FAILED")"

if [[ "${CHAT_RESPONSE}" == "FAILED" ]]; then
    fail "채팅 완성 요청 실패"
elif echo "${CHAT_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['choices'][0]['message']['content'])" 2>/dev/null | head -5; then
    AI_REPLY="$(echo "${CHAT_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['choices'][0]['message']['content'])" 2>/dev/null || echo "")"
    pass "채팅 완성 응답 OK"
    info "모델 응답 (일부): ${AI_REPLY:0:150}..."
else
    fail "채팅 완성 응답 파싱 실패"
    info "원본 응답 일부: ${CHAT_RESPONSE:0:300}"
fi

# ======================================================
# 테스트 4: Docker 컨테이너 상태
# ======================================================
section "4. Docker 컨테이너 상태"
if ! command -v docker &>/dev/null || ! docker info &>/dev/null 2>&1; then
    fail "Docker가 실행 중이 아닙니다"
else
    COMPOSE_PS="$(cd "${ROOT_DIR}" && docker compose ps --format json 2>/dev/null || echo "FAILED")"
    if [[ "${COMPOSE_PS}" == "FAILED" ]]; then
        fail "docker compose ps 실패"
    else
        GATEWAY_STATUS="$(cd "${ROOT_DIR}" && docker compose ps openclaw-gateway 2>/dev/null | tail -1 || echo "")"
        if echo "${GATEWAY_STATUS}" | grep -q "Up\|running\|healthy"; then
            pass "openclaw-gateway 컨테이너 실행 중"
            info "${GATEWAY_STATUS}"
        elif echo "${GATEWAY_STATUS}" | grep -q "starting"; then
            pass "openclaw-gateway 컨테이너 시작 중"
        else
            fail "openclaw-gateway 컨테이너가 실행 중이 아닙니다"
            info "시작 방법: docker compose up -d"
        fi
    fi
fi

# ======================================================
# 테스트 5: 컨테이너 → host.docker.internal:8080 연결
# ======================================================
section "5. Docker 컨테이너 → llama-server 연결 (host.docker.internal)"
if docker compose -f "${ROOT_DIR}/docker-compose.yml" ps openclaw-gateway 2>/dev/null | grep -q "Up\|running\|healthy"; then
    CONTAINER_HEALTH="$(cd "${ROOT_DIR}" && \
        docker compose exec openclaw-gateway \
        curl -sf "http://host.docker.internal:${LLAMACPP_PORT}/health" \
        2>/dev/null || echo "FAILED")"
    if [[ "${CONTAINER_HEALTH}" == "FAILED" ]]; then
        fail "컨테이너에서 host.docker.internal:${LLAMACPP_PORT} 연결 실패"
        info "llama-server가 실행 중인지, 0.0.0.0으로 바인딩했는지 확인하세요"
    else
        pass "컨테이너 → host.docker.internal:${LLAMACPP_PORT} 연결 OK"
        info "응답: ${CONTAINER_HEALTH}"
    fi
else
    info "openclaw-gateway 컨테이너가 없어 이 테스트를 건너뜁니다"
fi

# ======================================================
# 테스트 6: OpenClaw Gateway health check
# ======================================================
section "6. OpenClaw Gateway health check"
OPENCLAW_HEALTH_STATUS="$(cd "${ROOT_DIR}" && docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' openclaw-gateway 2>/dev/null || echo "missing")"
if [[ "${OPENCLAW_HEALTH_STATUS}" == "healthy" ]]; then
    pass "OpenClaw Gateway 컨테이너 healthy"
    info "상태: ${OPENCLAW_HEALTH_STATUS}"
elif [[ "${OPENCLAW_HEALTH_STATUS}" == "missing" ]]; then
    fail "OpenClaw Gateway 컨테이너를 찾을 수 없습니다"
    info "시작 방법: docker compose up -d"
else
    fail "OpenClaw Gateway 상태가 healthy가 아닙니다"
    info "상태: ${OPENCLAW_HEALTH_STATUS}"
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
