#!/bin/sh
# Episode 38. Reproduces every figure the health and graceful shutdown episode puts on screen.
# Spring and Nest run as real processes and receive a real SIGTERM; no containers needed.
#
#   ./scripts/verify-health.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node              $(node -v)"
echo "@nestjs/core      $(node -p "require('./nestjs-api/node_modules/@nestjs/core/package.json').version")"
echo "@nestjs/terminus  $(node -p "require('./nestjs-api/node_modules/@nestjs/terminus/package.json').version")"
echo "spring boot       4.1.1, server.shutdown default: graceful (spring-boot-web-server metadata)"
date -u +"run               %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-health && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: SIGTERM during a payment, Spring Boot with Actuator and NestJS with Terminus, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/health.mjs
