// Episode 26. Background work, measured with real processes: SIGKILL means a crash, and Redis keeps
// the record of what actually finished. Run by scripts/verify-queues.sh.
import { execSync, spawn } from 'node:child_process';

const redisId = execSync('docker run -d --rm -p 127.0.0.1::6379 redis:8-alpine').toString().trim();
const redisPort = execSync(`docker port ${redisId} 6379`).toString().trim().split(':').pop();
const redisUrl = `redis://127.0.0.1:${redisPort}`;
const pgId = execSync('docker run -d --rm -e POSTGRES_PASSWORD=payments -p 127.0.0.1::5432 postgres:18-alpine').toString().trim();
const pgPort = execSync(`docker port ${pgId} 5432`).toString().trim().split(':').pop();
const databaseUrl = `postgres://postgres:payments@127.0.0.1:${pgPort}/postgres`;
const psql = (sql) => execSync(`docker exec ${pgId} psql -U postgres -tAc "${sql}"`).toString().trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const redis = (cmd) => execSync(`docker exec ${redisId} redis-cli ${cmd}`).toString().trim();
const count = (list) => Number(redis(`LLEN ${list}`));
let nextPort = 3610;

async function up(url) {
  for (let i = 0; i < 200; i++) {
    try {
      await fetch(url, { method: 'OPTIONS' });
      return;
    } catch {
      await wait(100);
    }
  }
  throw new Error(`${url} never came up`);
}

async function start(stack, env = {}) {
  const port = nextPort++;
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep25-queues/main.js', redisUrl, String(port)], { cwd: 'nestjs-api', env: { ...process.env, DATABASE_URL: databaseUrl, ...env } })
    : spawn(process.env.JAVA_HOME + '/bin/java', ['-jar', 'spring-queues/target/spring-queues-0.0.1-SNAPSHOT.jar',
      `--server.port=${port}`, `--spring.data.redis.port=${redisPort}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
      ...(env.SPRING_POOL ? [`--spring.task.execution.pool.core-size=${env.SPRING_POOL}`, `--spring.task.execution.pool.max-size=${env.SPRING_POOL}`] : [])]);
  const url = `http://127.0.0.1:${port}`;
  await up(url);
  return { url, kill: () => proc.kill('SIGKILL') };
}

const post = async (url) => {
  const t = performance.now();
  const res = await fetch(url, { method: 'POST' });
  return { status: res.status, ms: Math.round(performance.now() - t), body: await res.text() };
};

try {
  // A and E: five 2 s receipts, the process killed 1 s in, then restarted.
  for (const [stack, label, mode] of [['spring', 'Spring @Async', ''], ['nest', 'Nest, a promise nobody awaits', 'promise'], ['nest', 'Nest, BullMQ', 'bull']]) {
    redis('FLUSHALL');
    let app = await start(stack);
    const res = await post(`${app.url}/receipts?count=5&ms=2000${mode ? `&mode=${mode}` : ''}`);
    await wait(1000);
    app.kill();
    app = await start(stack);
    const restarted = Date.now();
    await wait(12000);
    const after12 = count('sent');
    let last = '';
    if (mode === 'bull') {
      while (count('sent') < 5 && Date.now() - restarted < 90000) await wait(250);
      last = `; the fifth, running when the process died, was sent ${((Date.now() - restarted) / 1000).toFixed(1)} s after the restart`;
    }
    console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, A, ${label}: POST answered ${res.status} in ${res.ms} ms; 5 receipts, killed 1 s in, restarted: sent ${after12} of 5 within 12 s${last}`);
    app.kill();
  }

  // B: a charge job that records its side effect, then the process dies before the job completes.
  redis('FLUSHALL');
  let app = await start('nest');
  await post(`${app.url}/charges`);
  await wait(1000);
  app.kill();
  app = await start('nest');
  const restarted = Date.now();
  while (count('charged') < 2 && Date.now() - restarted < 90000) await wait(250);
  console.log(`  Nest, B, BullMQ defaults, a job that charged, then the process died before it completed: charged ${count('charged')} times, the job ran again ${((Date.now() - restarted) / 1000).toFixed(1)} s after the restart`);
  app.kill();

  // C: a job that fails once.
  for (const [label, path] of [['default job options', '/receipts/flaky'], ['attempts 3, exponential backoff 200 ms', '/receipts/flaky?retries=1']]) {
    redis('FLUSHALL');
    app = await start('nest');
    await post(`${app.url}${path}`);
    await wait(2000);
    console.log(`  Nest, C, BullMQ, ${label}, a job that fails once: attempts ${count('attempts')}, sent ${count('sent')}`);
    app.kill();
  }
  redis('FLUSHALL');
  app = await start('spring');
  const plain = await post(`${app.url}/receipts/flaky`);
  const future = await post(`${app.url}/receipts/flaky-future`);
  await wait(500);
  console.log(`  Spring, C, @Async void that throws: POST answered ${plain.status}, attempts ${count('attempts') - 1}, the caller never saw the error`);
  console.log(`  Spring, C, @Async returning CompletableFuture, joined: POST answered ${future.status} ${future.body}`);
  app.kill();

  // E: the payment commits to Postgres, then the process dies before the receipt is queued.
  for (let i = 0; i < 60; i++) {
    try {
      psql('SELECT 1');
      break;
    } catch {
      await wait(500);
    }
  }
  redis('FLUSHALL');
  app = await start('nest', { CRASH_AFTER_COMMIT: '1' });
  const crashed = await fetch(`${app.url}/payments`, { method: 'POST' }).then((r) => `answered ${r.status}`, () => 'never answered: the process died');
  app = await start('nest');
  await wait(5000);
  console.log(`  Nest, E, commit the payment to Postgres, crash before queue.add: the request ${crashed}; after the restart, payments in Postgres ${psql('SELECT count(*) FROM ep26_payments')}, receipt jobs in Redis ${redis("EVAL \"return #redis.call('keys','bull:receipts:[0-9]*')\" 0")}, receipts sent ${count('sent')}`);
  app.kill();

  // D: ten 500 ms receipts, concurrency set explicitly on both.
  for (const [stack, label, env, mode] of [['nest', 'BullMQ, worker concurrency 1 (the default)', { RECEIPTS_CONCURRENCY: '1' }, '&mode=bull'], ['nest', 'BullMQ, worker concurrency 5', { RECEIPTS_CONCURRENCY: '5' }, '&mode=bull'], ['spring', '@Async, executor of 1 thread', { SPRING_POOL: '1' }, ''], ['spring', '@Async, executor of 5 threads', { SPRING_POOL: '5' }, '']]) {
    redis('FLUSHALL');
    app = await start(stack, env);
    const t = Date.now();
    await post(`${app.url}/receipts?count=10&ms=500${mode}`);
    while (count('sent') < 10 && Date.now() - t < 30000) await wait(20);
    console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, D, ${label}, ten 500 ms receipts: all sent in ${((Date.now() - t) / 1000).toFixed(1)} s`);
    app.kill();
  }
} finally {
  execSync(`docker stop ${redisId} ${pgId}`);
}
