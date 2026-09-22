import 'reflect-metadata';
import { Injectable, Module, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Where @PostConstruct went, and the ordering it does and does not promise.
 *
 * THE CLAIM HERE NEEDS CARE, and the plan flagged it: an ordering you can
 * OBSERVE is not an ordering that is SPECIFIED. This file measures what
 * actually happens, and the episode may only state what the documentation
 * promises. Observed and promised are different words and the narration uses
 * the right one.
 *
 * What is safe to say either way is the SHAPE: the constructor cannot do
 * asynchronous work, so a hook exists for the part that can, exactly as
 * @PostConstruct exists in Spring for the same reason.
 */
const order: string[] = [];

@Injectable()
class Migrations implements OnModuleInit, OnApplicationBootstrap {
  constructor() {
    // A constructor cannot await, which is the whole reason a hook exists.
    order.push('constructor');
  }

  async onModuleInit() {
    await new Promise((r) => setTimeout(r, 10));
    order.push('onModuleInit');
  }

  onApplicationBootstrap() {
    order.push('onApplicationBootstrap');
  }
}

@Module({ providers: [Migrations] })
class AppModule {}

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
order.push('container ready');
await app.close();

for (const [i, step] of order.entries()) console.log(`${i + 1}. ${step}`);

const expected = ['constructor', 'onModuleInit', 'onApplicationBootstrap', 'container ready'];
if (order.join(' -> ') !== expected.join(' -> ')) {
  throw new Error(`CLAIM FAILED: observed ${order.join(' -> ')}`);
}
console.log('\nasserted (OBSERVED, on this version): constructor, then onModuleInit awaited to completion,');
console.log('then onApplicationBootstrap, and only then is the container handed back.');
