#!/bin/sh
# Episode 20. Reproduces every figure the authentication and guards episode puts on screen.
#
#   ./scripts/verify-guards.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "nest     $(node -p "require('./nestjs-api/node_modules/@nestjs/core/package.json').version")"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring Security: the starter alone, then an explicit filter chain ==="
( cd spring-security-api && JAVA_HOME="$HOME/.sdkman/candidates/java/25.0.4-amzn" ./mvnw -q test 2>&1 | grep -E '^  Spring' )
echo

cd nestjs-api
echo "=== Nest: @UseGuards on one controller ==="
npx vitest run --config src/ep19-guards/vitest.config.ts src/ep19-guards/default.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: APP_GUARD with a @Public() opt-out ==="
npx vitest run --config src/ep19-guards/vitest.config.ts src/ep19-guards/global.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: @Roles with a RolesGuard, through the route and directly ==="
npx vitest run --config src/ep19-guards/vitest.config.ts src/ep19-guards/roles.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
