import { NestExpressApplication } from '@nestjs/platform-express';
import { startApp, urlOf } from './app.js';

/**
 * EPISODE 21, B: behind a proxy. Every request reaches the app from the proxy's address,
 * 127.0.0.1 here, with the client in X-Forwarded-For as the proxy appended it.
 */
const burst = async (app: NestExpressApplication, forwardedFor: (i: number) => string, n: number) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await fetch(`${urlOf(app)}/payments`, { headers: { 'x-forwarded-for': forwardedFor(i) } })).status);
  return out.join(' ');
};

describe('B: behind a proxy', () => {
  for (const [label, trustProxy] of [['no trust proxy', undefined], ['trust proxy 1', 1], ['trust proxy true', true], ["trust proxy 'loopback'", 'loopback']] as const) {
    it(label, async () => {
      const app = await startApp({ trustProxy });
      const one = await burst(app, () => '203.0.113.7', 3);
      const two = await burst(app, () => '198.51.100.9', 1);
      const spoof = await burst(app, (i) => `9.9.9.${i}, 203.0.113.99`, 6);
      console.log(`  Nest, B, ${label}, client one x3: ${one}; client two, first request: ${two}`);
      console.log(`  Nest, B, ${label}, a client writing its own X-Forwarded-For, six requests: ${spoof}`);
      for (const xff of ['attacker', 'attacker, 203.0.113.7']) {
        const ip = await (await fetch(`${urlOf(app)}/whoami`, { headers: { 'x-forwarded-for': xff } })).text();
        console.log(`  Nest, B, ${label}, X-Forwarded-For "${xff}", the key: ${ip}`);
      }
      await app.close();
    });
  }
});
