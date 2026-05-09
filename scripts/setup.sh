#!/usr/bin/env bash
set -euo pipefail

# 색상 정의
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

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  LocalClaw 환경 초기화 (Mac 전략 A)           ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# --------------------------------------------------
# 1. 의존성 확인
# --------------------------------------------------
log_info "의존성 확인 중..."

# Docker Desktop 실행 여부
if ! docker info &>/dev/null; then
    log_error "Docker Desktop이 실행 중이 아닙니다."
    log_warn  "Docker Desktop을 시작하고 다시 실행해주세요: open -a Docker"
    exit 1
fi
log_success "Docker Desktop 실행 중"

# brew
if ! command -v brew &>/dev/null; then
    log_error "Homebrew가 설치되지 않았습니다."
    log_warn  "설치: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
log_success "Homebrew 설치됨"

# cmake
if ! command -v cmake &>/dev/null; then
    log_warn "cmake가 없습니다. 설치합니다..."
    brew install cmake
fi
log_success "cmake 설치됨"

# python3
if ! command -v python3 &>/dev/null; then
    log_error "python3가 없습니다. brew install python 으로 설치하세요."
    exit 1
fi
log_success "python3 설치됨"

# --------------------------------------------------
# 2. .env 파일 생성
# --------------------------------------------------
ENV_FILE="${ROOT_DIR}/.env"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"

if [[ ! -f "${ENV_FILE}" ]]; then
    log_info ".env 파일을 생성합니다..."
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"

    CURRENT_USER="$(whoami)"
    # macOS의 sed는 -i '' 필요
    sed -i '' "s/REPLACE_WITH_YOUR_USERNAME/${CURRENT_USER}/g" "${ENV_FILE}"

    # OPENCLAW_GATEWAY_TOKEN 자동 생성
    GENERATED_TOKEN="$(openssl rand -hex 32)"
    sed -i '' "s|^OPENCLAW_GATEWAY_TOKEN=.*|OPENCLAW_GATEWAY_TOKEN=${GENERATED_TOKEN}|" "${ENV_FILE}"

    log_success ".env 파일 생성 완료 (${ENV_FILE})"
    log_info  "생성된 게이트웨이 토큰: ${GENERATED_TOKEN}"
else
    log_success ".env 파일이 이미 존재합니다: ${ENV_FILE}"
fi

# .env 로드
# shellcheck source=/dev/null
source "${ENV_FILE}"

# --------------------------------------------------
# 3. 필요 디렉토리 생성
# --------------------------------------------------
log_info "필요 디렉토리 생성 중..."

OPENCLAW_CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-${HOME}/.openclaw}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-${HOME}/.openclaw/workspace}"
MODELS_DIR="${MODELS_DIR:-${HOME}/models}"

mkdir -p "${OPENCLAW_CONFIG_DIR}"
mkdir -p "${OPENCLAW_WORKSPACE_DIR}"
mkdir -p "${OPENCLAW_CONFIG_DIR}/config"
mkdir -p "${MODELS_DIR}"

log_success "디렉토리 생성 완료:"
log_success "  - ${OPENCLAW_CONFIG_DIR}"
log_success "  - ${OPENCLAW_WORKSPACE_DIR}"
log_success "  - ${MODELS_DIR}"

# --------------------------------------------------
# 4. OpenClaw config 복사
# --------------------------------------------------
CONFIG_SRC="${ROOT_DIR}/config/openclaw.json"
CONFIG_DST="${OPENCLAW_CONFIG_DIR}/config/openclaw.json"

if [[ ! -f "${CONFIG_DST}" ]]; then
    cp "${CONFIG_SRC}" "${CONFIG_DST}"
    log_success "openclaw.json 설정 파일 복사 완료: ${CONFIG_DST}"
else
    log_success "openclaw.json 이미 존재: ${CONFIG_DST}"
fi

# --------------------------------------------------
# 5. llama.cpp 레포 확인
# --------------------------------------------------
LLAMACPP_DIR="${LLAMACPP_DIR:-${HOME}/llama.cpp}"

