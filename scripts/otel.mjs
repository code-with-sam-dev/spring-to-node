// Episode 37. Spring Boot's OpenTelemetry starter and the OpenTelemetry Node SDK under NestJS, as
// real processes exporting to a real Jaeger: what gets sampled by default, whether a trace crosses
// from one service to the other, and how the Node SDK is loaded. Run by scripts/verify-otel.sh.
import { execSync, spawn } from 'node:child_process';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-otel/target/spring-otel-probe-0.0.1-SNAPSHOT.jar';
const procs = [];

const jaeger = execSync('docker run -d --rm -p 127.0.0.1::4318 -p 127.0.0.1::16686 jaegertracing/jaeger:2.11.0').toString().trim();
const port = (p) => execSync(`docker port ${jaeger} ${p}`).toString().trim().split('\n')[0].split(':').pop();
const OTLP = `http://127.0.0.1:${port(4318)}`;
const QUERY = `http://127.0.0.1:${port(16686)}`;

function spring(name, httpPort, ledgerUrl, extra = []) {
  procs.push(spawn(JAVA, ['-jar', JAR, `--server.port=${httpPort}`, `--spring.application.name=${name}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
    `--management.opentelemetry.tracing.export.otlp.endpoint=${OTLP}/v1/traces`, `--ledger-url=${ledgerUrl}`, ...extra]));
}
function nest(name, httpPort, how, springUrl) {
  const env = { ...process.env, PORT: String(httpPort), SPRING_URL: springUrl, OTEL_SERVICE_NAME: name, OTEL_EXPORTER_OTLP_ENDPOINT: OTLP, OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf', OTEL_TRACES_EXPORTER: 'otlp', OTEL_METRICS_EXPORTER: 'none', OTEL_LOGS_EXPORTER: 'none', OTEL_NODE_DISABLED_INSTRUMENTATIONS: 'fs' };
  const args = how === 'register'
    ? ['--import', '@opentelemetry/auto-instrumentations-node/register', 'dist/ep36-otel/entry-none.js']
    : ['dist/ep36-otel/entry-first.js'];
  procs.push(spawn('node', args, { cwd: 'nestjs-api', env }));
}
const up = async (p, path) => {
  for (let i = 0; i < 160; i++) {
    try {
      await fetch(`http://127.0.0.1:${p}${path}`);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`port ${p} never came up`);
};
const traces = async (service) => (await (await fetch(`${QUERY}/api/traces?service=${service}&limit=2000&lookback=1h`)).json()).data ?? [];
const servicesIn = (t) => [...new Set(Object.values(t.processes).map((p) => p.serviceName))].sort();
const hits = async (p, path, n) => { for (let i = 0; i < n; i++) await fetch(`http://127.0.0.1:${p}${path}`); };

try {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${QUERY}/api/services`); break; } catch { await wait(500); }
  }
  nest('nest-register', 13901, 'register', 'http://127.0.0.1:18902');
  nest('nest-import-first', 13902, 'first', 'http://127.0.0.1:18902');
  spring('spring-defaults', 18901, 'http://127.0.0.1:13901');
  spring('spring-sampled', 18902, 'http://127.0.0.1:13901', ['--management.tracing.sampling.probability=1.0']);
  await Promise.all([up(13901, '/ledger'), up(13902, '/ledger'), up(18901, '/ledger'), up(18902, '/ledger')]);
  await wait(6000);
  const baseline = {};
  for (const s of ['spring-defaults', 'nest-register', 'nest-import-first']) baseline[s] = (await traces(s)).length;

  // A: 100 requests each, nothing configured but the exporter.
  await hits(18901, '/ledger', 100);
  await hits(13901, '/ledger', 100);
  await hits(13902, '/ledger', 100);
  await wait(10000);
  const n = async (s) => (await traces(s)).length - baseline[s];
  console.log(`  Spring, A, spring-boot-starter-opentelemetry, sampling not configured, 100 requests: traces in Jaeger ${await n('spring-defaults')}`);
  console.log(`  Nest, A, the Node SDK started by node --import ...auto-instrumentations-node/register, 100 requests: traces in Jaeger ${await n('nest-register')}`);
  console.log(`  Nest, A, the Node SDK in a tracing module imported first in an ES module app, 100 requests: traces in Jaeger ${await n('nest-import-first')}`);
  // What instrumented each trace: one span from node:http only, or Express and Nest as well.
  const libs = async (s) => {
    const t = (await traces(s)).at(-1);
    const names = [...new Set(t.spans.map((x) => (x.tags.find((g) => g.key === 'otel.scope.name' || g.key === 'otel.library.name') ?? {}).value).filter(Boolean))].sort();
    return `${t.spans.length} spans, from ${names.join(', ')}`;
  };
  console.log(`  Nest, A, one /ledger trace, started by node --import: ${await libs('nest-register')}`);
  console.log(`  Nest, A, one /ledger trace, the tracing module imported first: ${await libs('nest-import-first')}`);

  // B: one payment, Spring calling the Nest ledger, sampling at 1.0 on Spring.
  await hits(18902, '/pay', 1);
  await wait(8000);
  let all = await traces('spring-sampled');
  const viaBuilder = all.filter((t) => t.spans.some((s) => /\/pay$/.test(s.operationName) || s.tags.some((g) => g.key === 'http.route' && g.value === '/pay')));
  console.log(`  Spring, B, RestClient built from the injected RestClient.Builder, calling the Nest ledger: services in the trace ${viaBuilder.map(servicesIn).map((s) => s.join(' + ')).join('; ')}`);
  const before = all.length;
  await hits(18902, '/pay-plain', 1);
  await wait(8000);
  all = await traces('spring-sampled');
  const plain = all.filter((t) => t.spans.some((s) => s.tags.some((g) => g.key === 'http.route' && g.value === '/pay-plain') || /pay-plain/.test(s.operationName)));
  console.log(`  Spring, B, RestClient.create(), calling the Nest ledger: services in the trace ${plain.map(servicesIn).map((s) => s.join(' + ')).join('; ')}`);
  const nestBefore = (await traces('nest-register')).length;
  await hits(13901, '/pay', 1);
  await wait(8000);
  const nestAll = await traces('nest-register');
  const nestPay = nestAll.filter((t) => t.spans.some((s) => s.tags.some((g) => g.key === 'http.route' && g.value === '/pay')));
  console.log(`  Nest, B, fetch from the Nest payment to the Spring ledger: services in the trace ${nestPay.map(servicesIn).map((s) => s.join(' + ')).join('; ')}`);

  // C: 100 payments through Spring at its default sampling, each calling the Nest ledger. Nest's
  // SDK samples everything on its own; how many Nest traces arrive when Spring decided first?
  const nestC = (await traces('nest-register')).length;
  await hits(18901, '/pay', 100);
  await wait(10000);
  console.log(`  Both, C, 100 payments through Spring at its default sampling, each calling the Nest ledger: Nest traces in Jaeger ${(await traces('nest-register')).length - nestC}`);
  const nestC2 = (await traces('nest-register')).length;
  await hits(18902, '/pay', 100);
  await wait(10000);
  console.log(`  Both, C, the same with Spring sampling at 1.0: Nest traces in Jaeger ${(await traces('nest-register')).length - nestC2}`);
} finally {
  for (const p of procs) p.kill('SIGKILL');
  execSync(`docker stop ${jaeger}`, { stdio: 'ignore' });
}
