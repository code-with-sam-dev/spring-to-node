#!/bin/sh
# Episode 23. Reproduces every figure the retries and circuit breakers episode puts on screen.
#
#   ./scripts/verify-resilience.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                $(node -v)"
echo "@nestjs/http-client $(node -p "require('./nestjs-api/node_modules/@nestjs/http-client/package.json').version")"
echo "opossum             $(node -p "require('./nestjs-api/node_modules/opossum/package.json').version")"
echo "resilience4j        2.4.0"
date -u +"run                 %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @Retryable and a Resilience4j circuit breaker ==="
( cd spring-resilience && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: @nestjs/http-client retries ==="
npx vitest run --config src/ep22-resilience/vitest.config.ts src/ep22-resilience/retry.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: an opossum circuit breaker ==="
npx vitest run --config src/ep22-resilience/vitest.config.ts src/ep22-resilience/breaker.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
