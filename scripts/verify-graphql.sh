#!/bin/sh
# Episode 32. Reproduces every figure the GraphQL episode puts on screen.
# Needs Docker running: Postgres runs in a container, Spring and Nest as real processes against it.
#
#   ./scripts/verify-graphql.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node              $(node -v)"
echo "@nestjs/graphql   $(node -p "require('./nestjs-api/node_modules/@nestjs/graphql/package.json').version")"
echo "@nestjs/apollo    $(node -p "require('./nestjs-api/node_modules/@nestjs/apollo/package.json').version")"
echo "@apollo/server    $(node -p "require('./nestjs-api/node_modules/@apollo/server/package.json').version")"
echo "graphql           $(node -p "require('./nestjs-api/node_modules/graphql/package.json').version")"
echo "dataloader        $(node -p "require('./nestjs-api/node_modules/dataloader/package.json').version")"
date -u +"run               %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-graphql && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring for GraphQL and NestJS with Apollo, one Postgres, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/graphql.mjs
