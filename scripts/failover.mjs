// Episode 25, F. Two instances as separate processes on one Redis. When the instance running the
// job has started it, kill it with SIGKILL, the way a crash does, and time how long until the
// other instance starts the job. Run by scripts/verify-schedule.sh.
import { execSync, spawn } from 'node:child_process';

const redisId = execSync('docker run -d --rm -p 127.0.0.1::6379 redis:8-alpine').toString().trim();
const port = execSync(`docker port ${redisId} 6379`).toString().trim().split(':').pop();
const redisUrl = `redis://127.0.0.1:${port}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1000);

const stacks = {
  nest: (name) => spawn('node', ['dist/ep24-schedule/failover-instance.js', name, redisUrl], { cwd: 'nestjs-api' }),
  spring: (name) => spawn(process.env.JAVA_HOME + '/bin/java', ['-jar', 'spring-schedule/target/spring-schedule-0.0.1-SNAPSHOT.jar',
    `--instance=${name}`, '--jobs=failover', `--spring.data.redis.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off']),
};

async function probe(stack, label) {
  const starts = [];
  const procs = Object.fromEntries(['a', 'b'].map((name) => {
    const p = stacks[stack](name);
    p.stderr.on('data', (d) => process.env.FAILOVER_DEBUG && process.stderr.write(d));
    p.stdout.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const m = /^START (\w) (\d+)/.exec(line);
        if (m) starts.push({ name: m[1], at: Number(m[2]) });
      }
    });
    return [name, p];
  }));
  const startDeadline = Date.now() + 30000;
  while (starts.length === 0 && Date.now() < startDeadline) await wait(50);
  if (starts.length === 0) {
    for (const p of Object.values(procs)) p.kill('SIGKILL');
    throw new Error(`${stack}: no instance started the job within 30 s`);
  }
  await wait(1000);
  const victim = starts[starts.length - 1].name;
  const other = victim === 'a' ? 'b' : 'a';
  const killedAt = Date.now();
  procs[victim].kill('SIGKILL');
  const deadline = killedAt + 20000;
  let first;
  while (!first && Date.now() < deadline) {
    first = starts.find((s) => s.name === other && s.at > killedAt);
    await wait(50);
  }
  procs[other].kill('SIGKILL');
  console.log(`  ${stack === 'nest' ? 'Nest' : 'Spring'}, F, ${label}: killed the running instance 1 s into its run; the other instance started the job ${first ? ((first.at - killedAt) / 1000).toFixed(1) + ' s later' : 'not within 20 s'}`);
  execSync(`docker exec ${redisId} redis-cli FLUSHALL`);
}

try {
  await probe('nest', '@OnOneInstance, lease ttl 3 s, a 4 s job every second');
  await probe('spring', '@SchedulerLock, lockAtMostFor 10 s, a 4 s job every second');
} finally {
  execSync(`docker stop ${redisId}`);
}
