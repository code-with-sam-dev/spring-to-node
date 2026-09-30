#!/usr/bin/env bash
# Episode 8: exception filters and errors.
#
# THE ONE THING: an exception inside the request pipeline becomes a response on
# both stacks. A rejected promise nobody owns has already left that pipeline,
# so no filter can see it, and on Node 22 it exits the process.
#
# Each demo asserts its own claim before printing it. The Spring half needs the
# compose database: docker compose up -d postgres
set -euo pipefail
cd "$(dirname "$0")/.."
( cd nestjs-api && npm run build >/dev/null )

echo "=== 1. Unowned: a rejected promise nobody awaited or caught ==="
node nestjs-api/dist/ep07-errors/unhandled-rejection.js
echo
echo "=== 2. Thrown inside the request: three shapes, all responses (NestJS) ==="
node nestjs-api/dist/ep07-errors/thrown.js
echo
echo "=== 3. The same three shapes in Spring, without and with the advice ==="
./scripts/test-spring.sh NoAdviceTest 2>&1 | grep -E "^GET"
./scripts/test-spring.sh ThrownResponseTest 2>&1 | grep -E "^GET|still answering"
./scripts/test-spring.sh IncludeMessageTest 2>&1 | grep -E "include-message|ResponseStatusException  |IllegalStateException    "
echo
echo "=== 4. The NestJS filter: 500 becomes a 409 the client can act on ==="
node nestjs-api/dist/ep07-errors/filtered.js
echo
echo "=== 5. Owned: .catch() on deliberately detached work, await on request work ==="
node nestjs-api/dist/ep07-errors/owned-rejection.js
