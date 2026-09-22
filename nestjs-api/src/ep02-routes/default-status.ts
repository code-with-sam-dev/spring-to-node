import 'reflect-metadata';
import { Controller, Get, Post, Body, HttpCode, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * What status code does a handler return when you do not say?
 *
 * Spring returns 200 for everything unless you reach for ResponseEntity or
 * @ResponseStatus. NestJS returns 200 for most verbs and 201 for POST, with no
 * annotation anywhere. A Spring developer porting a controller therefore
 * changes the contract of every POST endpoint without typing anything.
 */
@Controller('orders')
class OrdersController {
  @Get()
  list() {
    return [];
  }

  @Post()
  create(@Body() body: unknown) {
    return { created: true };
  }

  /*
    The way back to Spring's contract, and the reason there is no ResponseEntity
    in NestJS: you return the OBJECT and adjust the envelope with a decorator,
    rather than wrapping the object in a response type.
  */
  @Post('legacy')
  @HttpCode(200)
  createLegacy(@Body() body: unknown) {
    return { created: true };
  }
}

@Module({ controllers: [OrdersController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3998);

const getRes = await fetch('http://localhost:3998/orders');
const postRes = await fetch('http://localhost:3998/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});

console.log(`GET  /orders -> ${getRes.status}`);
const legacyRes = await fetch('http://localhost:3998/orders/legacy', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});

console.log(`POST /orders -> ${postRes.status}   <-- nothing declared this`);
console.log(`POST /orders/legacy -> ${legacyRes.status}   <-- @HttpCode(200), no ResponseEntity`);

await app.close();

if (getRes.status !== 200) throw new Error(`CLAIM FAILED: GET was ${getRes.status}`);
if (postRes.status !== 201) throw new Error(`CLAIM FAILED: POST was ${postRes.status}`);
if (legacyRes.status !== 200) throw new Error(`CLAIM FAILED: @HttpCode gave ${legacyRes.status}`);
console.log('\nall three asserted');
