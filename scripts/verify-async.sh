#!/usr/bin/env bash
# Episode 5: one thread, and what that costs you.
#
# THE WHOLE EPISODE IS THIS TABLE, and every cell is measured here:
#
#                                  slow handler   unrelated ping during it
#   Spring, thread per request       ~1500 ms          a few ms
#   NestJS, synchronous handler      ~1500 ms         ~1400 ms
#   NestJS, awaiting handler         ~1500 ms          a few ms
#
# The same 1500 milliseconds of slowness. Three completely different outcomes
# for everybody else.
#
# EACH DEMO ASSERTS ITS OWN CLAIM and fails rather than printing something
# plausible. Two of them caught real mistakes while being written, both
# recorded in the file comments: a client sharing the server's event loop
# cannot time it, and a timing test that ignores the status code will happily
# measure a 404.
set -euo pipefail
cd "$(dirname "$0")/../nestjs-api"

TSC="npx tsc --ignoreConfig --outDir dist/ep04-async \
  --experimentalDecorators --emitDecoratorMetadata \
  --module nodenext --moduleResolution nodenext --target es2023 \
  --skipLibCheck --types node"

# --types node is required here and nowhere else in this repository: these are
# the only demos that use Node built-ins (child_process, url), and
# --ignoreConfig means no tsconfig is loaded to supply them.
# shellcheck disable=SC2086
$TSC src/ep04-async/*.ts

echo "=== 1. A synchronous handler holds the only thread ==="
node dist/ep04-async/blocking.js
echo

echo "=== 2. The same wait, awaited, blocks nobody ==="
node dist/ep04-async/non-blocking.js
echo

cd ..
JDK25="$HOME/.sdkman/candidates/java/25.0.4-amzn"
if [ ! -d "$JDK25" ]; then
  echo "Java 25 not found at $JDK25. Install it (sdk install java 25.0.4-amzn)." >&2
  exit 1
fi

echo "=== 3. Spring, for contrast: every request gets its own thread ==="
cd spring-boot-api
# A REAL SERVER ON A REAL PORT. MockMvc would prove nothing: it does not use
# the servlet container's thread pool, which is the entire subject.
JAVA_HOME="$JDK25" SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:-jdbc:postgresql://localhost:5434/payments_spring}" \
  ./mvnw -q -Dtest=RequestPerThreadTest test
echo "  asserted: the slow handler blocked its own thread and nobody else's"
cd ..
echo

echo "async verified: a promise is not a thread, it is a way of saying later"
