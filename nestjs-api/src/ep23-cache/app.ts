import 'reflect-metadata';
import { CACHE_MANAGER, CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Body, Controller, ExecutionContext, Get, Headers, Inject, Injectable, Module, Param, Put, UseInterceptors } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import KeyvRedis from '@keyv/redis';
import type { Cache } from 'cache-manager';

/**
 * EPISODE 24. A payments app whose repository counts every load, cached with @nestjs/cache-manager,
 * in memory or in Redis.
 */
export class Loads {
  count = 0;
}

@Injectable()
class PaymentsRepository {
  private readonly rows = new Map<string, string>([['pay_1', 'pending']]);
  constructor(private readonly loads: Loads) {}

  async find(id: string) {
    this.loads.count++;
    await new Promise((r) => setTimeout(r, 50));
    return { id, status: this.rows.get(id) };
  }

  update(id: string, status: string) {
    this.rows.set(id, status);
  }
}

/** The interceptor's key, with the user in it. The x-user header stands in for a verified identity. */
@Injectable()
class PerUserCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const url = super.trackBy(context);
    const user = context.switchToHttp().getRequest<{ headers: Record<string, string> }>().headers['x-user'];
    return url && user ? `${url}:${user}` : undefined;
  }
}

@Controller()
@UseInterceptors(PerUserCacheInterceptor)
class AccountController {
  @Get('me-per-user')
  me(@Headers('x-user') user: string) {
    return { user, balance: user === 'alice' ? 1200 : 40 };
  }
}

/** Cache-aside in a service, with the in-flight load shared, so a cold key is loaded once per instance. */
@Injectable()
class PaymentsReader {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly payments: PaymentsRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async find(id: string) {
    const key = `payment:${id}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;
    let load = this.inFlight.get(key);
    if (!load) {
      load = this.payments.find(id).then(async (payment) => {
        await this.cache.set(key, payment);
        return payment;
      }).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, load);
    }
    return load;
  }
}

@Controller()
@UseInterceptors(CacheInterceptor)
class PaymentsController {
  constructor(
    private readonly payments: PaymentsRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly reader: PaymentsReader,
  ) {}

  @Get('me')
  me(@Headers('x-user') user: string) {
    return { user, balance: user === 'alice' ? 1200 : 40 };
  }

  @Get('payments/:id')
  find(@Param('id') id: string) {
    return this.payments.find(id);
  }

  @Get('payments-once/:id')
  findOnce(@Param('id') id: string) {
    return this.reader.find(id);
  }

  @Put('payments/:id')
  update(@Param('id') id: string, @Body() body: { status: string }) {
    this.payments.update(id, body.status);
    return { id, status: body.status };
  }

  @Put('payments/:id/evicting')
  async updateAndEvict(@Param('id') id: string, @Body() body: { status: string }) {
    this.payments.update(id, body.status);
    await this.cache.del(`/payments/${id}`);
    return { id, status: body.status };
  }
}

export async function startApp(opts: { redisUrl?: string } = {}) {
  const loads = new Loads();

  @Module({
    imports: [
      opts.redisUrl
        ? CacheModule.register({ stores: [new KeyvRedis(opts.redisUrl)] })
        : CacheModule.register(),
    ],
    controllers: [PaymentsController, AccountController],
    providers: [PaymentsRepository, PaymentsReader, { provide: Loads, useValue: loads }],
  })
  class PaymentsModule {}

  const app = await NestFactory.create(PaymentsModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as { port: number };
  return { app, url: `http://127.0.0.1:${port}`, loads };
}
