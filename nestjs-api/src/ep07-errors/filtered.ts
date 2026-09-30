import 'reflect-metadata';
import {
  ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpStatus, Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The ControllerAdvice equivalent, and what it buys back.
 *
 * thrown.ts measured a domain exception carrying "short by 250" arriving at the
 * client as five generic words. That is the right default, because leaking an
 * internal message is how stack traces end up in browsers. But it means a
 * DESIGNED error, one you want the client to act on, needs somewhere to be
 * designed. In Spring that place is ControllerAdvice. Here it is a filter.
 *
 * The shape is close enough that a Spring developer will recognise it
 * immediately: catch this type, decide the status, decide the body.
 */
const PORT = 3990;

class InsufficientFunds extends Error {
  constructor(readonly shortfall: number, readonly currency: string) {
    super(`short by ${shortfall}`);
  }
}

@Catch(InsufficientFunds)
class InsufficientFundsFilter implements ExceptionFilter<InsufficientFunds> {
  catch(exception: InsufficientFunds, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    // 409 rather than 500: this is not a server fault. The request is well
    // formed, but the account's current state prevents it, which is a conflict
    // with current resource state. Not 402, which HTTP still reserves for
    // future use and so carries no agreed meaning.
    res.status(HttpStatus.CONFLICT).json({
      error: 'insufficient_funds',
      shortfallInMinorUnits: exception.shortfall,
      currency: exception.currency,
    });
  }
}

@Controller()
class PayController {
  @Get('pay')
  pay() {
    throw new InsufficientFunds(250, 'USD');
  }
}

@Module({ controllers: [PayController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new InsufficientFundsFilter());
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, ROLE: 'server' } });
  await new Promise<void>((r) => child.once('message', () => r()));

  const res = await fetch(`http://localhost:${PORT}/pay`);
  const body = await res.text();
  child.kill();

  console.log('without a filter (measured in thrown.ts):');
  console.log('  500  {"statusCode":500,"message":"Internal server error"}');
  console.log('with the filter:');
  console.log(`  ${res.status}  ${body}`);

  if (res.status !== 409) {
    throw new Error(`CLAIM FAILED: expected 409, got ${res.status}`);
  }
  if (!body.includes('250')) {
    throw new Error(`CLAIM FAILED: the shortfall did not reach the client: ${body}`);
  }
  console.log('\nasserted: the filter turns an internal type into a designed, actionable response');
}
