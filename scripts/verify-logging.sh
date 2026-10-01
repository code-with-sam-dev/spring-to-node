#!/bin/sh
# Episode 36. Reproduces every figure the logging episode puts on screen.
# Spring and Nest run as real processes; no containers needed.
#
#   ./scripts/verify-logging.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node            $(node -v)"
echo "@nestjs/common  $(node -p "require('./nestjs-api/node_modules/@nestjs/common/package.json').version")"
echo "nestjs-pino     $(node -p "require('./nestjs-api/node_modules/nestjs-pino/package.json').version")"
echo "pino            $(node -p "require('./nestjs-api/node_modules/pino/package.json').version")"
echo "logback-classic $(unzip -l spring-logging/target/spring-logging-probe-0.0.1-SNAPSHOT.jar 2>/dev/null | grep -o 'logback-classic-[0-9.]*[0-9]' | sed 's/logback-classic-//')"
date -u +"run             %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-logging && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Logback with an MDC, and Nest's ConsoleLogger and nestjs-pino, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/logging.mjs
