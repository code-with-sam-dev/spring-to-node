#!/bin/sh
# Episode 11. Reproduces every figure the uploads and downloads act puts on
# screen, from BOTH stacks.
#
#   ./scripts/verify-uploads.sh
#
# Standing rule: a number that cannot be produced by a command in this
# repository does not go on screen.

set -e
cd "$(dirname "$0")/.."

echo "=== versions, so every figure is attributable ==="
echo "node    $(node -v 2>/dev/null || echo 'not on PATH')"
echo "multer  $(node -p "require('./nestjs-api/node_modules/multer/package.json').version" 2>/dev/null || echo '?')"
date -u +"run     %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: where MultipartFile draws the line with nothing configured ==="
if docker compose ps postgres 2>/dev/null | grep -q 'Up\|running'; then
  ./scripts/test-spring.sh Ep10UploadTest 2>&1 | grep -E '=== Spring|KB  ->|MB  ->'
  echo
  echo "=== Spring: byte[] against FileSystemResource, same 50 MB file ==="
  ./scripts/test-spring.sh Ep10DownloadTest 2>&1 | grep -E '=== Spring|heap |after |NOTE|        '
else
  echo "  SKIPPED: the database is not up. Run: docker compose up -d" >&2
fi
echo

echo "=== NestJS: the same two uploads, and what they cost the process ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep10-uploads/no-limit.ts src/ep10-uploads/download.ts \
       --outDir dist/ep10-uploads --experimentalDecorators --emitDecoratorMetadata \
       --module nodenext --moduleResolution nodenext --target es2023 \
       --skipLibCheck --types node \
  && node dist/ep10-uploads/no-limit.js )
echo

echo "=== NestJS: sending 50 MB back, buffered against streamed ==="
( cd nestjs-api && node dist/ep10-uploads/download.js )
echo

echo "=== NestJS: diskStorage and a limit, which is what Spring had for free ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep10-uploads/bounded.ts --outDir dist/ep10-uploads \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep10-uploads/bounded.js )
