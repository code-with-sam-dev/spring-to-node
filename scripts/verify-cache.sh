#!/bin/sh
# Episode 24. Reproduces every figure the caching episode puts on screen.
# Needs Docker running: the Redis probes start Redis in a container.
#
#   ./scripts/verify-cache.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                  $(node -v)"
echo "@nestjs/cache-manager $(node -p "require('./nestjs-api/node_modules/@nestjs/cache-manager/package.json').version")"
echo "cache-manager         $(node -p "require('./nestjs-api/node_modules/cache-manager/package.json').version")"
echo "@keyv/redis           $(node -p "require('./nestjs-api/node_modules/@keyv/redis/package.json').version")"
date -u +"run                   %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @Cacheable, in memory, on Redis, and on Redis with the locking writer ==="
( cd spring-cache && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: CacheInterceptor and cache-aside, in memory and on Redis ==="
npx vitest run --config src/ep23-cache/vitest.config.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
