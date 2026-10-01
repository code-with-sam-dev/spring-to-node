#!/bin/sh
# Episode 34. Reproduces every figure the RxJS episode puts on screen.
# Spring WebFlux and NestJS run as real processes; no containers needed.
#
#   ./scripts/verify-rxjs.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node            $(node -v)"
echo "rxjs            $(node -p "require('./nestjs-api/node_modules/rxjs/package.json').version")"
echo "@nestjs/core    $(node -p "require('./nestjs-api/node_modules/@nestjs/core/package.json').version")"
echo "reactor-core    $(unzip -l spring-reactive/target/spring-reactive-probe-0.0.1-SNAPSHOT.jar 2>/dev/null | grep -o 'reactor-core-[0-9.]*[0-9]' | sed 's/reactor-core-//')"
date -u +"run             %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-reactive && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring WebFlux with Reactor and NestJS with RxJS, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/rxjs.mjs
