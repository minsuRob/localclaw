#!/usr/bin/env bash
# Copies scripts/patches/openclaw-http-endpoint-helpers-cors.js over the active OpenClaw
# gateway helper so GitHub Pages (cross-origin) can call /v1/chat/completions.
# Requires: Homebrew OpenClaw at $(brew --prefix)/lib/node_modules/openclaw
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH_SRC="${ROOT}/scripts/patches/openclaw-http-endpoint-helpers-cors.js"
PREFIX="$(brew --prefix 2>/dev/null || true)"
if [[ -z "${PREFIX}" ]]; then
  echo "brew --prefix failed" >&2
  exit 1
fi
OPENCLAW_DIST="${PREFIX}/lib/node_modules/openclaw/dist"
if [[ ! -d "${OPENCLAW_DIST}" ]]; then
  echo "OpenClaw dist not found at ${OPENCLAW_DIST}" >&2
  exit 1
fi
shopt -s nullglob
matches=( "${OPENCLAW_DIST}"/http-endpoint-helpers-*.js )
if [[ ${#matches[@]} -ne 1 ]]; then
  echo "Expected exactly one http-endpoint-helpers-*.js in ${OPENCLAW_DIST}, got ${#matches[@]}" >&2
  exit 1
fi
TARGET="${matches[0]}"
cp "${PATCH_SRC}" "${TARGET}"
echo "Patched ${TARGET}"
echo "Restart gateway: openclaw daemon restart"
