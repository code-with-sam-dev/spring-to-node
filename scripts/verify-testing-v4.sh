#!/bin/sh
# Episode 17. The same probes in a project made by `nest new` today, which installs the
# Vitest its template pins: @nestjs/schematics 12.0.6 has "vitest": "^4.1.2", and a caret on 4
# never reaches 5. The repository itself is on Vitest 5.
#
# --legacy-peer-deps: on npm 10.9.7 the plain install of a fresh scaffold stopped with
# "Cannot read properties of null (reading 'edgesOut')" on 2026-09-30.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP=$(mktemp -d)
cd "$TMP"
npx -y @nestjs/cli@12.0.8 new probe-app --package-manager npm --skip-git --skip-install --strict >/dev/null 2>&1
cd probe-app
npm install --legacy-peer-deps --silent >/dev/null 2>&1
echo "vitest   $(node -p "require('./node_modules/vitest/package.json').version") (from nest new)"
mkdir -p src/ep16-testing
cp "$ROOT"/nestjs-api/src/ep16-testing/mock-leak.spec.ts "$ROOT"/nestjs-api/src/ep16-testing/reset-modes.spec.ts "$ROOT"/nestjs-api/src/ep16-testing/vitest.*.config.ts src/ep16-testing/
echo "=== Vitest 4: a shared mock across two tests, default config ==="
npx vitest run --config src/ep16-testing/vitest.probes.config.ts src/ep16-testing/mock-leak.spec.ts --reporter=verbose 2>&1 | grep -E 'calls so far'
echo "=== Vitest 4: a stub and a spy defined once, under each reset setting ==="
for mode in none clearMocks mockReset restoreMocks; do
  echo "  -- $mode"
  npx vitest run --config src/ep16-testing/vitest.$mode.config.ts --reporter=verbose 2>&1 | grep -E 'test: '
done
cd / && rm -rf "$TMP"
