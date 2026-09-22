#!/usr/bin/env bash
# Episode 3: how each framework picks a handler, and what status it returns.
#
# Both halves are run. A contrast where only one side was measured is half an
# argument, and this episode's whole claim is that the SAME controller ordering
# behaves differently in the two frameworks.
#
# Each demo ASSERTS its own claim before printing it, so a wrong sentence in the
# episode fails here rather than reaching a viewer.
set -euo pipefail
cd "$(dirname "$0")/.."

# THE SPRING SIDE NEEDS JAVA 25, AND THE SHELL DEFAULT IS NOT IT.
# pom.xml pins <java.version>25</java.version>. With an older JDK on PATH the
# build dies with "release version 25 not supported", which reads like a broken
# repository rather than a wrong JAVA_HOME. So it is set explicitly here.
JDK25="$HOME/.sdkman/candidates/java/25.0.4-amzn"
if [ ! -d "$JDK25" ]; then
  echo "Java 25 not found at $JDK25. Install it (sdk install java 25.0.4-amzn)." >&2
  exit 1
fi

echo "=== NestJS: routes are matched in DECLARATION order ==="
cd nestjs-api
npx tsc --ignoreConfig src/ep02-routes/*.ts --outDir dist/ep02-routes \
  --experimentalDecorators --emitDecoratorMetadata \
  --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck
node dist/ep02-routes/route-order.js
echo
echo "--- and the SAME controller on the Fastify adapter ---"
node dist/ep02-routes/route-order-fastify.js
echo
node dist/ep02-routes/default-status.js
echo
echo "--- and Nest's @Controller returns the value as the BODY ---"
node dist/ep02-routes/controller-returns-body.js
cd ..
echo

echo "=== Spring: the most SPECIFIC pattern wins, whatever the order ==="
cd spring-boot-api
JAVA_HOME="$JDK25" ./mvnw -q -Dtest=RouteOrderTest,ControllerAnnotationTest test
echo "  all three Spring expectations passed:"
echo "    GET /ep02-payments/recent -> 200 'recent handler'   (:id is declared FIRST)"
echo "    GET /ep02-payments/123    -> 200 'byId handler, id=123'"
echo "    POST /ep02-payments       -> 200, not 201"
echo "  and the annotation itself differs:"
echo "    plain @Controller   -> ModelAndView(viewName=hello), body EMPTY"
echo "    @RestController     -> body 'hello'"
# The Nest side of this contrast is MEASURED above by controller-returns-body,
# not asserted here. It used to be a sentence in this block while the design
# sheet printed all three rows as measured output, which is the one thing these
# scripts exist to prevent.
cd ..
echo
echo "routing verified: same declaration order, two different behaviours"
