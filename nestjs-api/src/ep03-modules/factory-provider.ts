import 'reflect-metadata';
import { Injectable, Module, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Where @Bean went.
 *
 * A Spring @Bean method is a method on a configuration class that RETURNS a
 * configured object, and the container calls it. NestJS calls the same thing a
 * factory provider: `useFactory` is the method, `inject` is its parameter list,
 * and the token replaces the return type Spring was using to identify it.
 *
 * The shape is so close that the interesting part is the ONE difference: Spring
 * identifies the bean by its TYPE, so two beans of the same type need
 * qualifying. Here the token IS the identity, so two differently configured
 * instances of the same class are ordinary rather than awkward.
 */
const CONFIG = Symbol('Config');
const PRIMARY_GATEWAY = Symbol('PrimaryGateway');
const FALLBACK_GATEWAY = Symbol('FallbackGateway');

class Gateway {
  constructor(readonly endpoint: string, readonly timeoutMs: number) {}
  describe() {
    return `${this.endpoint} (${this.timeoutMs}ms)`;
  }
}

@Injectable()
class Payments {
  constructor(
    @Inject(PRIMARY_GATEWAY) readonly primary: Gateway,
    @Inject(FALLBACK_GATEWAY) readonly fallback: Gateway,
  ) {}
}

@Module({
  providers: [
    { provide: CONFIG, useValue: { host: 'api.example.test', timeoutMs: 2000 } },
    {
      provide: PRIMARY_GATEWAY,
      // The @Bean method, by another name. `inject` is its parameter list, and
      // the container passes those in the order they are declared.
      useFactory: (cfg: { host: string; timeoutMs: number }) =>
        new Gateway(`https://${cfg.host}/v2`, cfg.timeoutMs),
      inject: [CONFIG],
    },
    {
      // TWO INSTANCES OF THE SAME CLASS, which in Spring needs @Qualifier or a
      // @Primary. Here they are just two tokens.
      provide: FALLBACK_GATEWAY,
      useFactory: (cfg: { host: string; timeoutMs: number }) =>
        new Gateway(`https://${cfg.host}/v1`, cfg.timeoutMs * 2),
      inject: [CONFIG],
    },
    Payments,
  ],
})
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const payments = app.get(Payments);
const primary = payments.primary.describe();
const fallback = payments.fallback.describe();
await app.close();

console.log(`primary   ${primary}`);
console.log(`fallback  ${fallback}`);

if (primary !== 'https://api.example.test/v2 (2000ms)') {
  throw new Error(`CLAIM FAILED: primary was ${primary}`);
}
if (fallback !== 'https://api.example.test/v1 (4000ms)') {
  throw new Error(`CLAIM FAILED: fallback was ${fallback}`);
}
console.log('\nasserted: a factory provider is a @Bean method, and two tokens need no qualifier');
