import 'reflect-metadata';
import { Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * DOES FIELD INJECTION EXIST IN NESTJS?
 *
 * The first plan for episode 4 had a Short titled "Field injection does not
 * exist here". That was an assumption, and this measures it before it is said.
 */
@Injectable()
class Clock {
  now() {
    return 'tick';
  }
}

@Injectable()
class UsesAField {
  // No constructor parameter at all. The dependency arrives on a property.
  @Inject(Clock)
  private readonly clock!: Clock;

  read() {
    return this.clock?.now() ?? 'undefined';
  }
}

@Module({ providers: [Clock, UsesAField] })
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const got = app.get(UsesAField).read();
await app.close();

console.log(`a property decorated with Inject, no constructor: ${got}`);
if (got !== 'tick') {
  throw new Error(`OBSERVATION CHANGED: property injection did not work: ${got}`);
}
console.log('asserted: field injection EXISTS in NestJS. The planned Short 4 was wrong.');
