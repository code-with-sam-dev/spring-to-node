#!/bin/sh
# Episode 37. Reproduces every figure the OpenTelemetry episode puts on screen.
# Needs Docker running: Jaeger runs in a container; Spring and Nest export to it as real processes.
#
#   ./scripts/verify-otel.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                                    $(node -v)"
echo "@opentelemetry/sdk-node                 $(node -p "require('./nestjs-api/node_modules/@opentelemetry/sdk-node/package.json').version")"
echo "@opentelemetry/auto-instrumentations-node $(node -p "require('./nestjs-api/node_modules/@opentelemetry/auto-instrumentations-node/package.json').version")"
echo "opentelemetry-sdk (Java)                $(unzip -l spring-otel/target/spring-otel-probe-0.0.1-SNAPSHOT.jar 2>/dev/null | grep -o 'opentelemetry-sdk-[0-9.]*[0-9]' | head -1 | sed 's/opentelemetry-sdk-//')"
echo "jaeger                                  jaegertracing/jaeger:2.11.0"
date -u +"run                                     %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-otel && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring Boot's OpenTelemetry starter and the Node SDK under NestJS, exporting to Jaeger ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/otel.mjs
