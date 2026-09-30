#!/bin/sh
# Episode 16. Reproduces every figure the MongoDB episode puts on screen, from BOTH stacks.
#
#   docker compose up -d mongo      (host port 27018; a single-node replica set)
#   ./scripts/verify-mongo.sh
set -e
cd "$(dirname "$0")/.."

echo "=== versions ==="
echo "node      $(node -v)"
echo "mongoose  $(node -p "require('./nestjs-api/node_modules/mongoose/package.json').version" 2>/dev/null || echo '?')"
echo "mongodb   $(docker compose exec -T mongo mongosh --quiet --eval 'db.version()' 2>/dev/null || echo '?')"
date -u +"run       %Y-%m-%dT%H:%M:%SZ"
echo

echo "=== Spring: Spring Data MongoDB ==="
./scripts/test-spring.sh Ep15MongoTest 2>&1 | grep -E '=== Spring|^  [a-z]'
echo

echo "=== NestJS: Mongoose ==="
( cd nestjs-api \
  && npx tsc --ignoreConfig src/ep15-mongo/probes.ts --outDir dist/ep15-mongo \
       --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck --types node \
  && node dist/ep15-mongo/probes.js )
