import 'reflect-metadata';
import { Controller, Get, Module, NotFoundException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * What reaches the client when a handler throws, and what the client is told.
 *
 * Three shapes a Spring developer already has instincts for:
 *
 *   a plain Error            the equivalent of an unchecked RuntimeException
 *   a framework exception    the equivalent of ResponseStatusException
 *   a domain exception       a custom type with no HTTP meaning attached
 *
 * The interesting column is not the status code, it is what the BODY says. A
 * Spring developer is used to @ControllerAdvice turning a domain exception into
 * a designed response. Without a filter, Nest turns anything it does not
 * recognise into the same five words.
 */
const PORT = 3992;

class InsufficientFunds extends Error {
  constructor(readonly shortfall: number, readonly currency: string) {
    super(`short by ${shortfall}`);
  }
}

@Controller()
class ThrowController {
  @Get('plain')
  plain() {
    throw new Error('the gateway is on fire');
  }

  @Get('framework')
  framework() {
    throw new NotFoundException('no payment with that id');
  }

  @Get('domain')
  domain() {
    throw new InsufficientFunds(250, 'USD');
  }
}

@Module({ controllers: [ThrowController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, ROLE: 'server' } });
  await new Promise<void>((r) => child.once('message', () => r()));

  for (const path of ['plain', 'framework', 'domain']) {
    const res = await fetch(`http://localhost:${PORT}/${path}`);
    const body = await res.text();
    console.log(`GET /${path.padEnd(9)} ${res.status}  ${body}`);
  }

  // Does the application survive three thrown exceptions?
  const alive = await fetch(`http://localhost:${PORT}/framework`).then((r) => r.status);
  child.kill();
  console.log(`\nstill answering afterwards: ${alive === 404 ? 'yes' : 'NO'}`);

  if (alive !== 404) {
    throw new Error('CLAIM FAILED: the application did not survive the thrown exceptions');
  }
  console.log('asserted: a thrown exception is a response, not a crash');
}
