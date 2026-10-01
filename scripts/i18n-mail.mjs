// Episode 39. Spring's MessageSource and JavaMailSender against the first-party @nestjs/i18n and
// nodemailer, as real processes: which language an unsupported locale gets, what a missing key
// returns, and what a silent or refusing mail server does. Run by scripts/verify-i18n-mail.sh.
import { spawn } from 'node:child_process';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const JAVA = process.env.JAVA_HOME + '/bin/java';
const JAR = 'spring-i18n-mail/target/spring-i18n-mail-probe-0.0.1-SNAPSHOT.jar';
const procs = [];
const SILENT = 2525;  // accepts the connection and never says a word
const CLOSED = 2526;  // nothing listens

procs.push(spawn('node', ['-e', `require('node:net').createServer(() => {}).listen(${SILENT})`]));

function spring(port, jvm = [], extra = []) {
  const p = spawn(JAVA, [...jvm, '-jar', JAR, `--server.port=${port}`, '--logging.level.root=OFF', '--spring.main.banner-mode=off', '--spring.mail.host=127.0.0.1', ...extra]);
  procs.push(p);
  return p;
}
function nest(port) {
  const p = spawn('node', ['dist/main.js', String(port)], { cwd: 'nestjs-api/probes/i18n-mail' });
  procs.push(p);
  return p;
}
const up = async (port) => {
  for (let i = 0; i < 160; i++) {
    try { await fetch(`http://127.0.0.1:${port}/receipt`); return; } catch { await wait(250); }
  }
  throw new Error(`port ${port} never came up`);
};
const get = async (port, path, lang, timeoutMs = 10000) => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}${path}`, { headers: lang ? { 'accept-language': lang } : {}, signal: AbortSignal.timeout(timeoutMs) });
    return `HTTP ${r.status} "${(await r.text()).slice(0, 60)}"`;
  } catch (e) {
    return e.name === 'TimeoutError' ? `no answer after ${timeoutMs / 1000} s` : `failed: ${e.cause?.code ?? e.message}`;
  }
};

try {
  // A: languages. The Spring server runs with a German JVM locale, as a server in Germany might.
  const de = ['-Duser.language=de', '-Duser.country=DE'];
  spring(18961, de, [`--spring.mail.port=${SILENT}`]);
  spring(18962, de, ['--spring.messages.fallback-to-system-locale=false', `--spring.mail.port=${SILENT}`]);
  nest(13961);
  await Promise.all([up(18961), up(18962), up(13961)]);
  for (const lang of ['de', 'fr']) console.log(`  Spring, A, MessageSource, catalogs en (default) and de, a German JVM locale, Accept-Language ${lang}: ${await get(18961, '/receipt', lang)}`);
  console.log(`  Spring, A, the same with spring.messages.fallback-to-system-locale=false, Accept-Language fr: ${await get(18962, '/receipt', 'fr')}`);
  for (const lang of ['de', 'fr']) console.log(`  Nest, A, @nestjs/i18n, catalogs en (default) and de, Accept-Language ${lang}: ${await get(13961, '/receipt', lang)}`);
  console.log(`  Spring, A, a key in no catalog: ${await get(18961, '/refund', 'de')}`);
  console.log(`  Nest, A, a key in no catalog: ${await get(13961, '/refund', 'de')}`);

  // B: a mail server that accepts the connection and never answers.
  console.log(`  Spring, B, JavaMailSender, no timeouts configured, a silent SMTP server: ${await get(18961, '/mail', null, 60000)}`);
  spring(18963, [], [`--spring.mail.port=${SILENT}`, '--spring.mail.properties.mail.smtp.connectiontimeout=5000', '--spring.mail.properties.mail.smtp.timeout=5000', '--spring.mail.properties.mail.smtp.writetimeout=5000']);
  await up(18963);
  console.log(`  Spring, B, mail.smtp timeouts of 5000 ms, the same server: ${await get(18963, '/mail', null, 60000)}`);
  console.log(`  Nest, B, nodemailer defaults, the same server: ${await get(13961, `/mail?port=${SILENT}`, null, 60000)}`);

  // C: send and forget, to a port where nothing listens.
  const springForget = spring(18964, [], [`--spring.mail.port=${CLOSED}`]);
  await up(18964);
  let springExit = null;
  springForget.on('exit', (c) => (springExit = c));
  const s = await get(18964, '/mail-and-forget');
  await wait(3000);
  console.log(`  Spring, C, @Async send to a refusing mail server: ${s}; 3 s later the process ${springExit === null ? `was still serving, ${await get(18964, '/receipt')}` : `exited with code ${springExit}`}`);
  const nestForget = nest(13962);
  await up(13962);
  let nestExit = null;
  nestForget.on('exit', (c) => (nestExit = c));
  const n = await get(13962, `/mail-and-forget?port=${CLOSED}`);
  await wait(3000);
  console.log(`  Nest, C, sendMail without await to a refusing mail server: ${n}; 3 s later the process ${nestExit === null ? `was still serving, ${await get(13962, '/receipt')}` : `exited with code ${nestExit}`}`);
} finally {
  for (const p of procs) p.kill('SIGKILL');
}
