#!/bin/sh
# Episode 33. Reproduces every figure the gRPC episode puts on screen.
# Both servers run as real processes on one payments.proto; no containers needed.
#
#   ./scripts/verify-grpc.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                   $(node -v)"
echo "@nestjs/microservices  $(node -p "require('./nestjs-api/node_modules/@nestjs/microservices/package.json').version")"
echo "@grpc/grpc-js          $(node -p "require('./nestjs-api/node_modules/@grpc/grpc-js/package.json').version")"
echo "@grpc/proto-loader     $(node -p "require('./nestjs-api/node_modules/@grpc/proto-loader/package.json').version")"
echo "spring-grpc            1.0.3, grpc-java 1.77.1"
date -u +"run                    %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-grpc && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring gRPC and a NestJS gRPC microservice, one payments.proto, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/grpc.mjs
