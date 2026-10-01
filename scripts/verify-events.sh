#!/bin/sh
# Episode 29. Reproduces every figure the application events episode puts on screen.
# Needs Docker running: the Nest transaction probe uses Postgres in a container.
#
#   ./scripts/verify-events.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                   $(node -v)"
echo "@nestjs/event-emitter  $(node -p "require('./nestjs-api/node_modules/@nestjs/event-emitter/package.json').version")"
echo "eventemitter2          $(node -p "require('./nestjs-api/node_modules/eventemitter2/package.json').version")"
date -u +"run                    %Y-%m-%dT%H:%M:%SZ"
echo

PG=$(docker run -d --rm -e POSTGRES_PASSWORD=payments -p 127.0.0.1::5432 postgres:18-alpine)
PORT=$(docker port "$PG" 5432 | head -1 | cut -d: -f2)
until docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2
trap 'docker stop "$PG" >/dev/null 2>&1' EXIT

echo "=== Spring: ApplicationEventPublisher, @EventListener, @TransactionalEventListener, on Postgres ==="
( cd spring-events && SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:$PORT/postgres" SPRING_DATASOURCE_USERNAME=postgres SPRING_DATASOURCE_PASSWORD=payments \
  JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Nest: @nestjs/event-emitter, each scenario in its own process ==="
cd nestjs-api
node dist/ep28-events/probe.js throws 2>/dev/null | grep -E '^  Nest'
node dist/ep28-events/probe.js unsuppressed 2>/dev/null | grep -E '^  Nest' || true
node dist/ep28-events/probe.js waits 2>/dev/null | grep -E '^  Nest'
node dist/ep28-events/probe.js matrix 2>/dev/null | grep -E '^  Nest'
node dist/ep28-events/probe.js transaction "postgres://postgres:payments@127.0.0.1:$PORT/postgres" 2>/dev/null | grep -E '^  Nest'
