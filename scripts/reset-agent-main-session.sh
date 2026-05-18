#!/usr/bin/env bash
# agent:main:main 세션에 고정된 예전 workspaceDir 을 제거합니다 (다음 채팅에서 config.workspace 사용).
set -euo pipefail

SESSION_STORE="${OPENCLAW_SESSION_STORE:-${HOME}/.openclaw/agents/main/sessions/sessions.json}"
SESSION_KEY="${OPENCLAW_SESSION_KEY:-agent:main:main}"

if [[ ! -f "${SESSION_STORE}" ]]; then
  echo "No session store at ${SESSION_STORE} — nothing to reset."
  exit 0
fi

BACKUP="${SESSION_STORE}.bak.$(date +%Y%m%d%H%M%S)"
cp "${SESSION_STORE}" "${BACKUP}"
echo "Backed up: ${BACKUP}"

export SESSION_STORE SESSION_KEY
node <<'NODE'
const fs = require('fs');
const storePath = process.env.SESSION_STORE;
const key = process.env.SESSION_KEY;
const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
const entry = data[key];
if (!entry) {
  console.log(`Session ${key} not found — already clean.`);
  process.exit(0);
}
const jsonl = entry.sessionFile;
delete data[key];
fs.writeFileSync(storePath, JSON.stringify(data, null, 2) + '\n');
console.log(`Removed session ${key} from store.`);
if (jsonl && fs.existsSync(jsonl)) {
  const archived = jsonl + '.archived-' + Date.now();
  fs.renameSync(jsonl, archived);
  console.log(`Archived transcript: ${archived}`);
}
NODE

echo "Restart gateway: openclaw daemon restart"
