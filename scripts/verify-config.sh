#!/usr/bin/env bash
# Episode 6: configuration, and the startup failure you stop getting.
#
# THE ONE THING: Spring refuses to start when a required property is missing,
# on your machine, with the key named in the message. NestJS starts happily and
# hands you `undefined`. Neither is a bug. One is a safety net you have been
# leaning on without noticing, and the episode is about hanging it yourself.
#
# Each demo asserts its own claim before printing it.
set -euo pipefail
cd "$(dirname "$0")/../nestjs-api"

TSC="npx tsc --ignoreConfig --outDir dist/ep05-config \
  --experimentalDecorators --emitDecoratorMetadata \
  --module nodenext --moduleResolution nodenext --target es2023 \
  --skipLibCheck --types node"
# shellcheck disable=SC2086
$TSC src/ep05-config/*.ts

echo "=== 1. The setting is missing. The application starts anyway. ==="
node dist/ep05-config/missing-config.js
echo

echo "=== 2. Everything is a string, including the word false ==="
node dist/ep05-config/string-trap.js
echo

echo "=== 3. Validation buys the startup failure back ==="
node dist/ep05-config/validated-config.js
echo

echo "=== 3b. The documented fix with Zod, and the boolean trap inside it ==="
node dist/ep05-config/zod-config.js
echo

cd ..
JDK25="$HOME/.sdkman/candidates/java/25.0.4-amzn"
if [ ! -d "$JDK25" ]; then
  echo "Java 25 not found at $JDK25. Install it (sdk install java 25.0.4-amzn)." >&2
  exit 1
fi

echo "=== 4. Spring, for contrast: it simply refuses ==="
cd spring-boot-api
JAVA_HOME="$JDK25" ./mvnw -q -Dtest=MissingPropertyTest test
cd ..
echo

echo "config verified: a missing setting is undefined here, and fatal there"
