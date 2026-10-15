#!/usr/bin/env bash
# Commit pipeline-owned files and push to main, rebasing over concurrent pushes.
set -euo pipefail
message="$1"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -- scenery content.js
if git diff --cached --quiet; then echo "nothing to commit"; exit 0; fi
git commit -m "$message"
for attempt in 1 2 3 4 5; do
  if git push origin HEAD:main; then exit 0; fi
  sleep $((attempt * 3))
  git pull --rebase origin main
done
echo "push failed" >&2
exit 1
