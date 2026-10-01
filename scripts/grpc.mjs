// Episode 33. Spring gRPC and a NestJS gRPC microservice serving one payments.proto, as real
// processes: what each server saw, what a client sees when a handler throws, and deadlines.
// Run by scripts/verify-grpc.sh.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../nestjs-api/package.json', import.meta.url));
const grpc = require('@grpc/grpc-js');
const loader = require('@grpc/proto-loader');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-grpc/target/spring-grpc-probe-0.0.1-SNAPSHOT.jar';
const PROTO = 'spring-grpc/src/main/proto/payments.proto';
const procs = [];

const def = loader.loadSync(PROTO, { longs: String, defaults: true });
const { Payments } = grpc.loadPackageDefinition(def).payments;

function server(stack, port, mode) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep32-grpc/main.js', String(port), ...(mode ? [mode] : [])], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--spring.grpc.server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off']);
  procs.push(proc);
  const stopped = new Promise((r) => proc.on('exit', r));
  return { kill: async () => { proc.kill('SIGKILL'); await stopped; } };
}
const client = (port) => new Payments(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
const call = (c, method, request, deadlineMs) => new Promise((resolve) => {
  const options = deadlineMs ? { deadline: Date.now() + deadlineMs } : {};
  c[method](request, options, (err, reply) => resolve(err ? { err } : { reply }));
});
const up = async (port) => {
  const c = client(port);
  for (let i = 0; i < 160; i++) {
    const r = await call(c, 'stats', {}, 1000);
    if (!r.err) return c;
    await wait(250);
  }
  throw new Error(`port ${port} never came up`);
};
const statusName = (code) => Object.entries(grpc.status).find(([, v]) => v === code)?.[0];

try {
  const spring = server('spring', 19501);
  const nest = server('nest', 19502);
  const nestFixed = server('nest', 19503, 'loader-options');
  const [s, n, nf] = await Promise.all([up(19501), up(19502), up(19503)]);
  const stacks = [['Spring', s, 'Spring gRPC'], ['Nest', n, 'Nest gRPC, default loader options'], ['Nest', nf, 'Nest gRPC, longs: Number and defaults: true']];

  // A: what each server saw. A zero amount and false capture, then a real amount.
  for (const [who, c, label] of stacks) {
    const zero = await call(c, 'charge', { paymentId: 'p1', amountCents: '0', capture: false });
    const real = await call(c, 'charge', { paymentId: 'p2', amountCents: '1999', capture: true });
    console.log(`  ${who}, A, ${label}, sent amount_cents 0 and capture false, the handler saw: ${zero.reply.seen}`);
    console.log(`  ${who}, A, ${label}, sent amount_cents 1999 and capture true, the handler saw: ${real.reply.seen}`);
  }
  // Past 2 to the 53: what longs: Number costs.
  for (const [who, c, label] of [stacks[0], stacks[2]]) {
    const big = await call(c, 'charge', { paymentId: 'p9', amountCents: '9007199254740993', capture: true });
    console.log(`  ${who}, A, ${label}, sent amount_cents 9007199254740993, the handler saw: ${big.reply.seen}`);
  }

  // B: a handler that throws. What does the client receive?
  for (const [who, c, label] of stacks.slice(0, 2)) {
    const r = await call(c, 'fail', { paymentId: 'p3' });
    console.log(`  ${who}, B, ${label}, a handler that throws "ledger offline at ledger-db:5432": status ${statusName(r.err.code)}, details "${r.err.details}"`);
  }

  // C: a 300 ms deadline on a call that takes 1 s. Did the server still do the work?
  for (const [who, c, label] of stacks.slice(0, 2)) {
    const r = await call(c, 'slow', { paymentId: 'p4' }, 300);
    await wait(1500);
    const after = (await call(c, 'stats', {})).reply;
    const checked = await call(c, 'slowChecked', { paymentId: 'p5' }, 300);
    await wait(1500);
    const after2 = (await call(c, 'stats', {})).reply;
    console.log(`  ${who}, C, ${label}, a 300 ms deadline on a 1 s charge: the client got ${statusName(r.err?.code) ?? 'a reply'}; the server completed the charge anyway ${after.completed} time(s)`);
    console.log(`  ${who}, C, ${label}, the same, checking for cancellation first: the client got ${statusName(checked.err?.code) ?? 'a reply'}; completed ${after2.completed - after.completed}, skipped ${after2.skipped}`);
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
}
