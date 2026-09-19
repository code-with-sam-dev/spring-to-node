#!/bin/sh
# Proves the persistence act: a payment survives a process restart.
#
# The in-memory version loses everything when the container stops. The
# persisted one does not. That contrast IS the act.
#
#   docker compose up -d
#   ./scripts/verify-persistence.sh
#
# Exits non-zero if a payment does NOT survive, because after this act that is
# a real failure rather than a finding.

set -e
SPRING="${SPRING:-http://localhost:8080}"
NEST="${NEST:-http://localhost:3005}"
OUT="${OUT:-artifacts}"
cd "$(dirname "$0")/.."
mkdir -p "$OUT"

echo "=== versions ==="
echo "node     $(node -v 2>/dev/null || echo 'not on PATH')"
docker compose exec -T postgres postgres --version 2>/dev/null | head -1 || true
date -u +"run      %Y-%m-%dT%H:%M:%SZ"
echo

KEY="persist-$(date +%s)"
BODY="{\"amountInMinorUnits\":10000,\"currency\":\"USD\",\"idempotencyKey\":\"$KEY\"}"

count_rows() { curl -s "$1/payments" | grep -o '"id"' | wc -l | tr -d ' '; }
create_id()  { curl -s -X POST "$1/payments" -H 'Content-Type: application/json' -d "$BODY" \
                 | sed -n 's/.*"id":"\([^"]*\)".*/\1/p'; }

echo "=== 1. create one payment on each stack ==="
SPRING_ID=$(create_id "$SPRING")
SPRING_BEFORE=$(count_rows "$SPRING")
[ -n "$SPRING_ID" ] || { echo "FAIL: SPRING create returned no id. The POST is failing." >&2; exit 1; }
echo "  SPRING  created $SPRING_ID"
echo "          rows before restart: $SPRING_BEFORE"
NEST_ID=$(create_id "$NEST")
NEST_BEFORE=$(count_rows "$NEST")
[ -n "$NEST_ID" ] || { echo "FAIL: NEST create returned no id. The POST is failing." >&2; exit 1; }
echo "  NEST    created $NEST_ID"
echo "          rows before restart: $NEST_BEFORE"
echo

echo "=== 2. restart BOTH app containers. The database keeps running. ==="
docker compose restart spring-boot-api nestjs-api >/dev/null 2>&1
printf "  waiting"
i=0
while [ $i -lt 90 ]; do
  if curl -sf -m 2 "$SPRING/health" >/dev/null 2>&1 && curl -sf -m 2 "$NEST/health" >/dev/null 2>&1; then
    echo " both answering after ${i}s"; break
  fi
  printf "."; sleep 1; i=$((i+1))
done
echo

echo "=== 3. read the SAME id back ==="
rc=0
check() {
  stack="$1"; url="$2"; id="$3"; before="$4"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url/payments/$id")
  after=$(count_rows "$url")
  echo "  $stack"
  echo "    GET /payments/$id  ->  $code"
  echo "    rows before $before, after $after"
  if [ "$code" = "200" ]; then
    echo "    SURVIVED the restart"
  else
    echo "    LOST on restart"
    rc=1
  fi
}
check SPRING "$SPRING" "$SPRING_ID" "$SPRING_BEFORE"
check NEST   "$NEST"   "$NEST_ID"   "$NEST_BEFORE"

printf '{"key":"%s","springId":"%s","nestId":"%s","ranAt":"%s"}\n' \
  "$KEY" "$SPRING_ID" "$NEST_ID" "$(date -u +%FT%TZ)" > "$OUT/persistence.json"
echo
echo "raw result: $OUT/persistence.json"
exit $rc
