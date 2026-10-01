#!/bin/sh
# Episode 30. Reproduces every figure the WebSockets episode puts on screen.
# Needs Docker running: Redis and RabbitMQ (with its STOMP plugin) run in containers, and every
# Spring and Nest server runs as its own process.
#
#   ./scripts/verify-websockets.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                        $(node -v)"
echo "@nestjs/websockets          $(node -p "require('./nestjs-api/node_modules/@nestjs/websockets/package.json').version")"
echo "socket.io                   $(node -p "require('./nestjs-api/node_modules/socket.io/package.json').version")"
echo "ws                          $(node -p "require('./nestjs-api/node_modules/ws/package.json').version")"
echo "@socket.io/redis-adapter    $(node -p "require('./nestjs-api/node_modules/@socket.io/redis-adapter/package.json').version")"
date -u +"run                         %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-websocket && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring STOMP over WebSocket and Nest gateways, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/websockets.mjs
