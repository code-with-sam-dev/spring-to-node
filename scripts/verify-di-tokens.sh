#!/usr/bin/env bash
# Episode 1, beat 3: you cannot inject a TypeScript interface, and why.
#
# Episode 0 measured that an interface compiles to nothing. This script measures
# the consequence, which is the thing a Spring developer actually hits: the most
# ordinary constructor injection in Spring will not start a NestJS container.
#
# Both demos ASSERT their own claim before printing it, so a wrong sentence in
# the episode fails here rather than reaching a video. If this exits 0, every
# claim beat 3 makes is true on the versions printed below.
set -euo pipefail
cd "$(dirname "$0")/../nestjs-api"

# Compiled INSIDE the project, not into a temp dir, so Node resolves
# node_modules normally. dist/ is already gitignored.
OUT="dist/ep01-di"

echo "TypeScript $(npx tsc --version | awk '{print $2}')   Node $(node --version)   NestJS $(node -p "JSON.parse(require('fs').readFileSync('package.json')).dependencies['@nestjs/core']")"
echo

rm -rf "$OUT"
# --ignoreConfig because naming files on the command line otherwise collides
# with the project tsconfig (TS5112). The flags below are what nest-cli passes.
npx tsc --ignoreConfig src/ep01-di/*.ts --outDir "$OUT" \
  --experimentalDecorators --emitDecoratorMetadata \
  --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck
echo "compiled clean, both files"
echo

echo "=== 1. Injecting by interface: what Spring does every day ==="
node "$OUT/by-type.js"
echo

echo "=== 2. The same container, injecting by symbol token ==="
node "$OUT/with-token.js"
echo

echo "=== 3. What the compiler emitted, which is the whole explanation ==="
BY_HITS=$(grep -c 'PaymentGateway' "$OUT/by-type.js" || true)
TOK_HITS=$(grep -c 'PaymentGateway' "$OUT/with-token.js" || true)
echo "the interface's name, in the compiled output:"
echo "  by-type.js     $BY_HITS occurrences. The interface is gone without trace."
echo "  with-token.js  $TOK_HITS occurrence, and it is the string label inside"
echo "                 Symbol(...), which is a value rather than a type."
echo
echo "the metadata Nest reads to decide what to inject:"
echo "  by-type.js     $(grep -o 'design:paramtypes", \[[^]]*\]' "$OUT/by-type.js" | head -1)"
echo "  the declared parameter type was an interface. What survived is Object,"
echo "  and Object is not something the container has a provider for."
echo
# The zero is the whole point, so the script fails rather than prints a wrong one.
if [ "$BY_HITS" != "0" ]; then
  echo "CLAIM FAILED: expected the interface to be absent from by-type.js" >&2
  exit 1
fi

echo "beat 3 verified: every claim asserted by the demo that prints it"
