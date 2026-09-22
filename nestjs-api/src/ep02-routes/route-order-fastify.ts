import 'reflect-metadata';
import { Controller, Get, Param, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * THE SAME CONTROLLER, ON THE OTHER HTTP ADAPTER.
 *
 * ChatGPT's catch on the episode 3 plan, and it is the sharpest thing in its
 * review: "route selection is adapter and version sensitive". NestJS does not
 * implement a router. It delegates to the underlying HTTP library, and the
 * default is Express. So "NestJS matches routes in declaration order" may be a
 * claim about EXPRESS rather than about Nest, and the episode would be stating
 * it as a framework property.
 *
 * Express's router is an ordered stack, so the first matching layer wins.
 * Fastify uses find-my-way, a radix tree. This file settles which claim the
 * narration is allowed to make, by running it rather than reasoning about it.
 */
@Controller('payments')
class WrongOrder {
  @Get(':id')
  byId(@Param('id') id: string) {
    return `byId handler, id=${id}`;
  }

  @Get('recent')
  recent() {
    return 'recent handler';
  }
}

@Module({ controllers: [WrongOrder] })
class AppModule {}

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { logger: false },
);
await app.listen(3997, '127.0.0.1');

const get = async (path: string) => {
  const res = await fetch(`http://127.0.0.1:3997${path}`);
  return { status: res.status, body: await res.text() };
};

const recent = await get('/payments/recent');
const byId = await get('/payments/123');

console.log('FASTIFY adapter, :id declared FIRST');
console.log(`  GET /payments/recent -> ${recent.status}  ${recent.body}`);
console.log(`  GET /payments/123    -> ${byId.status}  ${byId.body}`);

await app.close();

const swallowed = recent.body.includes('byId');
console.log();
console.log(swallowed
  ? 'SAME AS EXPRESS: declaration order decides. The claim is about NestJS.'
  : 'DIFFERENT FROM EXPRESS: the literal route won. The claim is about EXPRESS, not NestJS.');
