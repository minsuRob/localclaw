#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

PID_FILE="${ROOT_DIR}/llamacpp-server.pid"
LOG_FILE="/tmp/llamacpp-server.log"

# .env 로드
ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck source=/dev/null
    set -a; source "${ENV_FILE}"; set +a
else
    log_error ".env 파일이 없습니다. setup.sh를 먼저 실행하세요."
    exit 1
fi

LLAMACPP_DIR="${LLAMACPP_DIR:-${HOME}/llama.cpp}"
LLAMACPP_HOST="${LLAMACPP_HOST:-0.0.0.0}"
LLAMACPP_PORT="${LLAMACPP_PORT:-8080}"
MODEL_FILE="${MODEL_FILE:-gemma-4-E4B-it-Q6_K.gguf}"
LLAMACPP_MODEL="${LLAMACPP_MODEL:-}"
LLAMACPP_CTX_SIZE="${LLAMACPP_CTX_SIZE:-32768}"
LLAMACPP_N_GPU_LAYERS="${LLAMACPP_N_GPU_LAYERS:-99}"
LLAMACPP_BATCH_SIZE="${LLAMACPP_BATCH_SIZE:-512}"
LLAMACPP_UBATCH_SIZE="${LLAMACPP_UBATCH_SIZE:-512}"

resolve_model_path() {
    local requested="$1"
    local candidate

    if [[ -n "${requested}" && -f "${requested}" ]]; then
        printf '%s\n' "${requested}"
        return 0
    fi

    for candidate in \
        "${ROOT_DIR}/model/${MODEL_FILE}" \
        "${HOME}/models/${MODEL_FILE}"
    do
        if [[ -f "${candidate}" ]]; then
            printf '%s\n' "${candidate}"
            return 0
        fi
    done

    printf '%s\n' "${requested:-${ROOT_DIR}/model/${MODEL_FILE}}"
}

if [[ -n "${LLAMACPP_MODEL}" && ! -f "${LLAMACPP_MODEL}" ]]; then
    log_warn "지정한 모델 경로를 찾지 못해 기본 후보를 탐색합니다: ${LLAMACPP_MODEL}"
fi
LLAMACPP_MODEL="$(resolve_model_path "${LLAMACPP_MODEL}")"

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  llama-server 시작 (Apple Metal)               ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# --------------------------------------------------
# 이미 실행 중인지 확인
# --------------------------------------------------
if [[ -f "${PID_FILE}" ]]; then
    EXISTING_PID="$(cat "${PID_FILE}")"
    if kill -0 "${EXISTING_PID}" 2>/dev/null; then
        log_warn "llama-server가 이미 실행 중입니다 (PID: ${EXISTING_PID})"
        log_warn "중지하려면: ./scripts/stop-llamacpp.sh"
        exit 0
    else
        log_warn "오래된 PID 파일을 삭제합니다: ${PID_FILE}"
        rm -f "${PID_FILE}"
    fi
fi

# --------------------------------------------------
# 모델 파일 확인
# --------------------------------------------------
if [[ ! -f "${LLAMACPP_MODEL}" ]]; then
    log_error "모델 파일이 없습니다: ${LLAMACPP_MODEL}"
    log_error "다운로드: ./scripts/download-model.sh"
    exit 1
fi
log_success "모델 파일 확인: $(du -sh "${LLAMACPP_MODEL}" | cut -f1) - ${LLAMACPP_MODEL}"

# --------------------------------------------------
# llama-server 바이너리 확인
# --------------------------------------------------
LLAMA_SERVER="${LLAMACPP_DIR}/build/bin/llama-server"
if [[ ! -f "${LLAMA_SERVER}" ]]; then
    log_error "llama-server 바이너리가 없습니다: ${LLAMA_SERVER}"
    log_error "빌드: ./scripts/build-llamacpp.sh"
    exit 1
fi
log_success "llama-server 바이너리 확인: ${LLAMA_SERVER}"

# --------------------------------------------------
# THREADS 자동 감지
# --------------------------------------------------
if [[ -z "${LLAMACPP_THREADS:-}" ]]; then
    LLAMACPP_THREADS="$(sysctl -n hw.physicalcpu 2>/dev/null || echo 4)"
    log_info "LLAMACPP_THREADS 자동 감지: ${LLAMACPP_THREADS} (물리 코어)"
else
    log_info "LLAMACPP_THREADS: ${LLAMACPP_THREADS} (.env에서 로드)"
fi

# --------------------------------------------------
# 서버 시작 (백그라운드)
# --------------------------------------------------
log_info "llama-server 시작 중..."
log_info "로그: ${LOG_FILE}"
echo ""

# LLAMACPP_EXTRA_ARGS: 공백 구분 추가 인자 (예: --jinja). 모델·llama.cpp 버전에 따라 도구/채팅 템플릿 지원이 달라집니다.
LLAMACPP_EXTRA_ARR=()
if [[ -n "${LLAMACPP_EXTRA_ARGS:-}" ]]; then
    read -r -a LLAMACPP_EXTRA_ARR <<< "${LLAMACPP_EXTRA_ARGS}"
fi

nohup "${LLAMA_SERVER}" \
    --model "${LLAMACPP_MODEL}" \
    --host "${LLAMACPP_HOST}" \
    --port "${LLAMACPP_PORT}" \
    --ctx-size "${LLAMACPP_CTX_SIZE}" \
    --n-gpu-layers "${LLAMACPP_N_GPU_LAYERS}" \
    --threads "${LLAMACPP_THREADS}" \
    --batch-size "${LLAMACPP_BATCH_SIZE}" \
    --ubatch-size "${LLAMACPP_UBATCH_SIZE}" \
    --flash-attn auto \
    "${LLAMACPP_EXTRA_ARR[@]}" \
    > "${LOG_FILE}" 2>&1 &

SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"
log_info "서버 PID: ${SERVER_PID}, PID 파일: ${PID_FILE}"

# --------------------------------------------------
# Health check 대기 (최대 30초)
# --------------------------------------------------
log_info "서버 준비 대기 중..."
MAX_RETRIES=30
RETRY=0
HEALTH_URL="http://127.0.0.1:${LLAMACPP_PORT}/health"

while [[ ${RETRY} -lt ${MAX_RETRIES} ]]; do
    if curl -sf "${HEALTH_URL}" &>/dev/null; then
        echo ""
        log_success "llama-server 시작 완료!"
        echo ""
        echo -e "  ${GREEN}PID:${NC}    ${SERVER_PID}"
        echo -e "  ${GREEN}포트:${NC}   ${LLAMACPP_PORT}"
        echo -e "  ${GREEN}모델:${NC}   $(basename "${LLAMACPP_MODEL}")"
        echo -e "  ${GREEN}API:${NC}    http://127.0.0.1:${LLAMACPP_PORT}/v1"
        echo -e "  ${GREEN}로그:${NC}   ${LOG_FILE}"
        echo ""
        echo -e "연결 테스트: ${BLUE}./scripts/test-connection.sh${NC}"
        echo ""
        exit 0
    fi

    # 프로세스가 죽었는지 확인
    if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
        echo ""
        log_error "llama-server가 예상치 못하게 종료되었습니다."
        log_error "로그 확인: cat ${LOG_FILE}"
        echo ""
        tail -20 "${LOG_FILE}" || true
        rm -f "${PID_FILE}"
        exit 1
    fi

    RETRY=$((RETRY + 1))
    printf "."
    sleep 1
done

echo ""
log_error "30초 내에 서버가 응답하지 않습니다."
log_error "로그 확인: cat ${LOG_FILE}"
exit 1
