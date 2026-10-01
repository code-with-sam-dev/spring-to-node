// Episode 40. A tenant per request on Spring Boot and NestJS, and a feature flag rollout evaluated by
// both, as real processes. Run by scripts/verify-tenancy.sh.
import { spawn } from 'node:child_process';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-tenancy/target/spring-tenancy-probe-0.0.1-SNAPSHOT.jar';
const procs = [];

function spring(port, extra) {
  procs.push(spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off', '--flags-file=flags/flags.json', ...extra]));
}
function nest(port, mode) {
  procs.push(spawn('node', ['dist/ep39-tenancy/main.js', String(port), mode], { cwd: 'nestjs-api' }));
}
const up = async (port) => {
  for (let i = 0; i < 160; i++) {
    try { await fetch(`http://127.0.0.1:${port}/whoami`); return; } catch { await wait(250); }
  }
  throw new Error(`port ${port} never came up`);
};
const whoami = async (port, tenant) => (await fetch(`http://127.0.0.1:${port}/whoami`, { headers: tenant ? { 'x-tenant': tenant } : {} })).text();

try {
  spring(18971, ['--tenancy=naive', '--server.tomcat.threads.max=1']);
  spring(18972, ['--tenancy=fixed', '--server.tomcat.threads.max=1']);
  nest(13971, 'naive');
  nest(13972, 'als');
  nest(13973, 'scoped');
  await Promise.all([18971, 18972, 13971, 13972, 13973].map(up));

  // A: Spring. One request from tenant acme, then a request with no tenant header, on the same thread.
  for (const [port, label] of [[18971, 'a filter that sets the ThreadLocal and never clears it'], [18972, 'a filter that clears it in finally']]) {
    const first = await whoami(port, 'acme');
    const second = await whoami(port);
    console.log(`  Spring, A, ${label}, one request thread: tenant acme saw "${first}"; the next request, no tenant header, saw "${second}"`);
  }

  // A: Nest. Two requests in flight together: acme, then globex 50 ms later; each awaits 200 ms.
  for (const [port, label] of [[13971, 'the tenant in a module-level variable'], [13972, 'the tenant in AsyncLocalStorage'], [13973, 'the tenant from a request-scoped provider']]) {
    const a = whoami(port, 'acme');
    await wait(50);
    const b = whoami(port, 'globex');
    console.log(`  Nest, A, ${label}, two requests in flight together: acme saw "${await a}", globex saw "${await b}"`);
  }

  // B: what a request-scoped provider costs. 100 requests, then count the Payments instances.
  for (const [port, label] of [[13972, 'Payments a singleton, the tenant from AsyncLocalStorage'], [13973, 'Payments declared a singleton, injecting a request-scoped tenant']]) {
    const before = (await (await fetch(`http://127.0.0.1:${port}/created`)).json()).paymentsCreated;
    await Promise.all(Array.from({ length: 100 }, () => whoami(port, 'acme')));
    const after = (await (await fetch(`http://127.0.0.1:${port}/created`)).json()).paymentsCreated;
    console.log(`  Nest, B, ${label}: Payments instances created by 100 requests ${after - before}`);
  }

  // C: a 20% rollout of the new checkout to user-1 .. user-1000, evaluated by both stacks.
  for (const [how, label] of [['naive', 'hand-ported bucketing: Java floorMod(hashCode, 100) < 20, the same hash in JavaScript with % 100 < 20'], ['openfeature', 'OpenFeature with the flagd provider, one flags.json, fractional 20 / 80']]) {
    const s = await (await fetch(`http://127.0.0.1:18972/rollout?n=1000&how=${how}`)).text();
    const n = (await (await fetch(`http://127.0.0.1:13972/rollout?n=1000&how=${how}`)).text()).replace(/"/g, '');
    let differ = 0;
    for (let i = 0; i < 1000; i++) if (s[i] !== n[i]) differ++;
    const count = (x) => [...x].filter((c) => c === '1').length;
    console.log(`  Both, C, ${label}: Spring turned it on for ${count(s)} of 1000, Nest for ${count(n)}; users who got a different answer from the two stacks ${differ}`);
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
}
