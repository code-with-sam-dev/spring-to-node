#!/bin/sh
# Episode 13. Reproduces every figure the TypeORM entities and repositories episode
# puts on screen, from BOTH stacks, plus the same findOneBy on TypeORM 0.3.
#
#   docker compose up -d postgres   (host port 5434 on the recording machine)
#   ./scripts/verify-typeorm.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node     $(node -v)"
echo "typeorm  $(node -p "require('./nestjs-api/node_modules/typeorm/package.json').version" 2>/dev/null || echo '?')"
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: the same questions, JPA and Spring Data ==="
./scripts/test-spring.sh Ep12JpaTest 2>&1 | grep -E '=== Spring|^  '
echo

echo "=== NestJS: TypeORM 1.x ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep12-typeorm/probes.ts --outDir dist/ep12-typeorm \
       --experimentalDecorators --emitDecoratorMetadata --module nodenext \
       --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep12-typeorm/probes.js )
echo

echo "=== TypeORM 0.3, the same findOneBy ==="
( cd nestjs-api/probes/typeorm-v03 && npm ci --silent && node probe.mjs )
