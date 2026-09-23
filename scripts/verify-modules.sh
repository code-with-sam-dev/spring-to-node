#!/usr/bin/env bash
# Episode 4: modules, and why a correct provider is still refused.
#
# Every claim the episode makes about the container is run here, and each demo
# ASSERTS its own claim before printing it, so a wrong sentence in the episode
# fails this script rather than reaching a viewer.
#
# THE ORDER IS THE EPISODE'S ORDER, so the transcript reads as the argument:
# the refusal, the two refusals told apart, the fix, then the three things that
# transfer with different wiring.
set -euo pipefail
cd "$(dirname "$0")/../nestjs-api"

TSC="npx tsc --ignoreConfig --outDir dist/ep03-modules \
  --experimentalDecorators --emitDecoratorMetadata \
  --module nodenext --moduleResolution nodenext --target es2023 --skipLibCheck"

# Compiled in one pass. Each file is standalone on purpose: a viewer can run any
# one of them without the others, which is what makes them worth putting in a
# repository rather than in a slide.
# shellcheck disable=SC2086
$TSC src/ep03-modules/*.ts

echo "=== 1. Decorated, tokenised, wired correctly. And refused. ==="
node dist/ep03-modules/not-exported.js
echo

echo "=== 2. The two refusals, and the word that tells them apart ==="
node dist/ep03-modules/two-refusals.js
echo

echo "=== 3. The same graph, with exports and imports ==="
node dist/ep03-modules/exported.js
echo

echo "=== 4. Where @Bean went ==="
node dist/ep03-modules/factory-provider.js
echo

echo "=== 5. Scope: the default matches Spring, the alternative costs more ==="
node dist/ep03-modules/scopes.js
echo

echo "=== 6. Where @PostConstruct went, and what the ordering is ==="
node dist/ep03-modules/lifecycle.js
echo

echo "=== 7. TRANSIENT is not prototype: one instance per consumer ==="
node dist/ep03-modules/transient.js
echo

echo "=== 8. Field injection exists here too ==="
node dist/ep03-modules/property-injection.js
echo

cd ..

# THE SPRING SIDE NEEDS JAVA 25, AND THE SHELL DEFAULT IS NOT IT.
# pom.xml pins <java.version>25</java.version>. With an older JDK on PATH the
# build dies with "release version 25 not supported", which reads like a broken
# repository rather than a wrong JAVA_HOME.
JDK25="$HOME/.sdkman/candidates/java/25.0.4-amzn"
if [ ! -d "$JDK25" ]; then
  echo "Java 25 not found at $JDK25. Install it (sdk install java 25.0.4-amzn)." >&2
  exit 1
fi

echo "=== 9. Spring, for contrast: the boundary is the SCAN, not a module ==="
cd spring-boot-api
JAVA_HOME="$JDK25" ./mvnw -q -Dtest=ComponentScanTest test
echo "  both Spring expectations passed:"
echo "    a scanned bean is available with no export and no import"
echo "    a bean outside the scan does not exist at all"
echo "  in a typical single application context, packages do not create a"
echo "  visibility boundary. Nest's 'registered but not exported' does."
echo

echo "=== 10. Spring's prototype, counted in the same three shapes ==="
JAVA_HOME="$JDK25" ./mvnw -q -Dtest=Ep03PrototypeTest test 2>&1 | grep -A3 '=== Spring, prototype'
cd ..
echo

echo "modules verified: a provider is private to its module until it is exported"
