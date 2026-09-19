#!/bin/sh
# THE DEFECT MATRIX. This script IS the testing episode.
#
# Introduces five REAL defects one at a time, runs every test layer against
# each, and records which layer catches it. The matrix that comes out is the
# argument: test layers are not a hierarchy of thoroughness, they catch
# DIFFERENT THINGS, and the cheapest layer that can prove a guarantee is the
# one that should.
#
#   docker compose up -d
#   ./scripts/verify-defect-matrix.sh
#
# Every defect is reverted afterwards, including on failure.

set -e
cd "$(dirname "$0")/../nestjs-api"
OUT="../artifacts"
mkdir -p "$OUT"

DTO=src/payments/dto/create-payment.dto.ts
ENTITY=src/payments/payment.entity.ts
MODULE=src/payments/payments.module.ts
SERVICE=src/payments/payments.service.ts
BACKUP=$(mktemp -d)
cp "$DTO" "$ENTITY" "$MODULE" "$SERVICE" "$BACKUP/"
restore() {
  cp "$BACKUP/$(basename $DTO)" "$DTO"
  cp "$BACKUP/$(basename $ENTITY)" "$ENTITY"
  cp "$BACKUP/$(basename $MODULE)" "$MODULE"
  cp "$BACKUP/$(basename $SERVICE)" "$SERVICE"
}
trap restore EXIT INT TERM

# DROP THE SCHEMA BETWEEN DEFECTS.
#
# Without this the matrix LIES. synchronize:true will ADD a column or a
# constraint but it will not drop or rename one that already exists, so a
# defect that changes the schema leaves the previous correct schema in place
# and every layer passes. Defects 3 and 4 both reported a clean sweep for
# exactly this reason before the reset was added.
#
# It is also the episode's argument for migrations in miniature: synchronize
# cannot express "remove this", which is most of what a real schema change is.
reset_schema() {
  docker compose -f ../compose.yaml exec -T postgres \
    psql -U payments -d payments_node -c 'DROP TABLE IF EXISTS payments CASCADE;' >/dev/null 2>&1 || true
}

layer_result() {
  # returns PASS or FAIL for one layer file
  if npx vitest run "test/layers/$1" >/dev/null 2>&1; then echo "pass"; else echo "FAIL"; fi
}

run_all_layers() {
  reset_schema
  printf "    %-14s %s\n" "1 domain"      "$(layer_result 1-domain.spec.ts)"
  printf "    %-14s %s\n" "2 wiring"      "$(layer_result 2-wiring.spec.ts)"
  printf "    %-14s %s\n" "3 contract"    "$(layer_result 3-contract.spec.ts)"
  printf "    %-14s %s\n" "4 integration" "$(layer_result 4-integration.spec.ts)"
  printf "    %-14s %s\n" "5 concurrency" "$(layer_result 5-concurrency.spec.ts)"
}

echo "=== defect matrix ==="
echo "node $(node -v)"
date -u +"run  %Y-%m-%dT%H:%M:%SZ"
echo

echo "--- DEFECT 0: none. The baseline. Everything should pass."
run_all_layers
echo

echo "--- DEFECT 1: the provider is missing from the module"
perl -0pi -e 's/providers: \[PaymentsService\],/providers: [],/' "$MODULE"
run_all_layers
restore
echo

echo "--- DEFECT 2: validation decorators removed from the DTO"
perl -0pi -e 's/\@IsInt\([^)]*\)//g; s/\@Min\(1, \{[^}]*\}\)//g; s/\@IsIn\(\[[^\]]*\], \{[^}]*\}\)//g; s/\@IsNotEmpty\(\{[^}]*\}\)//g' "$DTO"
run_all_layers
restore
echo

echo "--- DEFECT 3: wrong database column name"
perl -0pi -e "s/name: 'idempotency_key'/name: 'idempotency_key_WRONG'/" "$ENTITY"
run_all_layers
restore
echo

echo "--- DEFECT 4: the unique constraint is removed"
perl -0pi -e "s/\@Unique\('uq_payments_idempotency_key', \['idempotencyKey'\]\)//" "$ENTITY"
run_all_layers
restore
echo

echo "--- DEFECT 5: the idempotency lookup is removed (the naive service)"
perl -0pi -e 's/const existing = await this\.payments\.findOne\(\{\s*where: \{ idempotencyKey: request\.idempotencyKey \},\s*\}\);\s*if \(existing\) \{\s*return toPayment\(existing\);\s*\}//s' "$SERVICE"
run_all_layers
restore
echo

echo "matrix complete. All defects reverted."
