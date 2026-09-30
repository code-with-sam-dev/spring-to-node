#!/bin/sh
# Episode 27. Reproduces every figure the Kafka episode puts on screen.
# Needs Docker running and host port 29092 free: the broker runs in a container, and the Spring and
# Nest consumers run as real processes against it.
#
#   ./scripts/verify-kafka.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                   $(node -v)"
echo "@nestjs/microservices  $(node -p "require('./nestjs-api/node_modules/@nestjs/microservices/package.json').version")"
echo "kafkajs                $(node -p "require('./nestjs-api/node_modules/kafkajs/package.json').version")"
echo "kafka broker           apache/kafka:4.2.1"
date -u +"run                    %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-kafka && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring Kafka and Nest's Kafka transport, one broker, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/kafka.mjs
