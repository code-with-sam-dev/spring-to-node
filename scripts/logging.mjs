// Episode 36. Logback with an MDC request id against Nest's ConsoleLogger and nestjs-pino, as real
// processes: what a log line looks like, and which lines of one request carry its request id.
// Run by scripts/verify-logging.sh.
import { spawn } from 'node:child_process';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-logging/target/spring-logging-probe-0.0.1-SNAPSHOT.jar';
const ANSI = /\u001b\[[0-9;]*m/g;
const MARKERS = {
  spring: ['controller: payment received', 'service: card charged', 'runAsync: receipt queued', '@Async: customer notified'],
  nest: ['controller: payment received', 'service: card charged', 'after await: receipt queued', 'setTimeout: customer notified'],
};
const PLACES = { spring: ['controller', 'service', 'CompletableFuture.runAsync', '@Async'], nest: ['controller', 'service', 'after an await', 'a setTimeout callback'] };

async function run(stack, port, args) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep35-logging/main.js', String(port), ...args], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--spring.main.banner-mode=off', ...args]);
  let out = '';
  proc.stdout.on('data', (d) => (out += d));
  for (let i = 0; i < 160; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      break;
    } catch {
      await wait(250);
    }
  }
  await fetch(`http://127.0.0.1:${port}/pay`, { method: 'POST', headers: { 'x-request-id': 'req-42' } });
  await wait(500);
  proc.kill('SIGKILL');
  const lines = out.replace(ANSI, '').split('\n');
  return MARKERS[stack].map((m) => lines.find((l) => l.includes(m)) ?? '');
}

const configs = [
  ['spring', 18701, [], 'Spring, Logback defaults'],
  ['spring', 18702, ['--logging.structured.format.console=ecs'], 'Spring, logging.structured.format.console=ecs'],
  ['spring', 18703, ['--logging.structured.format.console=ecs', '--mdc-propagation=true'], 'Spring, ECS and a TaskDecorator copying the MDC'],
  ['nest', 13701, ['default'], 'Nest, ConsoleLogger defaults'],
  ['nest', 13702, ['json'], 'Nest, ConsoleLogger({ json: true })'],
  ['nest', 13703, ['pino'], 'Nest, nestjs-pino with the request id'],
];

for (const [stack, port, args, label] of configs) {
  const found = await run(stack, port, args);
  const who = stack === 'nest' ? 'Nest' : 'Spring';
  if (!args.includes('--mdc-propagation=true') && !args.includes('pino')) console.log(`  ${who}, A, ${label}, the controller's line: ${found[0].trim()}`);
  const carried = found.map((l, i) => `${PLACES[stack][i]} ${l.includes('req-42') ? 'yes' : 'no'}`).join(', ');
  console.log(`  ${who}, B, ${label}, which lines carried request id req-42: ${carried}`);
}
