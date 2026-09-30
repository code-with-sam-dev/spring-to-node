#!/bin/sh
# Episode 17. Reproduces every figure the unit testing episode puts on screen, from BOTH stacks.
#
#   ./scripts/verify-testing.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "vitest   $(node -p "require('./nestjs-api/node_modules/vitest/package.json').version")"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: JUnit 5 and Mockito ==="
./scripts/test-spring.sh 'Ep16*Test' 2>&1 | grep -E '^  Spring'
echo

cd nestjs-api
echo "=== Vitest: decorator metadata ==="
npx vitest run src/ep16-testing/metadata.spec.ts --reporter=verbose 2>&1 | grep -E '^  design'
echo
echo "=== Vitest: a shared mock across two tests, default config ==="
npx vitest run src/ep16-testing/mock-leak.spec.ts --reporter=verbose 2>&1 | grep -E 'calls so far'
echo
echo "=== Vitest: the same, clearMocks: true ==="
npx vitest run --config src/ep16-testing/vitest.clear-mocks.config.ts --reporter=verbose 2>&1 | grep -E 'calls so far'
echo
echo "=== Vitest: a vi.mock factory that reads a test-file variable ==="
npx vitest run src/ep16-testing/hoist.spec.ts 2>&1 | grep -E 'ReferenceError|getHello' | head -1 || true
echo
echo "=== Vitest: an unused stub ==="
npx vitest run src/ep16-testing/unused-stub.spec.ts --reporter=verbose 2>&1 | grep -E '^  unused'
echo
echo "=== Vitest: overrideProvider ==="
npx vitest run src/ep16-testing/override.spec.ts --reporter=verbose 2>&1 | grep -E '^  controller'
