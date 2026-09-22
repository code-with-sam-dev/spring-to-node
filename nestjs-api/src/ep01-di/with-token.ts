import 'reflect-metadata';
import { Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * The same container as by-type.ts, with the one change that makes it build.
 *
 * The interface is still erased. Nothing here recovers it. What changes is that
 * the constructor no longer asks for a TYPE, it asks for a NAME that survives
 * compilation: a string or, better, a symbol.
 */
interface PaymentGateway {
  charge(minorUnits: number): string;
}

// The token is a real runtime value. That is the entire trick.
const PAYMENT_GATEWAY = Symbol('PaymentGateway');

@Injectable()
class StripeGateway implements PaymentGateway {
  charge(minorUnits: number) {
    return `charged ${minorUnits}`;
  }
}

@Injectable()
class PaymentsService {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}
  run() {
    return this.gateway.charge(10000);
  }
}

@Module({
  providers: [
    { provide: PAYMENT_GATEWAY, useClass: StripeGateway },
    PaymentsService,
  ],
})
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
  abortOnError: false,
});
const result = app.get(PaymentsService).run();
await app.close();

if (result !== 'charged 10000') {
  throw new Error(`CLAIM FAILED: expected 'charged 10000', got '${result}'`);
}

console.log('The container built, and the service ran:');
console.log('  ' + result);
console.log();
console.log('Nothing recovered the interface. It is still erased.');
console.log('The constructor simply stopped asking for a TYPE and asked for a');
console.log('NAME that exists at runtime: a symbol.');
