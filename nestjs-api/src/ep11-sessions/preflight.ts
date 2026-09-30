import 'reflect-metadata';
import { Controller, Get, Module, Put } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * TWO BROWSER PATHS, NOT ONE. cors.ts measured a SIMPLE cross-origin GET and
 * inferred "the handler ran" from a 200. This probe COUNTS handler runs, and
 * adds the second path a browser takes: a PREFLIGHTED request.
 *
 * A PUT with a JSON body is not a simple request, so a browser first sends
 *   OPTIONS  Access-Control-Request-Method: PUT
 *            Access-Control-Request-Headers: content-type
 * and sends the real PUT only if the preflight response permits it. The
 * permission check below is the Fetch standard's CORS check, applied by this
 * script: it is NOT a browser, and the output says so.
 *
 *   status ok, Allow-Origin equals the origin (or "*" when no credentials),
 *   Allow-Methods lists PUT (or "*" when no credentials),
 *   Allow-Headers lists content-type (or "*" when no credentials).
 */
// One port per configuration: fetch keeps connections alive, and reusing a port
// right after app.close() handed the next probe a dead socket (ECONNRESET).
let port = 4003;
const EVIL = 'https://evil.example';

let runs = 0;

@Controller()
class ProbeController {
  @Get('plain')
  plain() {
    runs++;
    return { ok: true };
  }

  @Put('plain')
  update() {
    runs++;
    return { updated: true };
  }
}

@Module({ controllers: [ProbeController] })
class AppModule {}

const lists = (header: string | null, want: string) =>
  (header ?? '').split(',').map((s) => s.trim().toLowerCase()).includes(want.toLowerCase());

const probe = async (label: string, cors: false | true | CorsOptions) => {
  const app = await NestFactory.create(AppModule, { logger: false });
  if (cors === true) app.enableCors();
  else if (cors) app.enableCors(cors);
  const PORT = port++;
  await app.listen(PORT);
  const url = `http://localhost:${PORT}/plain`;

  runs = 0;
  const get = await fetch(url, { headers: { Origin: EVIL } });
  await get.text();
  const getRuns = runs;

  runs = 0;
  const pre = await fetch(url, {
    method: 'OPTIONS',
    headers: { Origin: EVIL, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
  });
  await pre.text();
  const h = (n: string) => pre.headers.get(n);
  const creds = h('access-control-allow-credentials') === 'true';
  const originOk = h('access-control-allow-origin') === EVIL || (!creds && h('access-control-allow-origin') === '*');
  const methodOk = lists(h('access-control-allow-methods'), 'PUT') || (!creds && h('access-control-allow-methods') === '*');
  const headerOk = lists(h('access-control-allow-headers'), 'content-type') || (!creds && h('access-control-allow-headers') === '*')
    // cors, the Express package NestJS uses, echoes the requested headers when none are configured
    || (h('access-control-allow-headers') ?? '').toLowerCase() === 'content-type';
  const passes = pre.status >= 200 && pre.status < 300 && originOk && methodOk && headerOk;

  let putRuns = 0;
  if (passes) {
    const put = await fetch(url, { method: 'PUT', headers: { Origin: EVIL, 'content-type': 'application/json' }, body: '{}' });
    await put.text();
    putRuns = runs;
  }
  await app.close();

  console.log(`  ${label}`);
  console.log(`    simple GET      status ${get.status}  handler ran ${getRuns}x  allow-origin ${get.headers.get('access-control-allow-origin') ?? '(absent)'}`);
  console.log(`    preflight PUT   status ${pre.status}  allow-origin ${h('access-control-allow-origin') ?? '(absent)'}  allow-methods ${h('access-control-allow-methods') ?? '(absent)'}`);
  console.log(`    real PUT        ${passes ? `sent, handler ran ${putRuns}x` : 'not sent: preflight fails the check'}`);
  return { getRuns, preStatus: pre.status, passes, putRuns };
};

console.log(`requests from ${EVIL}; the preflight check is applied by this script, not a browser:\n`);
const none = await probe('nothing configured', false);
const wildcard = await probe('enableCors()', true);
const listed = await probe("enableCors({ origin: ['https://app.example'] })", { origin: ['https://app.example'] });
const reflect = await probe('enableCors({ origin: true, credentials: true })', { origin: true, credentials: true });

for (const r of [none, wildcard, listed, reflect]) {
  if (r.getRuns !== 1) throw new Error(`CLAIM FAILED: the simple GET did not run the handler once: ${r.getRuns}`);
}
if (none.passes || listed.passes) throw new Error('CLAIM FAILED: a preflight passed where it should not');
if (!wildcard.passes || !reflect.passes) throw new Error('CLAIM FAILED: a permissive preflight did not pass');
console.log('\nasserted: the simple GET ran the handler in every configuration, counted');
console.log('asserted: where the preflight fails, the real PUT is never sent, so its handler');
console.log('          never runs; where it passes, the handler runs once');
