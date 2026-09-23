import 'reflect-metadata';
import {
  CallHandler, Controller, ExecutionContext, Get, Injectable, Module,
  NestInterceptor,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Observable, map } from 'rxjs';

/**
 * THE INTERCEPTOR REWRITES THE BODY. SPRING'S HandlerInterceptor CANNOT.
 *
 * This is the transfer gap in this episode. A Spring developer reads
 * "interceptor" and maps it onto HandlerInterceptor, which is the closest name
 * and the wrong capability: postHandle is handed a ModelAndView, and for an
 * @ResponseBody method the object has already gone to the message converter.
 * Changing the payload there needs a different type entirely,
 * ResponseBodyAdvice.
 *
 * A Nest interceptor is one map() away from the body, because the handler's
 * return value is a value in a stream rather than something already written to
 * the socket. It also holds both sides of the call, which is the @Around half
 * of the job. One type does what Spring splits across three.
 */
const PORT = 3993;

@Injectable()
class EnvelopeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = process.hrtime.bigint();
    const { method, url } = ctx.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          path: `${method} ${url}`,
          // Rounded to whole milliseconds on purpose: a figure that changes on
          // every run is not a figure a viewer can check against their own.
          tookMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
        },
      })),
    );
  }
}

@Controller()
class PaymentsController {
  @Get('payments')
  list() {
    return [{ id: 'pay_1', amountInMinorUnits: 4500 }];
  }
}

@Module({ controllers: [PaymentsController] })
class AppModule {}

// TWO APPS, NOT ONE APP CHANGED HALFWAY. useGlobalInterceptors AFTER listen()
// is accepted silently and has no effect, because global enhancers are bound
// during init(). The first version of this demo did exactly that and printed
// two identical lines, which looked like the interceptor failing to work at all.
const bare = await NestFactory.create(AppModule, { logger: false });
await bare.listen(PORT);
const plain = await (await fetch(`http://localhost:${PORT}/payments`)).text();
await bare.close();

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalInterceptors(new EnvelopeInterceptor());
await app.listen(PORT);
const wrapped = await (await fetch(`http://localhost:${PORT}/payments`)).text();
await app.close();

console.log('what the handler returns:');
console.log(`  ${plain}`);
console.log('what the client receives, same handler, one interceptor added:');
console.log(`  ${wrapped}`);

const parsed = JSON.parse(wrapped);
if (!Array.isArray(parsed.data) || parsed.data[0]?.id !== 'pay_1') {
  throw new Error(`CLAIM FAILED: the original payload did not survive: ${wrapped}`);
}
if (parsed.meta?.path !== 'GET /payments') {
  throw new Error(`CLAIM FAILED: the interceptor could not read the request: ${wrapped}`);
}
if (typeof parsed.meta?.tookMs !== 'number') {
  throw new Error(`CLAIM FAILED: no timing was added: ${wrapped}`);
}
console.log('\nasserted: the handler was not touched, and the response shape changed anyway');
