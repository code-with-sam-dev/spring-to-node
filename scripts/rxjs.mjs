// Episode 34. Spring WebFlux with Reactor and NestJS with RxJS as real processes: what a handler
// returning a stream sends, the default concurrency of flatMap and mergeMap, and a client that
// leaves before the work is done. Run by scripts/verify-rxjs.sh.
import { spawn } from 'node:child_process';
import http from 'node:http';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-reactive/target/spring-reactive-probe-0.0.1-SNAPSHOT.jar';
const procs = [];

function server(stack, port) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep33-rxjs/main.js', String(port)], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off']);
  procs.push(proc);
}
const up = async (port) => {
  for (let i = 0; i < 160; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/stats`);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`port ${port} never came up`);
};
const get = async (port, path) => (await fetch(`http://127.0.0.1:${port}${path}`)).text();
const abortAfter = (port, path, ms) => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port, path }, () => resolve('answered'));
  req.on('error', () => resolve('aborted'));
  setTimeout(() => { req.destroy(); resolve('aborted'); }, ms);
});

try {
  server('spring', 18601);
  server('nest', 13601);
  await Promise.all([up(18601), up(13601)]);
  const stacks = [['Spring', 18601, 'WebFlux, Flux.just(1, 2, 3)'], ['Nest', 13601, 'a controller returning of(1, 2, 3)']];

  // A: a handler returns a stream of three values. What is in the response body?
  for (const [who, port, label] of stacks) {
    console.log(`  ${who}, A, ${label}: the response body was ${await get(port, '/payments/ids')}`);
  }

  // B: 1000 tasks of 200 ms each through flatMap / mergeMap with no concurrency argument.
  for (const [who, port, op] of [['Spring', 18601, 'Reactor flatMap'], ['Nest', 13601, 'RxJS mergeMap']]) {
    const t = Date.now();
    const r = JSON.parse(await get(port, '/fanout?n=1000'));
    console.log(`  ${who}, B, ${op} with no concurrency argument, 1000 tasks of 200 ms: done ${r.done}, peak in flight ${r.peakInFlight}, ${Date.now() - t} ms`);
  }
  const t = Date.now();
  const r = JSON.parse(await get(13601, '/fanout?n=1000&concurrency=256'));
  console.log(`  Nest, B, RxJS mergeMap with concurrency 256, 1000 tasks of 200 ms: done ${r.done}, peak in flight ${r.peakInFlight}, ${Date.now() - t} ms`);

  // C: the client leaves after 500 ms of a 2 s charge. Did the charge still happen?
  for (const [who, port, label] of [['Spring', 18601, 'WebFlux, Mono.delay then map'], ['Nest', 13601, 'a controller returning timer then map']]) {
    await abortAfter(port, '/slow', 500);
    await wait(2500);
    const { charged } = JSON.parse(await get(port, '/stats'));
    console.log(`  ${who}, C, ${label}, the client left after 500 ms of a 2 s charge: charged afterwards ${charged}`);
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
}
