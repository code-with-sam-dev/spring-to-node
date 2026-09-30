#!/bin/sh
# Episode 14. Reproduces every figure the migrations, relations and queries episode puts
# on screen, from BOTH stacks.
#
#   docker compose up -d postgres   (host port 5434 on the recording machine)
#   ./scripts/verify-relations.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "typeorm  $(node -p "require('./nestjs-api/node_modules/typeorm/package.json').version" 2>/dev/null || echo '?')"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: relations, fetches and pages, JPA and Spring Data ==="
./scripts/test-spring.sh Ep13RelationsTest 2>&1 | grep -E '=== Spring|^  |^Hibernate:'
echo

echo "=== NestJS: TypeORM relations ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep13-relations/probes.ts src/ep13-relations/migration-plan.ts --outDir dist/ep13-relations \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep13-relations/probes.js \
  && echo \
  && echo "=== NestJS: what a generated migration would run ===" \
  && node dist/ep13-relations/migration-plan.js )
