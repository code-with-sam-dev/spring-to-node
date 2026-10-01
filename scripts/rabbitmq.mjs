// Episode 28. Spring AMQP and Nest's RabbitMQ transport against one broker, as real processes.
// Consumers print a line per message they handle; amqplib reads queue depths straight from the
// broker. Run by scripts/verify-rabbitmq.sh.
import { execSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../nestjs-api/package.json', import.meta.url));
const amqp = require('amqplib');
const id = execSync('docker run -d --rm -p 127.0.0.1::5672 rabbitmq:4.1-alpine').toString().trim();
const port = execSync(`docker port ${id} 5672`).toString().trim().split(':').pop();
const url = `amqp://guest:guest@127.0.0.1:${port}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-rabbit/target/spring-rabbit-probe-0.0.1-SNAPSHOT.jar';

let conn;
for (let i = 0; i < 60 && !conn; i++) {
  try {
    conn = await amqp.connect(url);
  } catch {
    await wait(1000);
  }
}
const ch = await conn.createChannel();
const declare = async (q, deadLetterTo) => {
  if (deadLetterTo) await ch.assertQueue(deadLetterTo, { durable: true });
  await ch.assertQueue(q, { durable: true, arguments: deadLetterTo ? { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': deadLetterTo } : {} });
};
const depth = async (q) => (await ch.checkQueue(q)).messageCount;
const nestBody = (pid) => JSON.stringify({ pattern: 'payment.created', data: { id: pid } });
const springBody = (pid) => JSON.stringify({ id: pid });
const publish = (q, bodies) => bodies.forEach((b) => ch.sendToQueue(q, Buffer.from(b), { persistent: true, contentType: 'application/json' }));
const batch = (fmt) => [fmt('poison'), fmt('good_1'), fmt('good_2'), fmt('good_3')];

function consumer(stack, queue, mode, extra = []) {
  const lines = [];
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep27-rabbitmq/main.js', url, queue, mode], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, '--role=consumer', `--queue=${queue}`, `--spring.rabbitmq.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off', ...extra]);
  proc.stdout.on('data', (d) => lines.push(...d.toString().split('\n').filter((l) => l.startsWith('HANDLED'))));
  const stopped = new Promise((r) => proc.on('exit', r));
  return { lines, kill: async () => { proc.kill('SIGKILL'); await stopped; await wait(500); } };
}
const report = (c) => {
  const poison = c.lines.filter((l) => l.includes('poison')).length;
  const good = new Set(c.lines.filter((l) => l.includes('good_')).map((l) => l.split(' ')[2])).size;
  return { poison, good };
};

try {
  // A: the defaults. A payment that always throws, then three good ones, 10 s.
  await declare('spring-a');
  await declare('nest-a');
  for (const [stack, queue, label] of [['spring', 'spring-a', 'Spring @RabbitListener, Boot defaults'], ['nest', 'nest-a', 'Nest @EventPattern, defaults (noAck true)']]) {
    const c = consumer(stack, queue, 'auto');
    await wait(stack === 'spring' ? 8000 : 4000);
    publish(queue, batch(stack === 'nest' ? nestBody : springBody));
    await wait(10000);
    await c.kill();
    const r = report(c);
    console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, A, ${label}, a poison payment then 3 good, 10 s: attempts on the poison ${r.poison}, good handled ${r.good} of 3, left in the queue afterwards ${await depth(queue)}`);
  }

  // B: Nest with noAck false, the handler acknowledging only on success. Then restart.
  await declare('nest-b');
  let c = consumer('nest', 'nest-b', 'manual');
  await wait(4000);
  publish('nest-b', batch(nestBody));
  await wait(10000);
  let r = report(c);
  await c.kill();
  const afterKill = await depth('nest-b');
  c = consumer('nest', 'nest-b', 'manual');
  await wait(6000);
  const again = c.lines.filter((l) => l.includes('poison'));
  await c.kill();
  console.log(`  Nest, B, noAck false, ack only on success, 10 s: attempts on the poison ${r.poison}, good handled ${r.good} of 3; after the process stopped, in the queue ${afterKill}; after a restart the poison was delivered again ${again.length} time(s), ${again[0] ? again[0].split(' ').slice(3).join(' ') : ''}`);

  // C: give up and dead letter it. Spring: default-requeue-rejected false. Nest: nack without requeue.
  await declare('spring-dlx', 'spring-dlq');
  await declare('nest-dlx', 'nest-dlq');
  for (const [stack, queue, dlq, extra] of [['spring', 'spring-dlx', 'spring-dlq', ['--spring.rabbitmq.listener.simple.default-requeue-rejected=false']], ['nest', 'nest-dlx', 'nest-dlq', []]]) {
    c = consumer(stack, queue, 'dead-letter', extra);
    await wait(stack === 'spring' ? 8000 : 4000);
    publish(queue, batch(stack === 'nest' ? nestBody : springBody));
    await wait(8000);
    await c.kill();
    r = report(c);
    const how = stack === 'nest' ? 'nack without requeue to a dead letter queue' : 'default-requeue-rejected false, dead letter queue';
    console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, C, ${how}, 8 s: attempts on the poison ${r.poison}, good handled ${r.good} of 3, in the dead letter queue ${await depth(dlq)}`);
  }

  // D: what each side puts on the wire, and what the other side makes of it.
  await declare('interop');
  await declare('interop-nest');
  execSync(`${JAVA} -jar ${JAR} --role=producer --spring.rabbitmq.port=${port} --spring.main.web-application-type=none --logging.level.root=OFF --spring.main.banner-mode=off`, { stdio: 'ignore', timeout: 60000 });
  execSync(`node dist/ep27-rabbitmq/produce.js ${url} interop-nest`, { cwd: 'nestjs-api', stdio: 'ignore', timeout: 60000 });
  for (const q of ['interop', 'interop-nest']) {
    const m = await ch.get(q, { noAck: false });
    if (!m) continue;
    console.log(`  Both, D, on the wire from ${q === 'interop' ? 'Spring' : 'Nest'}: body ${m.content.toString()}, headers ${JSON.stringify(m.properties.headers ?? {})}, content type ${m.properties.contentType ?? 'none'}`);
    ch.nack(m, false, true);
  }
  await wait(1000);
  c = consumer('nest', 'interop', 'manual');
  await wait(5000);
  await c.kill();
  console.log(`  Both, D, Nest (noAck false) consuming Spring's message: handled ${c.lines.length}, left in the queue ${await depth('interop')}`);
  c = consumer('spring', 'interop-nest', 'auto');
  await wait(8000);
  await c.kill();
  for (const l of c.lines) console.log(`  Both, D, Spring consuming Nest's message: ${l.replace(/^HANDLED spring /, '')}`);
} finally {
  await conn.close().catch(() => {});
  execSync(`docker stop ${id}`);
}
