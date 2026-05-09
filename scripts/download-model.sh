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

# .env 로드
ENV_FILE="${ROOT_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck source=/dev/null
    set -a; source "${ENV_FILE}"; set +a
fi

MODELS_DIR="${MODELS_DIR:-${HOME}/models}"
MODEL_REPO="${MODEL_REPO:-unsloth/gemma-4-E4B-it-GGUF}"
MODEL_FILE="${MODEL_FILE:-gemma-4-E4B-it-Q6_K.gguf}"

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  Gemma 4 E4B GGUF 모델 다운로드               ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
log_info "레포:  ${MODEL_REPO}"
log_info "파일:  ${MODEL_FILE}"
log_info "저장:  ${MODELS_DIR}"
echo ""

# --------------------------------------------------
# huggingface_hub 확인 / 설치
# --------------------------------------------------
if ! python3 -c "import huggingface_hub" &>/dev/null; then
    log_warn "huggingface_hub 패키지가 없습니다. 설치합니다..."
    pip3 install --quiet huggingface_hub
    log_success "huggingface_hub 설치 완료"
fi

# huggingface-cli 확인
if ! command -v huggingface-cli &>/dev/null; then
    log_warn "huggingface-cli를 PATH에서 찾을 수 없습니다. pip으로 재설치합니다..."
    pip3 install --quiet --upgrade huggingface_hub
fi

# --------------------------------------------------
# 모델 디렉토리 생성
# --------------------------------------------------
mkdir -p "${MODELS_DIR}"
log_success "모델 디렉토리: ${MODELS_DIR}"

# --------------------------------------------------
# 이미 존재하면 건너뜀
# --------------------------------------------------
MODEL_PATH="${MODELS_DIR}/${MODEL_FILE}"
if [[ -f "${MODEL_PATH}" ]]; then
    FILE_SIZE="$(du -sh "${MODEL_PATH}" | cut -f1)"
    log_success "모델 파일이 이미 존재합니다: ${MODEL_PATH} (${FILE_SIZE})"
    echo ""
    exit 0
fi

# --------------------------------------------------
# 다운로드
# --------------------------------------------------
log_info "다운로드 시작... (Q6_K는 약 3.5GB, 네트워크 속도에 따라 수분~수십분 소요)"
echo ""

huggingface-cli download \
    "${MODEL_REPO}" \
    "${MODEL_FILE}" \
    --local-dir "${MODELS_DIR}"

# --------------------------------------------------
# 결과 확인
# --------------------------------------------------
if [[ -f "${MODEL_PATH}" ]]; then
    FILE_SIZE="$(du -sh "${MODEL_PATH}" | cut -f1)"
    echo ""
    log_success "다운로드 완료!"
    echo -e "  파일: ${GREEN}${MODEL_PATH}${NC}"
    echo -e "  크기: ${GREEN}${FILE_SIZE}${NC}"
    echo ""
else
    log_error "다운로드 실패: ${MODEL_PATH} 파일을 찾을 수 없습니다."
    exit 1
fi

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  모델 다운로드 완료!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "다음 단계: ${BLUE}./scripts/start-llamacpp.sh${NC}"
echo ""
