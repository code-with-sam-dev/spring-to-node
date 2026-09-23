import 'reflect-metadata';
import {
  Controller, Get, Injectable, MiddlewareConsumer, Module, NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

/**
 * WHEN THREE MIDDLEWARES WANT THE SAME REQUEST, WHO GOES FIRST?
 *
 * A Spring developer has an answer to this already, and it is a NUMBER:
 * FilterRegistrationBean.setOrder, or @Order on the bean. The ordering is
 * declared on the thing being ordered, so it is visible where you are reading.
 *
 * Nest has no such number for middleware. This measures what actually decides
 * it, because a guess here is a guess about the order security checks run in.
 */
const PORT = 3994;

const order: string[] = [];

const named = (name: string) => {
  @Injectable()
  class Named implements NestMiddleware {
    use(_req: Request, _res: Response, next: NextFunction) {
      order.push(name);
      next();
    }
  }
  return Named;
};

const First = named('first');
const Second = named('second');
const Third = named('third');
const FromImportedModule = named('from-imported-module');

@Controller()
class OkController {
  @Get('ok')
  ok() {
    return { ok: true };
  }
}

@Module({})
class ImportedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FromImportedModule).forRoutes('*');
  }
}

@Module({ imports: [ImportedModule], controllers: [OkController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Deliberately applied in an order that is NOT alphabetical and NOT the
    // order the classes were declared in, so a pass would be meaningful.
    consumer.apply(Third, First, Second).forRoutes('*');
  }
}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(PORT);
await fetch(`http://localhost:${PORT}/ok`);
await app.close();

console.log('applied as: consumer.apply(Third, First, Second)');
console.log('imported module also applies one, on the same route\n');
console.log('the order they actually ran in:');
order.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));

const got = order.join(' -> ');
console.log(`\nobserved: ${got}`);

const applied = order.filter((n) => n !== 'from-imported-module');
if (applied.join(' -> ') !== 'third -> first -> second') {
  throw new Error(`CLAIM FAILED: apply() order was not honoured: ${got}`);
}
console.log('asserted: the argument order of apply() decides it, not the class names');
console.log(`asserted: an imported module's middleware ran at position ${order.indexOf('from-imported-module') + 1} of ${order.length}`);
