// Episode 27. Spring Kafka and Nest's Kafka transport against one broker, as real processes.
// Every consumer prints a line per message it handles; the probe counts them. Run by
// scripts/verify-kafka.sh.
import { execSync, spawn } from 'node:child_process';

const PORT = 29092;
const broker = `localhost:${PORT}`;
const env = [
  'KAFKA_NODE_ID=1', 'KAFKA_PROCESS_ROLES=broker,controller',
  `KAFKA_LISTENERS=INTERNAL://:9092,EXTERNAL://:${PORT},CONTROLLER://:9093`,
  `KAFKA_ADVERTISED_LISTENERS=INTERNAL://localhost:9092,EXTERNAL://localhost:${PORT}`,
  'KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL',
  'KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER', 'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT',
  'KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093', 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1',
  'KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1', 'KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1',
  'KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0', 'KAFKA_AUTO_CREATE_TOPICS_ENABLE=false',
].map((e) => `-e ${e}`).join(' ');
const kafkaId = execSync(`docker run -d --rm -p 127.0.0.1:${PORT}:${PORT} ${env} apache/kafka:4.2.1`).toString().trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const kafka = (cmd) => execSync(`docker exec ${kafkaId} /opt/kafka/bin/${cmd}`, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 60000 }).toString().trim();
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-kafka/target/spring-kafka-probe-0.0.1-SNAPSHOT.jar';

for (let i = 0; i < 60; i++) {
  try {
    kafka('kafka-topics.sh --bootstrap-server localhost:9092 --list');
    break;
  } catch {
    await wait(1000);
  }
}
kafka('kafka-topics.sh --bootstrap-server localhost:9092 --create --topic payments --partitions 3');
kafka('kafka-topics.sh --bootstrap-server localhost:9092 --create --topic interop --partitions 1');

function produce(topic, records) {
  const input = records.map(([k, v]) => `${k}|${v}`).join('\n');
  execSync(`docker exec -i ${kafkaId} /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic ${topic} --property parse.key=true --property key.separator='|'`, { input, timeout: 60000 });
}

