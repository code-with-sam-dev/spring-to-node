#!/bin/sh
# Episode 18. Reproduces every figure the integration testing episode puts on screen, from BOTH
# stacks, against the real Postgres from compose (host port 5434 on the recording machine).
#
#   docker compose up -d postgres
#   ./scripts/verify-integration.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "vitest   $(node -p "require('./nestjs-api/node_modules/vitest/package.json').version")"
echo "typeorm  $(node -p "require('./nestjs-api/node_modules/typeorm/package.json').version")"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @DataJpaTest, and @SpringBootTest with and without @Transactional ==="
./scripts/test-spring.sh 'Ep17*Test' 2>&1 | grep -E '^  Spring'
echo

cd nestjs-api
echo "=== Nest: two tests against the real database, run twice ==="
psql_clear() { docker compose -f ../compose.yaml exec -T postgres psql -U payments -d payments_node -qc 'DROP TABLE IF EXISTS ep17_notes_node' >/dev/null 2>&1 || true; }
psql_clear
npx vitest run --config src/ep17-integration/vitest.config.ts src/ep17-integration/rows.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
npx vitest run --config src/ep17-integration/vitest.config.ts src/ep17-integration/rows.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
echo
echo "=== Nest: TRUNCATE per test, and a rolled-back transaction per test ==="
npx vitest run --config src/ep17-integration/vitest.config.ts src/ep17-integration/cleanup.spec.ts --reporter=verbose 2>&1 | grep -E '^  Nest'
