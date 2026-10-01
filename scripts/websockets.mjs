// Episode 30. Spring STOMP and Nest gateways as real processes: protocols, two instances, and a
// client that stops reading. Run by scripts/verify-websockets.sh.
import { execSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../nestjs-api/package.json', import.meta.url));
const WebSocket = require('ws');
const { io } = require('socket.io-client');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-websocket/target/spring-websocket-probe-0.0.1-SNAPSHOT.jar';
const ONLY = process.env.ONLY;

const redis = execSync('docker run -d --rm -p 127.0.0.1::6379 redis:8-alpine').toString().trim();
const redisUrl = `redis://127.0.0.1:${execSync(`docker port ${redis} 6379`).toString().trim().split(':').pop()}`;
const rabbit = execSync(`docker run -d --rm -p 127.0.0.1::61613 rabbitmq:4.1-alpine sh -c "echo 'loopback_users = none' > /etc/rabbitmq/conf.d/90-probe.conf && rabbitmq-plugins enable --offline rabbitmq_stomp && exec docker-entrypoint.sh rabbitmq-server"`).toString().trim();
const stompPort = execSync(`docker port ${rabbit} 61613`).toString().trim().split(':').pop();
const containers = [redis, rabbit];

const procs = [];
function server(stack, port, mode) {
  const lines = [];
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep29-websockets/main.js', String(port), mode, redisUrl], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off', ...(mode === 'relay' ? [`--relay-port=${stompPort}`] : []), ...(mode === 'slow' ? ['--logging.level.org.springframework.web.socket=DEBUG'] : [])]);
  proc.stdout.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => lines.push({ at: Date.now(), l })));
  procs.push(proc);
  const stopped = new Promise((r) => proc.on('exit', r));
  return { lines, proc, kill: async () => { proc.kill('SIGKILL'); await stopped; } };
}
const up = async (port) => {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`port ${port} never came up`);
};

/* A hand-rolled STOMP client over a plain WebSocket, so the probe can reach the TCP socket. */
const frame = (cmd, headers, body = '') => `${cmd}\n${Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n')}\n\n${body}\0`;
async function stomp(port, topic) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, ['v12.stomp']);
  const got = [];
  let connected;
  const ready = new Promise((r) => (connected = r));
  ws.on('message', (d) => {
    const s = d.toString();
    if (s.startsWith('CONNECTED')) connected();
    if (s.startsWith('MESSAGE')) got.push(s.slice(s.indexOf('\n\n') + 2).replace(/\0$/, ''));
  });
  const closed = new Promise((r) => ws.on('close', (code, reason) => r({ code, reason: reason.toString() })));
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
  ws.send(frame('CONNECT', { 'accept-version': '1.2', host: 'localhost', 'heart-beat': '0,0' }));
  await ready;
  ws.send(frame('SUBSCRIBE', { id: 'sub-0', destination: topic }));
  await wait(300);
  return { ws, got, closed, send: (dest, body) => ws.send(frame('SEND', { destination: dest, 'content-type': 'text/plain' }, body)) };
}
async function socketIo(port) {
  const s = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false });
  const got = [];
  s.on('payment', (id) => got.push(id));
  await new Promise((r, j) => { s.on('connect', r); s.on('connect_error', j); });
  return { s, got };
}
async function plainWs(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const got = [];
  ws.on('message', (d) => { const t = d.toString(); if (t.startsWith('{')) { const m = JSON.parse(t); if (m.event === 'payment') got.push(m.data); } });
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
  return { ws, got };
}

