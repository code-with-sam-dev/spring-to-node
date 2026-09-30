import 'reflect-metadata';
import { Controller, Get, Module, Post } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SkipThrottle, Throttle, ThrottlerGuard, ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';

/**
 * EPISODE 21. One small app, three requests a minute per client, built the way the probes need:
 * with or without trust proxy, and with the default in-memory storage or one passed in.
 */
@Controller()
class PaymentsController {
  @Get('payments')
  list() {
    return 'payments';
  }

  @SkipThrottle()
  @Get('health')
  health() {
    return 'ok';
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('login')
  login() {
    return 'logged in';
  }
}

export async function startApp(opts: { trustProxy?: boolean | number; storage?: ThrottlerStorage } = {}) {
  @Module({
    imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 3 }], storage: opts.storage })],
    controllers: [PaymentsController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  })
  class RateLimitedModule {}

  const app = await NestFactory.create<NestExpressApplication>(RateLimitedModule, { logger: false });
  if (opts.trustProxy !== undefined) app.set('trust proxy', opts.trustProxy);
  await app.listen(0, '127.0.0.1');
  return app;
}

export const urlOf = (app: NestExpressApplication) => {
  const address = app.getHttpServer().address() as { port: number };
  return `http://127.0.0.1:${address.port}`;
};
