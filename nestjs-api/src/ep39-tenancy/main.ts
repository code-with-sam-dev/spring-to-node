import 'reflect-metadata';
import { AsyncLocalStorage } from 'node:async_hooks';
import { join } from 'node:path';
import { Controller, Get, Inject, Injectable, Module, Query, Scope, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { NestFactory, REQUEST } from '@nestjs/core';
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';
import type { NextFunction, Request, Response } from 'express';

/**
 * EPISODE 40. A tenant per request, and a feature flag rollout, run as its own process.
 *
 *   node dist/ep39-tenancy/main.js <port> <naive | als | scoped>
 *
 * naive   the tenant in a module-level variable, the way a ThreadLocal habit might port
 * als     the tenant in an AsyncLocalStorage store, one per request
 * scoped  the tenant from a request-scoped provider, injected into Payments
 */
const [port, mode] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let currentTenant: string | undefined;
const tenantStore = new AsyncLocalStorage<string | undefined>();
let paymentsCreated = 0;
const TENANT_SOURCE = 'TENANT_SOURCE';

function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  const tenant = req.header('x-tenant');
  if (mode === 'naive') {
    currentTenant = tenant;
    next();
  } else {
    tenantStore.run(tenant, next);
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestTenant {
  constructor(@Inject(REQUEST) private readonly request: Request) {}
  get id() {
    return this.request.header('x-tenant');
  }
}

/** Declared as a singleton. In scoped mode it injects the request-scoped tenant. */
@Injectable()
class Payments {
  constructor(@Inject(TENANT_SOURCE) private readonly source: { id?: string }) {
    paymentsCreated++;
  }

  tenant() {
    if (mode === 'naive') return currentTenant;
    if (mode === 'scoped') return this.source.id;
    return tenantStore.getStore();
  }
}

@Controller()
class TenancyController {
  constructor(private readonly payments: Payments) {}

  @Get('whoami')
  async whoami() {
    await sleep(200);
    return this.payments.tenant() ?? 'no tenant';
  }

  @Get('rollout')
  async rollout(@Query('n') n: string, @Query('how') how: string) {
    const client = OpenFeature.getClient();
    let out = '';
    for (let i = 1; i <= Number(n); i++) {
      const user = `user-${i}`;
      const on = how === 'openfeature'
        ? await client.getBooleanValue('new-checkout', false, { targetingKey: user })
        : [...user].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 0) % 100 < 20;
      out += on ? '1' : '0';
    }
    return out;
  }
}

/** No dependencies, so asking for the count creates nothing. */
@Controller()
class StatsController {
  @Get('created')
  created() {
    return { paymentsCreated };
  }
}

@Module({
  controllers: [TenancyController, StatsController],
  providers: [Payments, RequestTenant, mode === 'scoped' ? { provide: TENANT_SOURCE, useExisting: RequestTenant } : { provide: TENANT_SOURCE, useValue: {} }],
})
class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(tenantMiddleware).forRoutes('*path');
  }
}

void (async () => {
  await OpenFeature.setProviderAndWait(new FlagdProvider({
    resolverType: 'in-process',
    offlineFlagSourcePath: join(import.meta.dirname, '../../../flags/flags.json'),
  }));
  const app = await NestFactory.create(TenancyModule, { logger: process.env.NEST_LOG ? undefined : false });
  await app.listen(Number(port));
  console.log('READY');
})();
