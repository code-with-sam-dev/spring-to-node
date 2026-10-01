#!/bin/sh
# Episode 35. Reproduces every figure the Docker episode puts on screen. Builds real images from a
# scratch copy of each application, so the working tree is never modified.
#
#   ./scripts/verify-docker.sh
set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
export DOCKER_BUILDKIT=1

echo "=== versions ==="
echo "docker engine   $(docker version --format '{{.Server.Version}}')"
echo "node base       node:24.21.0, node:24.21.0-alpine"
echo "java base       maven:3.9-eclipse-temurin-25, eclipse-temurin:25-jre-alpine"
date -u +"run             %Y-%m-%dT%H:%M:%SZ"
echo

# Start from an empty build cache, so the first build of each image is a real first build.
docker builder prune -af >/dev/null
rsync -a --exclude dist nestjs-api/ "$T/nest/"
rsync -a --exclude target spring-boot-api/ "$T/spring/"
# The course's .dockerignore arrived in this episode; measure the before state without it.
rm -f "$T/nest/.dockerignore"
probe() { docker build -q -t ep35-ctx -f "$ROOT/docker/ep35/context-probe.Dockerfile" "$1" >/dev/null && docker run --rm ep35-ctx cat "$2"; }
mb() { docker image inspect "$1" --format '{{.Size}}' | awk '{printf "%d MB", $1/1000000}'; }
ctx() { grep -o 'transferring context: [0-9.]*[kMG]*B' "$1" | tail -1 | sed 's/transferring context: //'; }
build() { # tag dockerfile context log [no-cache]
  start=$(date +%s)
  docker build ${5:+--no-cache} --progress=plain -t "$1" -f "$2" "$3" > "$4" 2>&1
  echo $(( $(date +%s) - start ))
}
# BuildKit prints a step as "#9 [build 4/6] RUN npm ci" and, separately, "#9 CACHED" when it reused it.
reran() {
  id=$(grep -E "^#[0-9]+ \[.*\] $2\$" "$1" | head -1 | cut -d' ' -f1)
  grep -q "^$id CACHED" "$1" && echo "cached" || echo "ran again"
}

echo "=== Both: real images, built from a scratch copy of each application ==="
# A: the build context, with and without a .dockerignore.
build ep35-nest-noignore "$ROOT/docker/ep35/nest-before.Dockerfile" "$T/nest" "$T/a1.log" >/dev/null
echo "  Nest, A, the course Dockerfile as it was, no .dockerignore: the builder received $(probe "$T/nest" /context-mb) MB of context, image $(mb ep35-nest-noignore)"
docker build --progress=plain --target build -t ep35-nest-noignore-build -f "$ROOT/docker/ep35/nest-before.Dockerfile" "$T/nest" > "$T/a1b.log" 2>&1
DARWIN='ls -d node_modules/@*/*darwin* node_modules/*darwin* 2>/dev/null | wc -l'
echo "  Nest, A, inside the build stage after COPY . ., packages built for macOS: $(docker run --rm --entrypoint sh ep35-nest-noignore-build -c "$DARWIN" | tr -d ' ') (the host has $(ls -d nestjs-api/node_modules/@*/*darwin* nestjs-api/node_modules/*darwin* 2>/dev/null | wc -l | tr -d ' '))"
cp docker/ep35/nest.dockerignore "$T/nest/.dockerignore"
docker build --progress=plain --target build -t ep35-nest-build -f "$ROOT/docker/ep35/nest-before.Dockerfile" "$T/nest" > "$T/a2b.log" 2>&1
echo "  Nest, A, the same, with a .dockerignore: packages built for macOS $(docker run --rm --entrypoint sh ep35-nest-build -c "$DARWIN" | tr -d ' ')"
build ep35-nest "$ROOT/docker/ep35/nest-before.Dockerfile" "$T/nest" "$T/a2.log" >/dev/null
echo "  Nest, A, the same Dockerfile with a .dockerignore listing node_modules: the builder received $(probe "$T/nest" /context-mb) MB of context, image $(mb ep35-nest)"
cp docker/ep35/nest-fixed.dockerignore "$T/nest/.dockerignore"
echo "  Nest, A, the .dockerignore listing **/node_modules: the builder received $(probe "$T/nest" /context-mb) MB of context"
build ep35-spring "$ROOT/docker/ep35/spring-before.Dockerfile" "$T/spring" "$T/a3.log" >/dev/null
echo "  Spring, A, the course Dockerfile as it was, no .dockerignore: the builder received $(probe "$T/spring" /context-mb) MB of context, image $(mb ep35-spring)"