function consumer(stack, group, postfix, extra = []) {
  const lines = [];
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep26-kafka/main.js', broker, group, postfix ?? 'default', ...extra], { cwd: 'nestjs-api' })
    : spawn(JAVA, ['-jar', JAR, `--role=${stack.startsWith('spring-interop') ? 'interop' : 'consumer'}`, `--group=${group}`, `--spring.kafka.bootstrap-servers=${broker}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
      '--spring.kafka.consumer.auto-offset-reset=earliest',
      ...(stack.startsWith('spring-interop') ? ['--spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.ErrorHandlingDeserializer',
        '--spring.kafka.consumer.properties.spring.deserializer.value.delegate.class=org.springframework.kafka.support.serializer.JacksonJsonDeserializer',
        '--spring.kafka.consumer.properties.spring.json.trusted.packages=*'] : []),
      '--logging.level.org.apache.kafka.clients.consumer=ERROR', '--logging.level.org.springframework.kafka=ERROR', ...extra]);
  const errors = [];
  if (process.env.DEBUG) proc.stdout.on('data', (d) => process.stderr.write(`[${stack}] ${d}`));
  proc.stdout.on('data', (d) => {
    const text = d.toString();
    lines.push(...text.split('\n').filter((l) => l.startsWith('HANDLED') || l.startsWith('FAILED')));
    const m = /(InconsistentGroupProtocolException[^\n]*)/.exec(text);
    if (m) errors.push(m[1].trim());
  });
  return { lines, errors, kill: () => proc.kill('SIGKILL') };
}

const groups = () => kafka('kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list').split('\n').filter(Boolean).sort().join(', ');

try {
  // A: both stacks told to use the group "payments".
  if (!process.env.ONLY) for (const [label, postfix, springExtra, group] of [['default postfixId', undefined, [], 'payments'], ["postfixId ''", '', [], 'shared'], ["postfixId '', Spring on the RoundRobinAssignor", '', ['--spring.kafka.consumer.properties.partition.assignment.strategy=org.apache.kafka.clients.consumer.RoundRobinAssignor'], 'shared-rr']]) {
    const s = consumer('spring', group, undefined, springExtra);
    const n = consumer('nest', group, postfix);
    await wait(20000);
    const assignment = kafka(`kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group ${postfix === undefined ? group + '-server' : group}`);
    const springAssignment = postfix === undefined ? kafka(`kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group ${group}`) : assignment;
    const owners = (text) => [...new Set(text.split('\n').filter((l) => l.includes('payments ')).map((l) => {
      const cols = l.trim().split(/\s+/);
      return `partition ${cols[2]} to ${cols[6].startsWith('payments-') || cols[6].startsWith('nestjs') ? 'nest' : cols[6].startsWith('consumer') ? 'spring' : cols[6]}`;
    }))].sort().join(', ');
    produce('payments', Array.from({ length: 10 }, (_, i) => [`pay_${i + 1}`, JSON.stringify({ id: `pay_${i + 1}` })]));
    await wait(8000);
    console.log(`  Both, A, Spring and Nest both configured with groupId "${group}", Nest ${label}, 10 messages: Spring handled ${s.lines.length}, Nest handled ${n.lines.length}, total ${s.lines.length + n.lines.length}; groups on the broker: ${groups()}; assignment: ${postfix === undefined ? 'spring ' + owners(springAssignment) + '; nest ' + owners(assignment) : owners(assignment)}${s.errors.length ? '; Spring logged: ' + s.errors[0].slice(0, 160) : ''}`);
    s.kill();
    n.kill();
    await wait(2000);
  }

  // B: a poison message, then five good ones, all with the same key so they share a partition.
  if (!process.env.ONLY) for (const stack of ['spring', 'nest']) {
    const c = consumer(stack, `poison-${stack}`);
    await wait(15000);
    const sent = Date.now();
    produce('payments', [['acct_7', JSON.stringify({ id: 'poison' })], ...Array.from({ length: 5 }, (_, i) => ['acct_7', JSON.stringify({ id: `good_${i + 1}` })])]);
    await wait(30000);
    const attempts = c.lines.filter((l) => l.includes('poison')).length;
    const good = c.lines.filter((l) => l.includes('good_')).length;
    console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, B, default error handling, a poison message then 5 good ones on the same key, 30 s: attempts on the poison ${attempts}, good messages handled ${good} of 5`);
    c.kill();
    await wait(2000);
  }

  // B2: the poison on one key, good messages on other keys, so on other partitions.
  if (!process.env.ONLY) {
    const c = consumer('nest', 'poison-nest-keys');
    await wait(15000);
    produce('payments', [['acct_7', JSON.stringify({ id: 'poison' })], ...Array.from({ length: 6 }, (_, i) => [`acct_${100 + i}`, JSON.stringify({ id: `good_${i + 1}` })])]);
    await wait(30000);
    const poisonPartition = (c.lines.find((l) => l.includes('poison')) ?? '').split(' partition ')[1]?.split(' ')[0];
    const good = c.lines.filter((l) => l.includes('good_'));
    const same = good.filter((l) => l.split(' partition ')[1]?.split(' ')[0] === poisonPartition).length;
    console.log(`  Nest, B, a poison message on partition ${poisonPartition}, 6 good ones on other keys, 30 s: good messages handled ${good.length}, of them on the poison's partition ${same}`);
    c.kill();
    await wait(2000);
  }

  // C: what each producer puts on the wire, read back with the broker's own console consumer.
  execSync(`${JAVA} -jar ${JAR} --role=producer --spring.kafka.bootstrap-servers=${broker} --spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JacksonJsonSerializer --spring.main.web-application-type=none --logging.level.root=OFF --spring.main.banner-mode=off`, { stdio: 'ignore' });
  execSync(`node dist/ep26-kafka/produce.js ${broker}`, { cwd: 'nestjs-api', stdio: 'ignore' });
  const wire = kafka('kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic interop --from-beginning --max-messages 2 --timeout-ms 15000 --property print.headers=true --property print.key=true');
  for (const line of wire.split('\n').filter((l) => l.includes('pay_'))) console.log(`  Both, C, on the wire: ${line.replace(/\t/g, ' | ')}`);
  const contract = ['--spring.kafka.consumer.properties.spring.json.use.type.headers=false',
    '--spring.kafka.consumer.properties.spring.json.value.default.type=dev.codewithsam.kafka.PaymentsProducer$Payment'];
  for (const [stack, label, extra] of [['nest', 'Nest @EventPattern', ['from-beginning']], ['spring-interop', 'Spring @KafkaListener with the typed JSON deserializer', []], ['spring-interop-contract', 'Spring, type headers ignored, default type set', contract]]) {
    const c = consumer(stack, `interop-${stack}`, undefined, extra);
    await wait(20000);
    for (const l of c.lines.filter((x) => x.includes('interop'))) console.log(`  Both, C, ${label} reads: ${l.replace(/^(HANDLED|FAILED) (nest|spring) interop /, (m, a) => (a === 'FAILED' ? 'FAILED ' : ''))}`);
    c.kill();
    await wait(2000);
  }
} finally {
  execSync(`docker stop ${kafkaId}`);
}
