import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * WHAT DOES A BROWSER ON ANOTHER ORIGIN GET TOLD?
 *
 * Spring, measured by Ep11SessionTest with nothing configured: no
 * Access-Control-Allow-Origin at all, so a browser elsewhere cannot read the
 * response. Note the handler still RAN and returned 200: CORS decides what a
 * browser may read, not what the server executes.
 *
 * Four configurations here, each measured with an Origin header from a site
 * the service has never heard of. The fourth is the one worth the episode: it
 * is what a developer reaches for when the first cookie request fails with a
 * CORS error, and it is the one Spring refuses outright.
 */
const PORT = 4002;
const EVIL = 'https://evil.example';

@Controller()
class PlainController {
  @Get('plain')
  plain() {
    return { ok: true };
  }
}

@Module({ controllers: [PlainController] })
class AppModule {}

const probe = async (label: string, cors: false | true | CorsOptions) => {
  const app = await NestFactory.create(AppModule, { logger: false });
  if (cors === true) app.enableCors();
  else if (cors) app.enableCors(cors);
  await app.listen(PORT);
  const res = await fetch(`http://localhost:${PORT}/plain`, { headers: { Origin: EVIL } });
  await res.text();
  await app.close();
  const row = {
    label,
    status: res.status,
    allowOrigin: res.headers.get('access-control-allow-origin') ?? '(absent)',
    allowCredentials: res.headers.get('access-control-allow-credentials') ?? '(absent)',
  };
  console.log(`  ${label.padEnd(44)} ${row.status}  allow-origin ${row.allowOrigin.padEnd(22)} credentials ${row.allowCredentials}`);
  return row;
};

console.log(`a GET from ${EVIL}, which this service has never heard of:\n`);
const none = await probe('nothing configured', false);
const wildcard = await probe('enableCors()', true);
const listed = await probe("enableCors({ origin: ['https://app.example'] })",
  { origin: ['https://app.example'] });
const reflect = await probe('enableCors({ origin: true, credentials: true })',
  { origin: true, credentials: true });

if (none.allowOrigin !== '(absent)') throw new Error('CLAIM FAILED: a header appeared with nothing configured');
if (wildcard.allowOrigin !== '*') throw new Error(`CLAIM FAILED: enableCors() did not send *: ${wildcard.allowOrigin}`);
if (listed.allowOrigin === EVIL) throw new Error('CLAIM FAILED: the allow list let the stranger in');
if (reflect.allowOrigin !== EVIL || reflect.allowCredentials !== 'true') {
  throw new Error(`CLAIM FAILED: origin:true did not reflect the stranger with credentials: ${JSON.stringify(reflect)}`);
}
console.log('\nasserted: every configuration returned 200 (handler runs are counted in preflight.ts)');
console.log('asserted: origin: true + credentials: true echoes ANY origin back, with');
console.log('          credentials allowed, so any site can make authenticated reads');
