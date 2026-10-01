// Episode 31. Spring MVC's SseEmitter and Nest's @Sse as real processes: how long a stream lives,
// what happens when the client leaves, Last-Event-ID on reconnect, and compression.
// Run by scripts/verify-sse.sh.
import { spawn } from 'node:child_process';
import http from 'node:http';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../nestjs-api/package.json', import.meta.url));
const { EventSource } = require('eventsource');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-sse/target/spring-sse-probe-0.0.1-SNAPSHOT.jar';
const ONLY = process.env.ONLY;
const procs = [];

function server(stack, port, flags = []) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep30-sse/main.js', String(port), ...flags], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
        ...(flags.includes('resume') ? ['--resume=true'] : []),
        ...(flags.includes('compression') ? ['--server.compression.enabled=true', '--server.compression.min-response-size=0'] : [])]);
  procs.push(proc);
  const stopped = new Promise((r) => proc.on('exit', r));
  return { kill: async () => { proc.kill('SIGKILL'); await stopped; } };
}
const up = async (port) => {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/sse/stats`);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`port ${port} never came up`);
};
const stats = async (port) => (await fetch(`http://127.0.0.1:${port}/sse/stats`)).json();

/* Reads the stream the way EventSource does, recording each event id and when it arrived. */
function stream(port, headers = {}) {
  const t0 = Date.now();
  const events = [];
  let ended = null;
  let encoding = 'none';
  const req = http.get({ host: '127.0.0.1', port, path: '/sse/payments', headers: { accept: 'text/event-stream', ...headers } }, (res) => {
    encoding = res.headers['content-encoding'] ?? 'none';
    const body = encoding === 'gzip' ? res.pipe(zlib.createGunzip({ flush: zlib.constants.Z_SYNC_FLUSH })) : res;
    let buf = '';
    body.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const id = /^id:\s?(.*)$/m.exec(block)?.[1];
        if (id) events.push({ id: Number(id), at: Date.now() - t0 });
      }
    });
    body.on('end', () => (ended ??= Date.now() - t0));
    res.on('close', () => (ended ??= Date.now() - t0));
  });
  req.on('error', () => (ended ??= Date.now() - t0));
  return { events, get ended() { return ended; }, get encoding() { return encoding; }, abort: () => req.destroy() };
}
const until = async (fn, ms) => { const end = Date.now() + ms; while (!fn() && Date.now() < end) await wait(50); };

try {
  if (!ONLY || ONLY === 'A') {
    // A: how long does a stream live with nothing configured? Watch both for 70 s.
    const spring = server('spring', 18301);
    const nest = server('nest', 13301);
    await Promise.all([up(18301), up(13301)]);
    const s = stream(18301);
    const n = stream(13301);
    await wait(70000);
    for (const [label, st, port] of [['Spring, A, SseEmitter with no timeout argument', s, 18301], ['Nest, A, @Sse returning an Observable', n, 13301]]) {
      const end = st.ended === null ? 'still open after 70 s' : `the stream ended after ${(st.ended / 1000).toFixed(1)} s`;
      const extra = port === 18301 ? `, the emitter reported ${(await stats(port)).ended}` : '';
      console.log(`  ${label}: ${end}, events received ${st.events.length}${extra}`);
    }
    s.abort(); n.abort();
    await Promise.all([spring.kill(), nest.kill()]);
  }

  if (!ONLY || ONLY === 'B') {
    // B: the client leaves after 3 events. Is the server still producing for it 5 s later?
    for (const [stack, port, label] of [['spring', 18311, 'Spring, B, SseEmitter on a scheduled sender'], ['nest', 13311, 'Nest, B, @Sse with an interval Observable']]) {
      const srv = server(stack, port);
      await up(port);
      const st = stream(port);
      await until(() => st.events.length >= 3, 10000);
      st.abort();
      await wait(1500);
      const before = await stats(port);
      await wait(5000);
      const after = await stats(port);
      console.log(`  ${label}, the client left after 3 events: open streams afterwards ${after.open}, events produced in the next 5 s ${after.produced - before.produced}`);
      await srv.kill();
    }
  }

  if (!ONLY || ONLY === 'C') {
    // C: drop the connection after 3 events and reconnect with Last-Event-ID, as EventSource does.
    for (const [stack, port, flags, label] of [
      ['spring', 18321, [], 'Spring, C, the header not read'],
      ['nest', 13321, [], 'Nest, C, the header not read'],
      ['spring', 18322, ['resume'], 'Spring, C, reading Last-Event-ID'],
      ['nest', 13322, ['resume'], 'Nest, C, reading Last-Event-ID'],
    ]) {
      const srv = server(stack, port, flags);
      await up(port);
      const first = stream(port);
      await until(() => first.events.length >= 3, 10000);
      first.abort();
      const last = first.events.at(-1).id;
      const again = stream(port, { 'last-event-id': String(last) });
      await until(() => again.events.length >= 1, 10000);
      again.abort();
      console.log(`  ${label}: received ids ${first.events.map((e) => e.id).join(', ')}, reconnected with Last-Event-ID ${last}, the first id after reconnecting ${again.events[0]?.id}`);
      await srv.kill();
    }
  }

  if (!ONLY || ONLY === 'D') {
    // D: compression switched on the obvious way, a client that accepts gzip, as browsers do.
    for (const [stack, port, label] of [
      ['spring', 18331, 'Spring, D, server.compression.enabled=true'],
      ['nest', 13331, 'Nest, D, app.use(compression())'],
    ]) {
      const srv = server(stack, port, ['compression']);
      await up(port);
      const st = stream(port, { 'accept-encoding': 'gzip' });
      await wait(10000);
      st.abort();
      const first = st.events[0] ? `first event after ${(st.events[0].at / 1000).toFixed(1)} s` : 'no event at all';
      console.log(`  ${label}: content encoding ${st.encoding}, in 10 s ${first}, events received ${st.events.length}`);
      await srv.kill();
    }
  }
  if (!ONLY || ONLY === 'E') {
    // E: a real EventSource client for 70 s, which reconnects by itself and sends Last-Event-ID.
    for (const [stack, port, flags, label] of [
      ['spring', 18341, [], 'Spring, E, EventSource, the header not read'],
      ['spring', 18342, ['resume'], 'Spring, E, EventSource, reading Last-Event-ID'],
      ['nest', 13341, [], 'Nest, E, EventSource, the header not read'],
    ]) {
      const srv = server(stack, port, flags);
      await up(port);
      const ids = [];
      let opens = 0;
      const es = new EventSource(`http://127.0.0.1:${port}/sse/payments`);
      es.onopen = () => opens++;
      es.onmessage = (e) => ids.push(Number(e.lastEventId));
      await wait(70000);
      es.close();
      const repeats = ids.length - new Set(ids).size;
      console.log(`  ${label}, 70 s: connections opened ${opens}, events received ${ids.length}, ids received more than once ${repeats}, highest id ${Math.max(...ids)}`);
      await srv.kill();
    }
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
}
