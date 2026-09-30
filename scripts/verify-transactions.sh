#!/bin/sh
# Episode 15. Reproduces every figure the transactions and idempotency episode puts on
# screen, from BOTH stacks.
#
#   docker compose up -d postgres   (host port 5434 on the recording machine)
#   ./scripts/verify-transactions.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "typeorm  $(node -p "require('./nestjs-api/node_modules/typeorm/package.json').version" 2>/dev/null || echo '?')"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: @Transactional, self-invocation, the idempotency race ==="
./scripts/test-spring.sh Ep14TransactionsTest 2>&1 | grep -E '=== Spring|^  '
echo

echo "=== NestJS: TypeORM transactions and the idempotency race ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep14-transactions/probes.ts --outDir dist/ep14-transactions \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep14-transactions/probes.js )
