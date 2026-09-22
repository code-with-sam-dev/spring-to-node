import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Episode 1, beat 3: the consequence of erasure, not the erasure itself.
 *
 * Episode 0 measured that an interface compiles to nothing. This file measures
 * what that COSTS you, which is the part a Spring developer actually trips
 * over: you cannot inject by interface, because at the moment Nest builds the
 * container there is no interface left to ask for.
 *
 * In Spring this is the most ordinary code in the codebase. Here it does not
 * start.
 */
interface PaymentGateway {
  charge(minorUnits: number): string;
}

@Injectable()
class StripeGateway implements PaymentGateway {
  charge(minorUnits: number) {
    return `charged ${minorUnits}`;
  }
}

@Injectable()
class PaymentsService {
  // Reads exactly like Spring. Compiles clean. Cannot be built.
  constructor(private readonly gateway: PaymentGateway) {}
  run() {
    return this.gateway.charge(10000);
  }
}

@Module({ providers: [StripeGateway, PaymentsService] })
class AppModule {}

// logger:false keeps Nest's banner out of the transcript.
// abortOnError:false is what makes this CATCHABLE. Without it Nest handles the
// failure itself and exits the process, so a try/catch around this call never
// runs and the script prints nothing at all.
let message = '';
try {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  await app.close();
} catch (err) {
  message = String((err as Error).message);
}

if (!message) {
  throw new Error('CLAIM FAILED: Nest built a container it should not have');
}
if (!message.includes("can't resolve dependencies of the PaymentsService")) {
  throw new Error(`CLAIM FAILED: unexpected error instead:\n${message}`);
}

// NOTHING BELOW MAY NAME THE INTERFACE IN A STRING.
//
// The script that runs this file greps the COMPILED output for the interface's
// name and expects zero hits, which is the cleanest proof of erasure there is.
// An explanatory console.log mentioning it lands in the compiled file too, and
// the grep then counts the prose instead of the code: the first version of this
// demo reported 1 occurrence and the number was measuring itself. The
// explanation lives in verify-di-tokens.sh, where it cannot contaminate what it
// is describing.
console.log('Nest refused to build the container. Its words:');
console.log('  ' + message.split('\n')[0]);
