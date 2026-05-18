#!/usr/bin/env bash
# apps/chat-web 빌드 검증 후 main push → GitHub Pages workflow
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMMIT_MSG="${1:-chore(chat-web): update and deploy to GitHub Pages}"

log_info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok() { echo -e "${GREEN}[OK]${NC}    $*"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

cd "${ROOT_DIR}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  :
else
  log_info "No unstaged changes; continuing if you want to re-trigger deploy only"
fi

log_info "Building apps/chat-web..."
(cd apps/chat-web && npm run build)
log_ok "Build succeeded"

log_info "Staging apps/chat-web and related workflow..."
git add apps/chat-web .github/workflows/deploy.yml 2>/dev/null || git add apps/chat-web

if git diff --cached --quiet; then
  log_err "Nothing staged to commit. Make changes under apps/chat-web/ first."
  exit 1
fi

git commit -m "${COMMIT_MSG}"
log_ok "Committed"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  log_err "Current branch is '${CURRENT_BRANCH}', not main. Push manually if intentional."
  exit 1
fi

git push origin main
log_ok "Pushed to origin/main — GitHub Actions should deploy Pages"

if command -v gh &>/dev/null; then
  log_info "Recent workflow runs:"
  gh run list --workflow=deploy.yml --limit 3 2>/dev/null || true
fi
