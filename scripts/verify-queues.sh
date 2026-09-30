#!/bin/sh
# Episode 26. Reproduces every figure the background jobs and queues episode puts on screen.
# Needs Docker running: Redis runs in a container, and the apps run as real processes so a crash
# can be a SIGKILL.
#
#   ./scripts/verify-queues.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node            $(node -v)"
echo "@nestjs/bullmq  $(node -p "require('./nestjs-api/node_modules/@nestjs/bullmq/package.json').version")"
echo "bullmq          $(node -p "require('./nestjs-api/node_modules/bullmq/package.json').version")"
date -u +"run             %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-queues && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: background work, real processes, Redis keeps the record ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/queues.mjs