try {
  if (!ONLY || ONLY === 'A') {
    // A: which client can talk to which server.
    const nestIo = server('nest', 13101, 'io');
    const nestWs = server('nest', 13102, 'ws');
    const spring = server('spring', 18101, 'simple');
    await Promise.all([up(13101), up(13102), up(18101)]);
    const attempt = async (fn) => { try { return await fn(); } catch (e) { return `failed: ${e.message}`; } };
    const plainToIo = await attempt(async () => { const c = await plainWs(13101); c.ws.close(); return 'connected'; });
    console.log(`  Nest, A, a plain WebSocket client, the default Socket.IO gateway: ${plainToIo}`);
    const ioToIo = await attempt(async () => { const c = await socketIo(13101); c.s.emit('pay', 'pay_1'); await wait(300); c.s.close(); return `connected, broadcast received ${c.got.length}`; });
    console.log(`  Nest, A, a Socket.IO client, the default Socket.IO gateway: ${ioToIo}`);
    const plainToWs = await attempt(async () => { const c = await plainWs(13102); c.ws.send(JSON.stringify({ event: 'pay', data: 'pay_1' })); await wait(300); c.ws.close(); return `connected, broadcast received ${c.got.length}`; });
    console.log(`  Nest, A, a plain WebSocket client, the gateway on WsAdapter: ${plainToWs}`);
    const stompToSpring = await attempt(async () => { const c = await stomp(18101, '/topic/payments'); c.send('/app/pay', 'pay_1'); await wait(300); c.ws.close(); return `connected, broadcast received ${c.got.length}`; });
    console.log(`  Spring, A, a STOMP client over WebSocket, /ws: ${stompToSpring}`);
    const plainToSpring = await attempt(async () => {
      const ws = new WebSocket('ws://127.0.0.1:18101/ws');
      await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
      const replies = [];
      ws.on('message', (d) => replies.push(d.toString().split('\n')[0]));
      ws.send(JSON.stringify({ event: 'pay', data: 'pay_1' }));
      await wait(3000);
      const open = ws.readyState === WebSocket.OPEN;
      ws.close();
      return `connected; sent plain JSON, replies in 3 s ${replies.length}${replies.length ? ` (${replies[0]})` : ''}, socket still open ${open}`;
    });
    console.log(`  Spring, A, a plain WebSocket client, /ws: ${plainToSpring}`);
    await Promise.all([nestIo.kill(), nestWs.kill(), spring.kill()]);
  }

  if (!ONLY || ONLY === 'B') {
    // B: two instances, one client on each. A payment sent on instance one.
    for (const [stack, mode, label] of [
      ['spring', 'simple', 'Spring, B, the simple broker'],
      ['spring', 'relay', 'Spring, B, a STOMP broker relay to RabbitMQ'],
      ['nest', 'io', 'Nest, B, Socket.IO, the default adapter'],
      ['nest', 'io-redis', 'Nest, B, Socket.IO with the Redis adapter'],
    ]) {
      const [p1, p2] = stack === 'spring' ? [18111, 18112] : [13111, 13112];
      const a = server(stack, p1, mode);
      const b = server(stack, p2, mode);
      await Promise.all([up(p1), up(p2)]);
      await wait(stack === 'spring' && mode === 'relay' ? 3000 : 500);
      let one, two;
      if (stack === 'spring') {
        one = await stomp(p1, '/topic/payments');
        two = await stomp(p2, '/topic/payments');
        one.send('/app/pay', 'pay_1');
      } else {
        one = await socketIo(p1);
        two = await socketIo(p2);
        one.s.emit('pay', 'pay_1');
      }
      await wait(1000);
      console.log(`  ${label}, two instances, a payment sent on instance one: client on instance one received ${one.got.length}, client on instance two received ${two.got.length}`);
      (one.ws ?? one.s).close();
      (two.ws ?? two.s).close();
      await Promise.all([a.kill(), b.kill()]);
    }
  }

  if (!ONLY || ONLY === 'C') {
    // C: a client that stops reading, and 50,000 messages of 1 KB sent to it.
    const COUNT = 50000;
    for (const [stack, mode, label] of [
      ['spring', 'slow', 'Spring, C, STOMP, the defaults'],
      ['nest', 'ws', 'Nest, C, WsAdapter'],
      ['nest', 'io', 'Nest, C, Socket.IO'],
      ['nest', 'ws-guard', 'Nest, C, WsAdapter with a 512 KB limit per client'],
    ]) {
      const port = stack === 'spring' ? 18121 : 13121;
      const srv = server(stack, port, mode);
      await up(port);
      await wait(500);
      let tcp, close;
      const t0 = Date.now();
      if (stack === 'spring') {
        const c = await stomp(port, '/topic/flood');
        tcp = c.ws._socket;
        close = c.closed;
        tcp.pause();
        c.send('/app/flood', String(COUNT));
      } else if (mode === 'ws' || mode === 'ws-guard') {
        const c = await plainWs(port);
        tcp = c.ws._socket;
        close = new Promise((r) => c.ws.on('close', (code, reason) => r({ code, reason: reason.toString() })));
        tcp.pause();
        c.ws.send(JSON.stringify({ event: 'flood', data: COUNT }));
      } else {
        const c = await socketIo(port);
        tcp = c.s.io.engine.transport.ws._socket;
        close = new Promise((r) => c.s.on('disconnect', (reason) => r({ code: '-', reason })));
        tcp.pause();
        c.s.emit('flood', COUNT);
      }
      await wait(15000);
      const mem = srv.lines.filter((x) => x.l.startsWith('MEM')).at(-1)?.l ?? '';
      const closedLine = srv.lines.find((x) => x.l.startsWith('CLOSED'));
      const buffered = /buffered (\d+)/.exec(mem)?.[1];
      const limit = srv.lines.find((x) => / (exceeds|exceeded) the allowed limit /.test(x.l));
      const why = limit ? ` (${/((Buffer size|Send time).*allowed limit \d+)/.exec(limit.l)[1].replace(/ for session '[^']*'/, '')})` : '';
      const verdict = closedLine
        ? `the server closed the session after ${closedLine.at - t0} ms: ${closedLine.l.slice(7)}${why}`
        : `after 15 s the session was still open, about ${Math.round(Number(buffered) / 1048576)} MB queued for that socket`;
      console.log(`  ${label}, a client that stops reading, ${COUNT} messages of 1 KB: ${verdict}`);
      tcp.resume();
      await Promise.race([close, wait(500)]);
      await srv.kill();
    }
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
  for (const c of containers) execSync(`docker stop ${c}`, { stdio: 'ignore' });
}
