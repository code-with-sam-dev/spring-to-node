#!/bin/sh
# Episode 19. Reproduces every figure the Testcontainers episode puts on screen. Needs Docker.
#
#   ./scripts/verify-testcontainers.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node                        $(node -v)"
echo "@testcontainers/postgresql  $(node -p "require('./nestjs-api/node_modules/@testcontainers/postgresql/package.json').version")"
echo "docker                      $(docker version --format '{{.Server.Version}}')"
date -u +"run                         %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @ServiceConnection container, run twice ==="
./scripts/test-spring.sh Ep18ContainerTest 2>&1 | grep -E '^  Spring|postgres:18-alpine started in'
./scripts/test-spring.sh Ep18ContainerTest 2>&1 | grep -E '^  Spring|postgres:18-alpine started in'
echo

echo "=== Spring: three classes, each with its own @Container ==="
./scripts/test-spring.sh 'Ep18Own*Test' 2>&1 | grep -E '^  Spring|postgres:18-alpine started in'
echo

echo "=== Spring: one container shared by three classes through a base class ==="
./scripts/test-spring.sh 'Ep18Shared*Test' 2>&1 | grep -E '^  Spring|postgres:18-alpine started in'
echo

cd nestjs-api
echo "=== Nest: a container per run, run twice ==="
npx vitest run --config src/ep18-testcontainers/vitest.config.ts src/ep18-testcontainers/fresh.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
npx vitest run --config src/ep18-testcontainers/vitest.config.ts src/ep18-testcontainers/fresh.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: three container starts, the way three files would each start one ==="
npx vitest run --config src/ep18-testcontainers/vitest.config.ts src/ep18-testcontainers/cost.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: one container from globalSetup, three files, run twice ==="
npx vitest run --config src/ep18-testcontainers/shared/vitest.config.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
npx vitest run --config src/ep18-testcontainers/shared/vitest.config.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
