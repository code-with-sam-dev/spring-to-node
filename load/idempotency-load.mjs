// Fires N concurrent payment requests that all carry the SAME idempotency key,
// then counts what actually landed.
//
// THE OUTPUT OF THIS SCRIPT IS THE FLAGSHIP'S OPENING SHOT AND ITS CLOSING ONE.
// It runs unchanged in both places. Before the fix it reports more than one
// payment; after the fix it reports exactly one.
//
// THE DUPLICATE COUNT IS NOT PREDICTABLE AND MUST NEVER BE WRITTEN INTO A
// SCRIPT IN ADVANCE. It depends on timing, pool size and machine. It might be
// 2, it might be 50. Whatever it prints on the day is what goes on screen.
//
//   node load/idempotency-load.mjs --url=http://localhost:3005 --requests=50
//
// Exits 0 always: before the fix, "wrong" IS the finding.

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};

const url = arg('url', 'http://localhost:3000');
const requests = Number(arg('requests', '50'));
const key = arg('key', `race-${Date.now()}`);

const body = JSON.stringify({
  amountInMinorUnits: 10_000,
  currency: 'USD',
  idempotencyKey: key,
});

console.log('=== idempotency race ===');
console.log(`target        ${url}`);
console.log(`node          ${process.version}`);
console.log(`requests      ${requests}`);
console.log(`shared key    ${key}`);
console.log(`run           ${new Date().toISOString()}`);
console.log('');

const started = Date.now();

// All at once, deliberately. Promise.all with no concurrency limit is exactly
// the pattern the async episode warns about, and here it is the point: we WANT
// them to collide.
const settled = await Promise.allSettled(
  Array.from({ length: requests }, () =>
    fetch(`${url}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })),
  ),
);

const elapsed = Date.now() - started;

const byStatus = new Map();
for (const s of settled) {
  const code = s.status === 'fulfilled' ? s.value.status : 'network error';
  byStatus.set(code, (byStatus.get(code) ?? 0) + 1);
}

// Count what the server actually holds for this key, which is the only number
// that matters. The response codes can all say 201 and still be wrong.
const all = await fetch(`${url}/payments`).then((r) => r.json());
const forThisKey = all.filter((p) => p.idempotencyKey === key);
const distinctIds = new Set(forThisKey.map((p) => p.id));

console.log(`Requests sent     ${requests}`);
for (const [code, count] of [...byStatus].sort()) {
  console.log(`  status ${code}      ${count}`);
}
console.log(`Payments created  ${forThisKey.length}`);
console.log(`Distinct ids      ${distinctIds.size}`);
console.log(`Expected          1`);
console.log(`Elapsed           ${elapsed}ms`);
console.log('');
console.log(
  forThisKey.length === 1
    ? 'INVARIANT HELD: one request, one payment.'
    : `INVARIANT VIOLATED: ${forThisKey.length} payments for one idempotency key.`,
);

const fs = await import('node:fs/promises');
await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile(
  'artifacts/idempotency.json',
  JSON.stringify(
    {
      url,
      node: process.version,
      requests,
      key,
      elapsedMs: elapsed,
      statuses: Object.fromEntries(byStatus),
      paymentsCreated: forThisKey.length,
      distinctIds: distinctIds.size,
      expected: 1,
      ranAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log('raw result: artifacts/idempotency.json');
