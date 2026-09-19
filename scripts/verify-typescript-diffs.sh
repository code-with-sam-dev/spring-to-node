#!/usr/bin/env bash
# Every claim episode 2 makes about TypeScript, run rather than asserted.
#
# Each demo ASSERTS its own claim before printing it, so a wrong claim fails
# here instead of reaching a video. If this script exits 0, every sentence in
# the episode about the language is true on the version printed below.
set -euo pipefail
cd "$(dirname "$0")/../node-basics"

echo "TypeScript $(npx tsc --version | awk '{print $2}')   Node $(node --version)"
echo

rm -rf dist-ep02
npx tsc --ignoreConfig src/ep02/*.ts --outDir dist-ep02 \
  --target es2022 --module nodenext --moduleResolution nodenext --strict --types node
echo "compiled clean"
echo

for f in dist-ep02/*.js; do
  echo "=== $(basename "$f" .js) ==="
  node "$f"
  echo
done

echo "all demos passed their own assertions"
