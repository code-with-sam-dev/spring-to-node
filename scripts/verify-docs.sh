#!/bin/sh
# Episode 10. Reproduces every figure the API docs act puts on screen, from
# BOTH stacks.
#
#   ./scripts/verify-docs.sh
#
# Standing rule: a number that cannot be produced by a command in this
# repository does not go on screen.

set -e
cd "$(dirname "$0")/.."

echo "=== versions, so every figure is attributable ==="
echo "node            $(node -v 2>/dev/null || echo 'not on PATH')"
echo "@nestjs/swagger $(node -p "require('./nestjs-api/node_modules/@nestjs/swagger/package.json').version" 2>/dev/null || echo '?')"
echo "springdoc       3.1.1 (pinned in spring-boot-api/pom.xml)"
date -u +"run             %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== NestJS: what a typed, validated DTO documents by itself ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep09-docs/erased.ts src/ep09-docs/annotated.ts \
       --outDir dist/ep09-docs --experimentalDecorators --emitDecoratorMetadata \
       --module nodenext --moduleResolution nodenext --target es2023 \
       --skipLibCheck --types node \
  && node dist/ep09-docs/erased.js )
echo

echo "=== NestJS: the same DTO with ApiProperty written out by hand ==="
( cd nestjs-api && node dist/ep09-docs/annotated.js | tail -6 )
echo

echo "=== NestJS: the CLI plugin, at its default options ==="
( cd nestjs-api && rm -rf dist/ep09-plugin && node tools/build-with-plugin.mjs \
  && node dist/ep09-plugin/run.js )
echo

echo "=== Spring: the same three fields, and a schema name collision ==="
if docker compose ps postgres 2>/dev/null | grep -q 'Up\|running'; then
  ./scripts/test-spring.sh Ep09DocsTest 2>&1 \
    | grep -E '=== Spring|properties documented|required documented|what the document|^  \{"type"|^  payments\.|^  ep09\.'
else
  echo "  SKIPPED: the database is not up. Run: docker compose up -d" >&2
fi
