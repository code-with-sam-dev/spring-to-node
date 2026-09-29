import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

/**
 * The episode's cold open: the application starts cleanly, and the missing
 * setting only surfaces when a customer's payment reaches it.
 *
 * missing-config.ts proves the value is undefined at startup. This is what that
 * costs later: the first charge builds its URL from `undefined`, and the error
 * carries the word inside the URL, which is the picture the episode opens on.
 */
@Injectable()
class PaymentsService {
  constructor(private readonly config: ConfigService) {}

  async charge(amountCents: number) {
    const base = this.config.get<string>('PAYMENT_GATEWAY_URL');
    return fetch(`${base}/charges`, { method: 'POST', body: JSON.stringify({ amountCents }) });
  }
}

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  providers: [PaymentsService],
})
class AppModule {}

delete process.env.PAYMENT_GATEWAY_URL;

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
console.log('the application started cleanly');

let failure = '';
try {
  await app.get(PaymentsService).charge(1999);
} catch (err) {
  failure = `${(err as Error).name}: ${(err as Error).message}`;
}
await app.close();

console.log(`first payment:  ${failure || 'succeeded (claim failed)'}`);
if (!failure.includes('undefined/charges')) {
  throw new Error(`CLAIM FAILED: expected the URL built from undefined, got: ${failure}`);
}
console.log('\nasserted: it started, and the first payment failed on a URL made of undefined');
