#!/bin/sh
# Episode 40. Reproduces every figure the multi tenancy and feature flags episode puts on screen.
# Spring and Nest run as real processes; flagd evaluates in-process from flags/flags.json.
#
#   ./scripts/verify-tenancy.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                         $(node -v)"
echo "@nestjs/core                 $(node -p "require('./nestjs-api/node_modules/@nestjs/core/package.json').version")"
echo "@openfeature/server-sdk      $(node -p "require('./nestjs-api/node_modules/@openfeature/server-sdk/package.json').version")"
echo "@openfeature/flagd-provider  $(node -p "require('./nestjs-api/node_modules/@openfeature/flagd-provider/package.json').version")"
echo "openfeature java sdk, flagd  1.23.0, 0.14.2"
date -u +"run                          %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-tenancy && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: a tenant per request, and one rollout evaluated by both stacks, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/tenancy.mjs
