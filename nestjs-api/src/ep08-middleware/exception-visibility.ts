import 'reflect-metadata';
import {
  CallHandler, Controller, ExecutionContext, Get, Injectable,
  MiddlewareConsumer, Module, NestInterceptor, NestMiddleware, NestModule,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Observable, catchError, throwError } from 'rxjs';
import type { NextFunction, Request, Response } from 'express';

/**
 * THE ONE THAT DECIDES WHICH HOOK YOU REACCH FOR.
 *
 * A Spring developer's instinct for cross cutting error work is a servlet
 * Filter: wrap chain.doFilter in a try/catch and you have seen everything
 * downstream. That instinct does not survive the move, and the reason is
 * structural rather than stylistic.
 *
 * Nest middleware IS Express middleware. It sits OUTSIDE the Nest pipeline, so
 * Nest's own exception layer has already dealt with the throw before control
 * ever comes back. A try/catch around next() catches nothing at all, because
 * next() returns immediately and the handler runs later.
 *
 * What the middleware CAN still see is the finished response. So it learns THAT
 * the request failed, and never WHY.
 */
const PORT = 3992;

const seen: string[] = [];

@Injectable()
class CatchingMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    // The instinct a Spring developer arrives with. It is not wrong, it is
    // aimed at a layer that no longer contains the exception.
    res.on('finish', () => seen.push(`middleware saw status ${res.statusCode}`));
    try {
      next();
    } catch (e) {
      seen.push(`middleware CAUGHT ${(e as Error).message}`);
    }
  }
}

@Injectable()
class CatchingInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((e) => {
        seen.push(`interceptor CAUGHT ${(e as Error).message}`);
        return throwError(() => e);
      }),
    );
  }
}

@Controller()
class BoomController {
  @Get('boom')
  boom(): never {
    throw new Error('the database refused the write');
  }
}

@Module({ controllers: [BoomController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CatchingMiddleware).forRoutes('*');
  }
}

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalInterceptors(new CatchingInterceptor());
await app.listen(PORT);

const res = await fetch(`http://localhost:${PORT}/boom`);
const body = await res.text();
// res.on('finish') fires after the response is flushed, which can land just
// after fetch resolves. One tick is enough and beats an arbitrary sleep.
await new Promise((r) => setImmediate(r));
await app.close();

console.log(`the client got: ${res.status} ${body}\n`);
console.log('what each hook saw:');
for (const s of seen) console.log(`  ${s}`);

const caughtByMiddleware = seen.some((s) => s.startsWith('middleware CAUGHT'));
const caughtByInterceptor = seen.some((s) => s.startsWith('interceptor CAUGHT'));
const middlewareSawStatus = seen.some((s) => s.startsWith('middleware saw status'));

console.log();
if (caughtByMiddleware) {
  throw new Error('CLAIM FAILED: the middleware caught the handler exception');
}
if (!caughtByInterceptor) {
  throw new Error('CLAIM FAILED: the interceptor did not see the exception');
}
if (!middlewareSawStatus) {
  throw new Error('CLAIM FAILED: the middleware never saw the response at all');
}
console.log('asserted: the middleware learns THAT it failed, the interceptor learns WHY');
