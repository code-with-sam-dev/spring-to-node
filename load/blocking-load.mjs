// Measures what one blocking call does to EVERY OTHER REQUEST in the process.
//
// THE SHAPE OF THE EXPERIMENT, and it is the same on both stacks:
//   1. poll /health continuously and record each round trip
//   2. part way through, fire ONE request at the CPU-heavy endpoint
//   3. keep polling
//   4. report health latency BEFORE, DURING and AFTER
//
// A Spring developer expects the answer to be "nothing happens, it is on
// another thread". On Node that is true only if the work yields. This one
// cannot.
//
//   node load/blocking-load.mjs --url=http://localhost:3005 --path=/receipts/sign
//   node load/blocking-load.mjs --url=http://localhost:8080 --path=/receipts/sign
//
// Every number printed comes from this run. None is written in advance.

const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.split('=')[1] : d;
};

const url = arg('url', 'http://localhost:3005');
const heavyPath = arg('path', '/receipts/sign');
const rounds = arg('rounds', '400000');
const pollMs = Number(arg('poll', '25'));
const beforeMs = Number(arg('before', '1500'));
const afterMs = Number(arg('after', '2500'));

const samples = [];
let phase = 'before';
let polling = true;

async function poll() {
  while (polling) {
    // STAMP THE PHASE WHEN THE REQUEST STARTS, NOT WHEN IT FINISHES.
    //
    // The first version stamped it on completion, and that destroyed the whole
    // measurement: the health check that was IN FLIGHT when the blocking call
    // began did not return until the block ended, by which time the phase had
    // already moved to 'after'. So 'during' reported NO SAMPLES while 'after'
    // carried a 525ms maximum that was really the blocked request.
    //
    // The instrument has to record when the clock STARTED. A latency sample
    // belongs to the moment it began waiting.
    const startedIn = phase;
    const t0 = performance.now();
    try {
      await fetch(`${url}/health`);
      samples.push({ phase: startedIn, ms: performance.now() - t0 });
    } catch {
      samples.push({ phase: startedIn, ms: -1 });
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const report = (label) => {
  const ms = samples.filter((s) => s.phase === label && s.ms >= 0).map((s) => s.ms);
  const failed = samples.filter((s) => s.phase === label && s.ms < 0).length;
  if (!ms.length) return console.log(`  ${label.padEnd(7)} no samples`);
  console.log(
    `  ${label.padEnd(7)} n=${String(ms.length).padStart(3)}  ` +
      `p50 ${pct(ms, 50).toFixed(1).padStart(8)}ms  ` +
      `p95 ${pct(ms, 95).toFixed(1).padStart(8)}ms  ` +
      `max ${Math.max(...ms).toFixed(1).padStart(8)}ms` +
      (failed ? `  FAILED ${failed}` : ''),
  );
};

console.log('=== one blocking call, and what it does to everything else ===');
console.log(`target     ${url}`);
console.log(`heavy path ${heavyPath}?rounds=${rounds}`);
console.log(`node       ${process.version}`);
console.log(`run        ${new Date().toISOString()}`);
console.log('');

const pollLoop = poll();
await new Promise((r) => setTimeout(r, beforeMs));

phase = 'during';
const heavyStart = performance.now();
const heavy = fetch(`${url}${heavyPath}?rounds=${rounds}`)
  .then((r) => r.json())
  .catch((e) => ({ error: String(e) }));

const heavyResult = await heavy;
const heavyMs = performance.now() - heavyStart;

phase = 'after';
await new Promise((r) => setTimeout(r, afterMs));
polling = false;
await pollLoop;

console.log(`the heavy request itself took ${heavyMs.toFixed(0)}ms`);
console.log(`it returned ${JSON.stringify(heavyResult)}`);
console.log('');
console.log('health endpoint latency:');
report('before');
report('during');
report('after');

const before = samples.filter((s) => s.phase === 'before' && s.ms >= 0).map((s) => s.ms);
const during = samples.filter((s) => s.phase === 'during' && s.ms >= 0).map((s) => s.ms);
if (before.length && during.length) {
  const factor = pct(during, 95) / pct(before, 95);
  console.log('');
  console.log(
    `p95 health latency went from ${pct(before, 95).toFixed(1)}ms to ` +
      `${pct(during, 95).toFixed(1)}ms, a factor of ${factor.toFixed(1)}`,
  );
}

const fs = await import('node:fs/promises');
await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile(
  'artifacts/blocking.json',
  JSON.stringify({ url, heavyPath, rounds, heavyMs, samples, ranAt: new Date().toISOString() }, null, 2),
);
console.log('raw result: artifacts/blocking.json');
