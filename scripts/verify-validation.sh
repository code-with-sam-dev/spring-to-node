#!/bin/sh
# Reproduces every figure the flagship's validation act puts on screen, from
# BOTH stacks, so the comparison is auditable rather than remembered.
#
#   docker compose up -d
#   ./scripts/verify-validation.sh
#
#   SPRING=http://localhost:8080 NEST=http://localhost:3005 ./scripts/verify-validation.sh
#
# Standing rule: a number that cannot be produced by a command in this
# repository does not go on screen.

set -e
SPRING="${SPRING:-http://localhost:8080}"
NEST="${NEST:-http://localhost:3000}"
OUT="${OUT:-artifacts}"
mkdir -p "$OUT"

echo "=== versions, so every figure is attributable ==="
echo "node      $(node -v 2>/dev/null || echo 'not on PATH')"
echo "spring at $SPRING"
echo "nest   at $NEST"
date -u +"run       %Y-%m-%dT%H:%M:%SZ"
echo

for u in "$SPRING" "$NEST"; do
  if ! curl -sf -m 5 "$u/health" >/dev/null 2>&1; then
    echo "FAIL: nothing answering at $u/health. Run: docker compose up -d" >&2
    exit 1
  fi
done

: > "$OUT/validation.jsonl"

probe() {
  stack="$1"; url="$2"; label="$3"; body="$4"
  code=$(curl -s -o /tmp/vv.body -w '%{http_code}' -X POST "$url/payments" \
    -H 'Content-Type: application/json' -d "$body")
  printf "  %-7s %s  %s\n" "$stack" "$code" "$(head -c 160 /tmp/vv.body)"
  printf '{"stack":"%s","case":"%s","status":%s}\n' "$stack" "$label" "$code" \
    >> "$OUT/validation.jsonl"
}

run_case() {
  label="$1"; body="$2"
  echo "--- $label"
  echo "    $body"
  probe SPRING "$SPRING" "$label" "$body"
  probe NEST   "$NEST"   "$label" "$body"
  echo
}

run_case "well formed"        '{"amountInMinorUnits":10000,"currency":"USD","idempotencyKey":"ok"}'
run_case "string amount"      '{"amountInMinorUnits":"10000","currency":"USD","idempotencyKey":"k2"}'
run_case "undeclared field"   '{"amountInMinorUnits":1,"currency":"USD","idempotencyKey":"k3","isAdmin":true}'
run_case "empty object"       '{}'
run_case "negative and junk"  '{"amountInMinorUnits":-500,"currency":"ZZZ","idempotencyKey":""}'

echo "raw results: $OUT/validation.jsonl"
