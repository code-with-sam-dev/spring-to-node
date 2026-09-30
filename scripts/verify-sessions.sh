#!/bin/sh
# Episode 12. Reproduces every figure the CORS, cookies and sessions act puts
# on screen, from BOTH stacks.
#
#   ./scripts/verify-sessions.sh
#
# Standing rule: a number that cannot be produced by a command in this
# repository does not go on screen.

set -e
cd "$(dirname "$0")/.."

echo "=== versions, so every figure is attributable ==="
echo "node             $(node -v 2>/dev/null || echo 'not on PATH')"
echo "express          $(node -p "require('./nestjs-api/node_modules/express/package.json').version" 2>/dev/null || echo '?')"
echo "express-session  $(node -p "require('./nestjs-api/node_modules/express-session/package.json').version" 2>/dev/null || echo '?')"
date -u +"run              %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: session, expiry and CORS with nothing configured ==="
if docker compose ps postgres 2>/dev/null | grep -q 'Up\|running'; then
  ./scripts/test-spring.sh 'Ep11*' 2>&1 \
    | grep -A2 -E '^=== Spring' | grep -vE '^--$'
else
  echo "  SKIPPED: the database is not up. Run: docker compose up -d" >&2
fi
echo

( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep11-sessions/*.ts --outDir dist/ep11-sessions \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
       --esModuleInterop )

echo "=== NestJS: a session, with nothing and with express-session ==="
( cd nestjs-api && node dist/ep11-sessions/sessions.js )
echo

echo "=== NestJS: ten thousand visitors who never come back ==="
( cd nestjs-api && node dist/ep11-sessions/expiry.js )
echo

echo "=== NestJS: what a stranger's origin is told, four ways ==="
( cd nestjs-api && node dist/ep11-sessions/cors.js )
echo

echo "=== NestJS: two browser paths, a simple GET and a preflighted PUT ==="
( cd nestjs-api && node dist/ep11-sessions/preflight.js )
