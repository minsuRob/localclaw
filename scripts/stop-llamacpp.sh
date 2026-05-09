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

echo ""
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  llama-server 종료                             ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# --------------------------------------------------
# PID 파일 확인
# --------------------------------------------------
if [[ ! -f "${PID_FILE}" ]]; then
    log_warn "PID 파일이 없습니다: ${PID_FILE}"
    log_warn "llama-server가 실행 중이지 않을 수 있습니다."

    # 혹시 실행 중인 llama-server 프로세스 직접 확인
    if pgrep -x "llama-server" &>/dev/null; then
        log_warn "하지만 llama-server 프로세스가 감지되었습니다. 강제 종료합니다..."
        pkill -x "llama-server" || true
        log_success "llama-server 프로세스 종료 완료"
    else
        log_info "실행 중인 llama-server 프로세스가 없습니다."
    fi
    exit 0
fi

# --------------------------------------------------
# PID로 종료
# --------------------------------------------------
SERVER_PID="$(cat "${PID_FILE}")"
log_info "종료할 PID: ${SERVER_PID}"

if kill -0 "${SERVER_PID}" 2>/dev/null; then
    log_info "SIGTERM 신호 전송 중..."
    kill -TERM "${SERVER_PID}"

    # 최대 10초 대기
    WAIT=0
    while kill -0 "${SERVER_PID}" 2>/dev/null && [[ ${WAIT} -lt 10 ]]; do
        printf "."
        sleep 1
        WAIT=$((WAIT + 1))
    done
    echo ""

    if kill -0 "${SERVER_PID}" 2>/dev/null; then
        log_warn "SIGTERM 후에도 프로세스가 실행 중입니다. SIGKILL 전송..."
        kill -KILL "${SERVER_PID}" || true
        sleep 1
    fi

    if kill -0 "${SERVER_PID}" 2>/dev/null; then
        log_error "프로세스 종료 실패 (PID: ${SERVER_PID})"
        exit 1
    fi

    log_success "llama-server 종료 완료 (PID: ${SERVER_PID})"
else
    log_warn "PID ${SERVER_PID}는 이미 실행 중이 아닙니다."
fi

# --------------------------------------------------
# PID 파일 삭제
# --------------------------------------------------
rm -f "${PID_FILE}"
log_success "PID 파일 삭제: ${PID_FILE}"

echo ""
echo -e "재시작하려면: ${BLUE}./scripts/start-llamacpp.sh${NC}"
echo ""
