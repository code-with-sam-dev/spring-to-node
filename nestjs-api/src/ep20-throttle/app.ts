import 'reflect-metadata';
import { Controller, Get, Injectable, Module, Post, Req } from '@nestjs/common';
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

  @SkipThrottle()
  @Get('whoami')
  whoami(@Req() req: { ip: string }) {
    return req.ip;
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post('login')
  login() {
    return 'logged in';
  }
}

/** Keyed by the signed-in user instead of the address. The x-user header stands in for a verified identity. */
@Injectable()
class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.headers['x-user'] ?? req.ip;
  }
}

export async function startApp(
  opts: { trustProxy?: boolean | number | string; storage?: ThrottlerStorage; ttl?: number; byUser?: boolean } = {},
) {
  @Module({
    imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: opts.ttl ?? 60000, limit: 3 }], storage: opts.storage })],
    controllers: [PaymentsController],
    providers: [{ provide: APP_GUARD, useClass: opts.byUser ? UserThrottlerGuard : ThrottlerGuard }],
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