if [[ ! -d "${LLAMACPP_DIR}" ]]; then
    log_warn "llama.cpp 레포가 없습니다: ${LLAMACPP_DIR}"
    echo -e "${YELLOW}llama.cpp를 클론하시겠습니까? (Y/n)${NC}"
    read -r CLONE_ANSWER
    CLONE_ANSWER="${CLONE_ANSWER:-Y}"
    if [[ "${CLONE_ANSWER}" =~ ^[Yy]$ ]]; then
        log_info "llama.cpp 클론 중..."
        git clone https://github.com/ggml-org/llama.cpp "${LLAMACPP_DIR}"
        log_success "llama.cpp 클론 완료"
    else
        log_warn "llama.cpp 클론을 건너뜁니다. 수동으로 설치하세요:"
        log_warn "  git clone https://github.com/ggml-org/llama.cpp ${LLAMACPP_DIR}"
    fi
fi

# --------------------------------------------------
# 6. llama.cpp 빌드
# --------------------------------------------------
LLAMA_SERVER="${LLAMACPP_DIR}/build/bin/llama-server"

if [[ ! -f "${LLAMA_SERVER}" ]]; then
    echo -e "${YELLOW}llama.cpp를 빌드하시겠습니까? (Metal GPU 가속, 약 2-5분 소요) (Y/n)${NC}"
    read -r BUILD_ANSWER
    BUILD_ANSWER="${BUILD_ANSWER:-Y}"
    if [[ "${BUILD_ANSWER}" =~ ^[Yy]$ ]]; then
        "${SCRIPT_DIR}/build-llamacpp.sh"
    else
        log_warn "빌드를 건너뜁니다. 나중에 ./scripts/build-llamacpp.sh 를 실행하세요."
    fi
else
    log_success "llama-server 바이너리 이미 존재: ${LLAMA_SERVER}"
fi

# --------------------------------------------------
# 7. 모델 파일 확인
# --------------------------------------------------
MODEL_FILE="${MODEL_FILE:-gemma-4-E4B-it-Q6_K.gguf}"
MODEL_PATH="${MODELS_DIR}/${MODEL_FILE}"

if [[ ! -f "${MODEL_PATH}" ]]; then
    log_warn "모델 파일이 없습니다: ${MODEL_PATH}"
    echo -e "${YELLOW}Gemma 4 E4B GGUF 모델을 다운로드하시겠습니까? (약 3.5GB) (Y/n)${NC}"
    read -r DL_ANSWER
    DL_ANSWER="${DL_ANSWER:-Y}"
    if [[ "${DL_ANSWER}" =~ ^[Yy]$ ]]; then
        "${SCRIPT_DIR}/download-model.sh"
    else
        log_warn "다운로드를 건너뜁니다. 나중에 ./scripts/download-model.sh 를 실행하세요."
    fi
else
    log_success "모델 파일 존재: $(du -sh "${MODEL_PATH}" | cut -f1) - ${MODEL_PATH}"
fi

# --------------------------------------------------
# 8. Docker 이미지 pull
# --------------------------------------------------
log_info "OpenClaw Docker 이미지 pulling..."
OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}"
docker pull "${OPENCLAW_IMAGE}"
log_success "Docker 이미지 pull 완료"

# --------------------------------------------------
# 9. Docker Compose 시작
# --------------------------------------------------
log_info "OpenClaw 컨테이너 시작 중..."
cd "${ROOT_DIR}"
docker compose up -d
log_success "OpenClaw 컨테이너 시작됨"

# --------------------------------------------------
# 완료 메시지
# --------------------------------------------------
echo ""
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}  초기화 완료!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "다음 단계:"
echo -e "  ${YELLOW}1.${NC} llama-server 시작:   ${BLUE}./scripts/start-llamacpp.sh${NC}"
echo -e "  ${YELLOW}2.${NC} 연결 테스트:         ${BLUE}./scripts/test-connection.sh${NC}"
echo -e "  ${YELLOW}3.${NC} OpenClaw 상태 확인:  ${BLUE}docker compose ps${NC}"
echo -e "  ${YELLOW}4.${NC} OpenClaw 로그:        ${BLUE}docker compose logs -f openclaw-gateway${NC}"
echo ""
echo -e "포트 정보:"
echo -e "  llama-server:    ${GREEN}http://127.0.0.1:8080${NC}"
echo -e "  OpenClaw:        ${GREEN}http://127.0.0.1:18789${NC}"
echo ""
