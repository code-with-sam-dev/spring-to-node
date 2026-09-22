import 'reflect-metadata';
import { Controller, Get, Param, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Episode 3, the beat: NestJS matches routes in DECLARATION ORDER.
 *
 * Spring picks the most SPECIFIC pattern, so the order you write the methods in
 * does not matter. NestJS walks the handlers in the order the decorators ran,
 * so a parameter route declared above a literal route swallows it.
 *
 * This is the same class of bug as the erasure one: it compiles, it starts, it
 * passes a smoke test on /payments/123, and /payments/recent quietly returns
 * the wrong handler with id="recent".
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

@Controller('fixed')
class RightOrder {
  @Get('recent')
  recent() {
    return 'recent handler';
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return `byId handler, id=${id}`;
  }
}

@Module({ controllers: [WrongOrder, RightOrder] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3999);

const get = async (path: string) => {
  const res = await fetch(`http://localhost:3999${path}`);
  return { status: res.status, body: await res.text() };
};

const a = await get('/payments/recent');
const b = await get('/fixed/recent');
const c = await get('/payments/123');

console.log('DECLARED :id FIRST');
console.log(`  GET /payments/recent -> ${a.status}  ${a.body}`);
console.log('DECLARED recent FIRST');
console.log(`  GET /fixed/recent    -> ${b.status}  ${b.body}`);
console.log('the parameter route still works either way');
console.log(`  GET /payments/123    -> ${c.status}  ${c.body}`);

await app.close();

if (!a.body.includes('byId')) {
  throw new Error('CLAIM FAILED: expected the :id handler to swallow /recent');
}
if (!b.body.includes('recent handler')) {
  throw new Error('CLAIM FAILED: expected declaration order to fix it');
}
console.log('\nboth claims asserted by the demo that printed them');