# B: the first attempt, against the course's multi-stage images.
build ep35-nest-naive "$ROOT/docker/ep35/nest-naive.Dockerfile" "$T/nest" "$T/b1.log" >/dev/null
echo "  Nest, B, one stage on node:24.21.0, every dependency: image $(mb ep35-nest-naive); multi-stage on alpine, production dependencies only: $(mb ep35-nest)"
build ep35-spring-naive "$ROOT/docker/ep35/spring-naive.Dockerfile" "$T/spring" "$T/b2.log" >/dev/null
echo "  Spring, B, one stage on the Maven image: image $(mb ep35-spring-naive); multi-stage on a JRE alpine: $(mb ep35-spring)"
echo "  Nest, B, devDependencies in the one stage image: $(docker run --rm --entrypoint sh ep35-nest-naive -c 'ls node_modules/typescript node_modules/vitest >/dev/null 2>&1 && echo typescript and vitest present || echo absent'); in the multi-stage image: $(docker run --rm --entrypoint sh ep35-nest -c 'ls node_modules/typescript node_modules/vitest >/dev/null 2>&1 && echo typescript and vitest present || echo absent')"

# C: change one line of source and rebuild with a warm cache.
echo "// one line changed $(date +%s)" >> "$T/nest/src/main.ts"
s=$(build ep35-nest-naive "$ROOT/docker/ep35/nest-naive.Dockerfile" "$T/nest" "$T/c1.log")
echo "  Nest, C, one line changed, one stage, COPY . . before npm ci: npm ci $(reran "$T/c1.log" 'RUN npm ci'), rebuild ${s} s"
s=$(build ep35-nest "$ROOT/docker/ep35/nest-before.Dockerfile" "$T/nest" "$T/c2.log")
echo "  Nest, C, one line changed, package files copied before npm ci: npm ci $(reran "$T/c2.log" 'RUN npm ci'), rebuild ${s} s"
build ep35-spring-layered "$ROOT/docker/ep35/spring-layered.Dockerfile" "$T/spring" "$T/c3.log" >/dev/null
MAIN=$(find "$T/spring/src/main/java" -name '*Application.java' | head -1)
# A real code change, not a comment: a comment compiles to the same bytecode.
echo "class Ep35Changed$(date +%s) {}" >> "$MAIN"
s=$(build ep35-spring "$ROOT/docker/ep35/spring-before.Dockerfile" "$T/spring" "$T/c4.log")
s2=$(build ep35-spring-layered "$ROOT/docker/ep35/spring-layered.Dockerfile" "$T/spring" "$T/c5.log")
layer() { docker history --format '{{.CreatedBy}}|{{.Size}}' "$1" | grep "$2" | head -1 | cut -d'|' -f2; }
echo "  Spring, C, one line changed, the fat jar copied in one layer: dependencies $(reran "$T/c4.log" 'RUN mvn -B dependency:go-offline'), rebuild ${s} s, the changed layer is $(layer ep35-spring 'COPY.*app.jar')"
echo "  Spring, C, one line changed, the jar extracted into layers: dependencies layer $(reran "$T/c5.log" 'COPY --from=build /app/extracted/dependencies/ ./'), rebuild ${s2} s, the changed layer is $(layer ep35-spring-layered 'extracted/application')"
echo "  Nest, C, one line changed, the multi-stage image: the changed layer is $(docker history --format '{{.CreatedBy}}|{{.Size}}' ep35-nest | grep 'COPY /app/dist' | cut -d'|' -f2)"

# D: who the process runs as.
echo "  Both, D, the user inside the course images as they were: Nest uid $(docker run --rm --entrypoint id ep35-nest -u), Spring uid $(docker run --rm --entrypoint id ep35-spring -u)"

# E: the course images after this episode, USER set, run with compose against Postgres.
P=ep35check
export POSTGRES_PORT=55435 SPRING_PORT=18735 NEST_PORT=13735
docker compose -p $P up -d --build postgres spring-boot-api nestjs-api > "$T/e.log" 2>&1
for port in 18735 13735; do
  for i in $(seq 1 90); do curl -sf "http://127.0.0.1:$port/health" >/dev/null && break; sleep 2; done
done
echo "  Both, E, the course images with a non-root USER: Nest uid $(docker compose -p $P exec -T nestjs-api id -u), GET /health $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:13735/health); Spring uid $(docker compose -p $P exec -T spring-boot-api id -u), GET /health $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18735/health)"
docker compose -p $P down -v > /dev/null 2>&1
