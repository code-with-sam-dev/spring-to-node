import 'reflect-metadata';
import {
  Controller, Get, Injectable, MiddlewareConsumer, Module, NestMiddleware, NestModule,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

/**
 * Why a try/catch around next() catches nothing, measured rather than asserted.
 *
 * Two candidate explanations: (a) next() returns before the handler has run, so
 * there is nothing downstream to catch yet; (b) Nest catches the handler's
 * throw itself and turns it into a response, so it never propagates back up.
 * This records the order of events, whether the response had already been sent
 * when next() returned, and what an AWAITED next() inside a try/catch sees.
 */
const PORT = 3993;
const events: string[] = [];

@Injectable()
class PlainNext implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.originalUrl.startsWith('/plain')) return next();
    events.push('middleware: calling next()');
    try {
      next();
      events.push(`middleware: next() returned, headersSent=${res.headersSent}`);
    } catch (e) {
      events.push(`middleware: CAUGHT ${(e as Error).message}`);
    }
    res.on('finish', () => events.push(`middleware: finish, status ${res.statusCode}`));
  }
}

@Injectable()
class AwaitedNext implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (!req.originalUrl.startsWith('/awaited')) return next();
    events.push('middleware: calling await next()');
    try {
      await (next as unknown as () => Promise<unknown>)();
      events.push(`middleware: await next() resolved, headersSent=${res.headersSent}`);
    } catch (e) {
      events.push(`middleware: CAUGHT ${(e as Error).message}`);
    }
    res.on('finish', () => events.push(`middleware: finish, status ${res.statusCode}`));
  }
}

@Controller()
class BoomController {
  @Get('plain')
  plain(): never {
    events.push('handler: throwing');
    throw new Error('the database refused the write');
  }

  @Get('awaited')
  async awaited(): Promise<never> {
    events.push('handler: throwing (async handler)');
    throw new Error('the database refused the write');
  }
}

@Module({ controllers: [BoomController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PlainNext, AwaitedNext).forRoutes('*');
  }
}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(PORT);
for (const path of ['/plain', '/awaited']) {
  events.length = 0;
  const res = await fetch(`http://localhost:${PORT}${path}`);
  await res.text();
  await new Promise((r) => setTimeout(r, 50));
  console.log(`GET ${path} -> ${res.status}`);
  for (const e of events) console.log(`  ${e}`);
}
await app.close();
