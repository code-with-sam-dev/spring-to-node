import 'reflect-metadata';
import {
  ArgumentsHost, ArgumentMetadata, CallHandler, CanActivate, Catch, Controller,
  ExceptionFilter, ExecutionContext, Get, Injectable, MiddlewareConsumer, Module,
  NestInterceptor, NestMiddleware, NestModule, PipeTransform, Query,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { NextFunction, Request, Response } from 'express';

/**
 * WHERE DOES EACH HOOK ACTUALLY RUN?
 *
 * A Spring developer arrives with three extension points already in their
 * hands: a servlet Filter, a HandlerInterceptor, and an @Around aspect. Nest
 * has five, and knowing which one to reach for is entirely a question of WHERE
 * IN THE PIPELINE it sits, because that decides what it can still see and what
 * it can still change.
 *
 * So this measures the order rather than quoting it. The events are recorded in
 * the order they actually fire and printed back.
 */
const PORT = 3991;

const events: string[] = [];
const mark = (s: string) => { events.push(s); };

@Injectable()
class TraceMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    mark('middleware');
    next();
  }
}

@Injectable()
class TraceGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    mark('guard');
    return true;
  }
}

@Injectable()
class TraceInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    mark('interceptor:before');
    return next.handle().pipe(tap(() => mark('interceptor:after')));
  }
}

@Injectable()
class TracePipe implements PipeTransform {
  transform(value: unknown, _meta: ArgumentMetadata) {
    mark('pipe');
    return value;
  }
}

// Registered but never reached on the happy path. Its absence from the trace is
// the point: a filter is not a step, it is a diversion.
@Catch()
class TraceFilter implements ExceptionFilter {
  catch(_exception: unknown, host: ArgumentsHost) {
    mark('filter');
    host.switchToHttp().getResponse().status(500).json({ traced: true });
  }
}

@Controller()
class TraceController {
  @Get('trace')
  trace(@Query('q', TracePipe) _q: string) {
    mark('handler');
    return { ok: true };
  }
}

@Module({ controllers: [TraceController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes('*');
  }
}

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalGuards(new TraceGuard());
app.useGlobalInterceptors(new TraceInterceptor());
app.useGlobalFilters(new TraceFilter());
await app.listen(PORT);

await fetch(`http://localhost:${PORT}/trace?q=1`);
await app.close();

console.log('the order Nest actually ran them in:');
events.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

const expected = [
  'middleware', 'guard', 'interceptor:before', 'pipe', 'handler',
  'interceptor:after',
];
const got = events.join(' -> ');
console.log(`\nobserved: ${got}`);

if (got !== expected.join(' -> ')) {
  throw new Error(`CLAIM FAILED: expected ${expected.join(' -> ')}, got ${got}`);
}
if (events.includes('filter')) {
  throw new Error('CLAIM FAILED: the filter ran on a request that did not throw');
}
console.log('asserted: five hooks, one order, and the filter is not in it');
