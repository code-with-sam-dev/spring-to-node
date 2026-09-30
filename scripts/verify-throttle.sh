#!/bin/sh
# Episode 21. Reproduces every figure the rate limiting episode puts on screen.
# Needs Docker running: the shared-storage probes start Redis in a container.
#
#   ./scripts/verify-throttle.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node       $(node -v)"
echo "throttler  $(node -p "require('./nestjs-api/node_modules/@nestjs/throttler/package.json').version")"
echo "bucket4j   8.14.0"
date -u +"run        %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: Bucket4j in a filter, three a minute per client address ==="
( cd spring-ratelimit-api && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: ThrottlerGuard, three a minute per client ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/limit.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: behind a proxy ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/proxy.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: two instances, in memory and in Redis ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/instances.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: two signed-in users behind one address ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/identity.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: a restart, in memory and in Redis ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/restart.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: the edge of the window ==="
npx vitest run --config src/ep20-throttle/vitest.config.ts src/ep20-throttle/boundary.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
