#!/bin/sh
# Episode 28. Reproduces every figure the RabbitMQ episode puts on screen.
# Needs Docker running: the broker runs in a container, and the Spring and Nest consumers run as
# real processes against it.
#
#   ./scripts/verify-rabbitmq.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                   $(node -v)"
echo "@nestjs/microservices  $(node -p "require('./nestjs-api/node_modules/@nestjs/microservices/package.json').version")"
echo "amqplib                $(node -p "require('./nestjs-api/node_modules/amqplib/package.json').version")"
echo "rabbitmq broker        rabbitmq:4.1-alpine"
date -u +"run                    %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-rabbit && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring AMQP and Nest's RabbitMQ transport, one broker, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/rabbitmq.mjs
