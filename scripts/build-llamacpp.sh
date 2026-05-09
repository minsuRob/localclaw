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

LLAMACPP_DIR="${LLAMACPP_DIR:-${HOME}/llama.cpp}"

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  llama.cpp 빌드 (Apple Metal GPU 가속)         ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# --------------------------------------------------
# 레포 확인 / 클론
# --------------------------------------------------
if [[ ! -d "${LLAMACPP_DIR}" ]]; then
    log_info "llama.cpp 레포가 없습니다. 클론합니다..."
    git clone https://github.com/ggml-org/llama.cpp "${LLAMACPP_DIR}"
    log_success "클론 완료: ${LLAMACPP_DIR}"
else
    log_success "llama.cpp 레포 존재: ${LLAMACPP_DIR}"
    log_info "최신 코드로 업데이트 중..."
    cd "${LLAMACPP_DIR}" && git pull --ff-only || log_warn "git pull 실패 (로컬 변경사항이 있을 수 있음)"
fi

# --------------------------------------------------
# cmake 설치 확인
# --------------------------------------------------
if ! command -v cmake &>/dev/null; then
    log_error "cmake가 없습니다: brew install cmake"
    exit 1
fi

CPU_COUNT="$(sysctl -n hw.logicalcpu 2>/dev/null || echo 4)"
log_info "사용할 CPU 코어 수: ${CPU_COUNT}"

# --------------------------------------------------
# 빌드
# --------------------------------------------------
cd "${LLAMACPP_DIR}"

log_info "CMake 설정 중 (Metal GPU 가속 활성화)..."
cmake -B build \
    -DGGML_METAL=ON \
    -DCMAKE_BUILD_TYPE=Release

log_info "빌드 중... (약 2-5분 소요)"
cmake --build build --config Release -j"${CPU_COUNT}"

# --------------------------------------------------
# 빌드 결과 확인
# --------------------------------------------------
LLAMA_SERVER="${LLAMACPP_DIR}/build/bin/llama-server"

if [[ -f "${LLAMA_SERVER}" ]]; then
    log_success "빌드 성공!"
    echo ""
    echo -e "  바이너리 위치: ${GREEN}${LLAMA_SERVER}${NC}"
    echo -e "  버전 정보:"
    "${LLAMA_SERVER}" --version 2>/dev/null || true
    echo ""
else
    log_error "빌드 실패: ${LLAMA_SERVER} 파일이 없습니다."
    log_error "빌드 로그를 확인하세요."
    exit 1
fi

echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  llama.cpp 빌드 완료!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "다음 단계: ${BLUE}./scripts/start-llamacpp.sh${NC}"
echo ""
