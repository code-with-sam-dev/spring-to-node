#!/bin/sh
# What happens to a request that is IN FLIGHT when the container is told to stop.
#
# This is the last act's evidence. A Spring developer has graceful shutdown
# largely by default; a Nest application does NOT unless you enable it, and the
# failure is invisible until a deploy drops a payment.
#
#   ./scripts/verify-shutdown.sh
#
# Sends one slow request, issues SIGTERM 300ms later, reports whether the
# response arrived or the connection died.

set -e
NEST="${NEST:-http://localhost:3005}"
SPRING="${SPRING:-http://localhost:8080}"
OUT="${OUT:-artifacts}"
cd "$(dirname "$0")/.."
mkdir -p "$OUT"

echo "=== SIGTERM during an in-flight request ==="
date -u +"run  %Y-%m-%dT%H:%M:%SZ"
echo

probe() {
  stack="$1"; url="$2"; service="$3"
  echo "--- $stack"
  # A request that takes long enough to still be running when the signal lands.
  ( curl -s -o /tmp/sd.body -w '%{http_code}' -m 30 "$url/receipts/sign?rounds=900000" \
      > /tmp/sd.code 2>/dev/null; echo done > /tmp/sd.flag ) &
  CURL_PID=$!
  sleep 0.4
  echo "    sending SIGTERM to $service while the request is in flight"
  docker compose kill -s SIGTERM "$service" >/dev/null 2>&1 || true
  wait $CURL_PID 2>/dev/null || true
  code=$(cat /tmp/sd.code 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "    the in-flight request COMPLETED: HTTP $code"
    echo "    graceful: the process drained before exiting"
  else
    echo "    the in-flight request was LOST: curl reported '${code:-no response}'"
    echo "    not graceful: the client is left not knowing if the work happened"
  fi
  docker compose up -d "$service" >/dev/null 2>&1
  printf "    restarting"
  for i in $(seq 1 60); do
    if curl -sf -m 2 "$url/health" >/dev/null 2>&1; then echo " back after ${i}s"; break; fi
    printf "."; sleep 1
  done
  echo
}

probe SPRING "$SPRING" spring-boot-api
probe NEST   "$NEST"   nestjs-api

echo "raw note: this measures the DEFAULT behaviour of each stack."
