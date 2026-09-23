import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

/**
 * The application starts. The setting is not there. Nobody says anything.
 *
 * THIS IS THE EPISODE'S ONE THING. A Spring developer has never had to worry
 * about a missing required property, because Spring refuses to start:
 *
 *     Could not resolve placeholder 'payment.gateway.url' in value
 *     "${payment.gateway.url}"
 *
 * That failure is a gift. It happens on your machine, at startup, with the name
 * of the missing key in the message. NestJS by default does the opposite: a key
 * that was never set reads back as `undefined`, the container builds, the
 * server listens, and the first person to find out is whoever calls the
 * endpoint that needed it.
 *
 * Nothing here is a bug in NestJS. It is a different default, and the whole
 * episode is about closing the gap deliberately.
 */
@Injectable()
class PaymentsService {
  constructor(private readonly config: ConfigService) {}

  gatewayUrl() {
    // No default, no validation. Exactly what a port of @Value looks like when
    // you write it from memory.
    return this.config.get<string>('PAYMENT_GATEWAY_URL');
  }
}

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  providers: [PaymentsService],
})
class AppModule {}

// Make sure the variable really is absent, so the demo cannot pass by accident
// on a machine that happens to have it set.
delete process.env.PAYMENT_GATEWAY_URL;

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const url = app.get(PaymentsService).gatewayUrl();
await app.close();

console.log(`the application started: yes`);
console.log(`PAYMENT_GATEWAY_URL     ${String(url)}`);
console.log(`typeof                  ${typeof url}`);

if (url !== undefined) {
  throw new Error(`CLAIM FAILED: expected undefined, got ${String(url)}`);
}
console.log('\nasserted: a missing setting is undefined, and the app starts anyway');
