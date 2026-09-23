#!/bin/sh
# Runs the Spring tests against the compose database, on whatever host port
# compose actually published it on.
#
#   ./scripts/test-spring.sh                 all tests
#   ./scripts/test-spring.sh Ep08OrderTest   one
#
# This exists because Maven does not read .env, and a wrong port presents as a
# password failure rather than a connection failure.
set -e
cd "$(dirname "$0")/.."
[ -f .env ] && . ./.env && export POSTGRES_PORT
# PINNED, and deliberately NOT falling back to an inherited JAVA_HOME. An
# older JAVA_HOME on the shell compiles fine and then fails at surefire with
# "class file version 69.0 ... only recognizes up to 65.0", which reads like a
# corrupt build rather than the wrong JDK.
JDK25="$HOME/.sdkman/candidates/java/25.0.4-amzn"
[ -d "$JDK25" ] || { echo "Java 25 not found at $JDK25" >&2; exit 1; }
cd spring-boot-api
if [ -n "$1" ]; then
  JAVA_HOME="$JDK25" ./mvnw -q -Dtest="$1" test
else
  JAVA_HOME="$JDK25" ./mvnw -q test
fi
