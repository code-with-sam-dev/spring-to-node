// Episode 32. Spring for GraphQL and NestJS with Apollo as real processes against one Postgres:
// N plus one, what an internal error tells the client, status codes, and introspection.
// Run by scripts/verify-graphql.sh.
import { execSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../nestjs-api/package.json', import.meta.url));
const { Client } = require('pg');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-graphql/target/spring-graphql-probe-0.0.1-SNAPSHOT.jar';
const procs = [];

const pg = execSync('docker run -d --rm -e POSTGRES_PASSWORD=payments -p 127.0.0.1::5432 postgres:18-alpine').toString().trim();
const pgPort = execSync(`docker port ${pg} 5432`).toString().trim().split(':').pop();
const url = `postgres://postgres:payments@127.0.0.1:${pgPort}/postgres`;

function server(stack, port, env = {}) {
  const proc = stack === 'nest'
    ? spawn('node', ['dist/ep31-graphql/main.js', String(port), url], { cwd: 'nestjs-api', env: { ...process.env, ...env } })
    : spawn(JAVA, ['-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off',
        `--spring.datasource.url=jdbc:postgresql://127.0.0.1:${pgPort}/postgres`, '--spring.datasource.username=postgres', '--spring.datasource.password=payments']);
  procs.push(proc);
  const stopped = new Promise((r) => proc.on('exit', r));
  return { kill: async () => { proc.kill('SIGKILL'); await stopped; } };
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
const gql = async (port, query, accept = 'application/json') => {
  const res = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', accept }, body: JSON.stringify({ query }) });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const count = async (port, query) => {
  await fetch(`http://127.0.0.1:${port}/stats/reset`, { method: 'POST' });
  const r = await gql(port, query);
  const { statements } = await (await fetch(`http://127.0.0.1:${port}/stats`)).json();
  return { statements, orders: r.body?.data?.orders?.length };
};

try {
  let db;
  for (let i = 0; i < 60 && !db; i++) {
    try {
      db = new Client({ connectionString: url });
      await db.connect();
    } catch {
      db = undefined;
      await wait(1000);
    }
  }
  await db.query('CREATE TABLE ep32_customers (id INT PRIMARY KEY, name TEXT NOT NULL)');
  await db.query('CREATE TABLE ep32_orders (id INT PRIMARY KEY, total INT NOT NULL, customer_id INT NOT NULL)');
  for (let c = 1; c <= 10; c++) await db.query('INSERT INTO ep32_customers VALUES ($1, $2)', [c, `customer ${c}`]);
  for (let o = 1; o <= 20; o++) await db.query('INSERT INTO ep32_orders VALUES ($1, $2, $3)', [o, o * 100, ((o - 1) % 10) + 1]);
  await db.end();

  const spring = server('spring', 18401);
  const nest = server('nest', 13401);
  const nestProd = server('nest', 13402, { NODE_ENV: 'production' });
  const nestMasked = server('nest', 13403, { NODE_ENV: 'production', MASK: '1' });
  await Promise.all([up(18401), up(13401), up(13402), up(13403)]);
  const stacks = [['Spring', 18401, 'Spring for GraphQL'], ['Nest', 13401, 'Nest with Apollo']];

  // A: 20 orders, each with its customer (10 distinct customers).
  for (const [who, port, label] of stacks) {
    const plain = await count(port, '{ orders { id customer { name } } }');
    const batched = await count(port, '{ orders { id customerBatched { name } } }');
    const how = who === 'Spring' ? '@SchemaMapping' : '@ResolveField';
    const fix = who === 'Spring' ? '@BatchMapping' : 'a DataLoader per request';
    console.log(`  ${who}, A, ${label}, ${plain.orders} orders with their customer: ${how} ran ${plain.statements} SQL statements; ${fix} ran ${batched.statements}`);
  }

  // B: a resolver whose SQL fails (the table does not exist). What does the client see?
  for (const [who, port, label] of [...stacks, ['Nest', 13402, 'Nest with Apollo, NODE_ENV=production'], ['Nest', 13403, 'Nest with Apollo, NODE_ENV=production and formatError masking']]) {
    const r = await gql(port, '{ report }');
    const e = r.body?.errors?.[0] ?? {};
    const ext = e.extensions ?? {};
    const trace = Array.isArray(ext.stacktrace) ? `, a stack trace of ${ext.stacktrace.length} lines` : ', no stack trace';
    console.log(`  ${who}, B, ${label}, a resolver whose SQL fails: message "${e.message}", code ${ext.code ?? ext.classification ?? 'none'}${trace}`);
  }

  // C: a query naming a field that does not exist.
  for (const [who, port, label] of stacks) {
    const a = await gql(port, '{ orders { nope } }');
    const b = await gql(port, '{ orders { nope } }', 'application/graphql-response+json');
    console.log(`  ${who}, C, ${label}, a query with an unknown field: HTTP ${a.status} with Accept application/json, HTTP ${b.status} with Accept application/graphql-response+json`);
  }

  // D: introspection, with nothing configured.
  for (const [who, port, label] of [...stacks, ['Nest', 13402, 'Nest with Apollo, NODE_ENV=production']]) {
    const r = await gql(port, '{ __schema { types { name } } }');
    const n = r.body?.data?.__schema?.types?.length;
    console.log(`  ${who}, D, ${label}, an introspection query: ${n ? `answered, ${n} types` : `refused: "${r.body?.errors?.[0]?.message}"`}`);
  }
} finally {
  for (const p of procs) p.kill('SIGKILL');
  execSync(`docker stop ${pg}`, { stdio: 'ignore' });
}
