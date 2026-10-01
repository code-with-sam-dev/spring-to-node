// Episode 38. A payment in flight when SIGTERM arrives, on Spring Boot with Actuator and on NestJS
// with Terminus, as real processes: does it finish, what does readiness say during the drain, and
// are new requests served. Run by scripts/verify-health.sh.
import { spawn } from 'node:child_process';
import http from 'node:http';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-health/target/spring-health-probe-0.0.1-SNAPSHOT.jar';

const get = (port, path) => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port, path, agent: false }, (res) => {
    let b = '';
    res.on('data', (d) => (b += d));
    res.on('end', () => resolve({ status: res.statusCode, body: b }));
  });
  req.on('error', (e) => resolve({ error: e.code ?? e.message }));
});
const outcome = (r) => (r.error ? `failed: ${r.error}` : `HTTP ${r.status}`);

async function run(stack, port, mode, label) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep37-health/main.js', String(port), mode], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
        '--management.endpoint.health.probes.enabled=true']);
  const exited = new Promise((r) => proc.on('exit', (code, signal) => r({ code, signal, at: Date.now() })));
  const readyPath = stack === 'nest' ? '/health/ready' : '/actuator/health/readiness';
  for (let i = 0; i < 160; i++) {
    const r = await get(port, '/fast');
    if (!r.error) break;
    await wait(250);
  }
  const before = await get(port, readyPath);
  const slow = get(port, '/slow');
  await wait(500);
  const t0 = Date.now();
  proc.kill('SIGTERM');
  const seen = [];
  let done = false;
  exited.then(() => (done = true));
  while (!done && Date.now() - t0 < 6000) {
    const [r, f] = await Promise.all([get(port, readyPath), get(port, '/fast')]);
    seen.push(`${outcome(r)}/${outcome(f)}`);
    await wait(150);
  }
  const s = await slow;
  const e = await exited;
  if (!done) proc.kill('SIGKILL');
  const distinct = [...new Set(seen)];
  console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, ${label}: readiness before ${outcome(before)}; SIGTERM 500 ms into a 3 s payment: the payment ${outcome(s)}${s.body ? ` "${s.body}"` : ''}; during the drain, readiness/new requests ${distinct.join(' then ') || 'none observed'}; exited after ${e.at - t0} ms`);
}

await run('spring', 18951, null, 'A, Spring Boot defaults (server.shutdown graceful), readiness probe enabled');
await run('nest', 13951, 'none', 'A, Nest as created, no shutdown hooks');
await run('nest', 13952, 'hooks', 'A, app.enableShutdownHooks()');
await run('nest', 13953, 'drain', 'B, shutdown hooks, readiness 503 on shutdown, Terminus gracefulShutdownTimeoutMs 2000');
