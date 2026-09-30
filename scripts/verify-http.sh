#!/bin/sh
# Episode 22. Reproduces every figure the calling-other-APIs episode puts on screen.
#
#   ./scripts/verify-http.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node              $(node -v)"
echo "@nestjs/axios     $(node -p "require('./nestjs-api/node_modules/@nestjs/axios/package.json').version")"
echo "axios             $(node -p "require('./nestjs-api/node_modules/axios/package.json').version")"
echo "@nestjs/http-client $(node -p "require('./nestjs-api/node_modules/@nestjs/http-client/package.json').version")"
date -u +"run               %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: RestClient and WebClient, auto-configured ==="
( cd spring-http-client && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: HttpService from @nestjs/axios ==="
npx vitest run --config src/ep21-http/vitest.config.ts src/ep21-http/http.spec.ts --reporter=verbose 2>&1 | grep -E '^  (Nest|Node)'
echo
echo "=== Nest: HttpClient from @nestjs/http-client ==="
npx vitest run --config src/ep21-http/vitest.config.ts src/ep21-http/http-client.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
