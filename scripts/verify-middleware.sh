#!/bin/sh
# Episode 9. Reproduces every figure the middleware and interceptors act puts
# on screen, from BOTH stacks.
#
#   ./scripts/verify-middleware.sh
#
# Standing rule: a number or a trace that cannot be produced by a command in
# this repository does not go on screen.

set -e
cd "$(dirname "$0")/.."

echo "=== versions, so every figure is attributable ==="
echo "node      $(node -v 2>/dev/null || echo 'not on PATH')"
date -u +"run       %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== NestJS: where each of the five hooks actually runs ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep08-middleware/*.ts --outDir dist/ep08-middleware \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep08-middleware/order.js )
echo

echo "=== NestJS: what next() does around a handler that throws ==="
( cd nestjs-api && node dist/ep08-middleware/next-is-not-dofilter.js )
echo

echo "=== NestJS: which hook can still see the exception ==="
( cd nestjs-api && node dist/ep08-middleware/exception-visibility.js )
echo

echo "=== NestJS: one interceptor rewrites every response body ==="
( cd nestjs-api && node dist/ep08-middleware/transform.js )
echo

echo "=== NestJS: when three middlewares want the same request ==="
( cd nestjs-api && node dist/ep08-middleware/middleware-ordering.js )
echo

echo "=== Spring: the same two questions, on a real servlet container ==="
# Needs the compose database, because the application context loads JPA.
# test-spring.sh sources .env so the published Postgres port is honoured.
if docker compose ps postgres 2>/dev/null | grep -q 'Up\|running'; then
  ./scripts/test-spring.sh Ep08OrderTest 2>&1 | grep -E '=== Spring|^  |^status|^body'
  echo
  ./scripts/test-spring.sh Ep08BodyRewriteTest 2>&1 | grep -E '=== Spring|^what '
else
  echo "  SKIPPED: the database is not up. Run: docker compose up -d" >&2
fi
