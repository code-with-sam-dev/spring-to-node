#!/bin/sh
# Episode 31. Reproduces every figure the server sent events episode puts on screen.
# Every Spring and Nest server runs as its own process; no containers needed.
#
#   ./scripts/verify-sse.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                     $(node -v)"
echo "@nestjs/common           $(node -p "require('./nestjs-api/node_modules/@nestjs/common/package.json').version")"
echo "rxjs                     $(node -p "require('./nestjs-api/node_modules/rxjs/package.json').version")"
echo "eventsource (the client) $(node -p "require('./nestjs-api/node_modules/eventsource/package.json').version")"
echo "tomcat-embed-core        $(unzip -l spring-sse/target/spring-sse-probe-0.0.1-SNAPSHOT.jar 2>/dev/null | grep -o 'tomcat-embed-core-[0-9.]*[0-9]' | sed 's/tomcat-embed-core-//')"
date -u +"run                      %Y-%m-%dT%H:%M:%SZ"
echo

( cd spring-sse && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q package -DskipTests )
( cd nestjs-api && npx tsc -p tsconfig.build.json --outDir dist )
echo "=== Both: Spring MVC SseEmitter and Nest @Sse, real processes ==="
JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" node scripts/sse.mjs
