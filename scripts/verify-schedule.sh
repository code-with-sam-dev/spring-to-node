#!/bin/sh
# Episode 25. Reproduces every figure the scheduled jobs episode puts on screen.
# Needs Docker running: the lock probes start Redis in a container.
#
#   ./scripts/verify-schedule.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node              $(node -v)"
echo "@nestjs/schedule  $(node -p "require('./nestjs-api/node_modules/@nestjs/schedule/package.json').version")"
echo "@nestjs/locks     $(node -p "require('./nestjs-api/node_modules/@nestjs/locks/package.json').version")"
echo "shedlock          7.10.1"
date -u +"run               %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @Scheduled and ShedLock ==="
( cd spring-schedule && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: @nestjs/schedule and @nestjs/locks ==="
npx vitest run --config src/ep24-schedule/vitest.config.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Both: kill the instance running the job, as separate processes ==="
cd ..
( cd spring-schedule && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/failover.mjs
