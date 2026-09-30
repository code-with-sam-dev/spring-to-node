import 'reflect-metadata';
import { CanActivate, Controller, ExecutionContext, Get, INestApplication, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

/**
 * EPISODE 20 PROBE, B: the guard registered globally with APP_GUARD, a @Public() marker for the
 * routes that really are open, and 401 thrown for a missing token instead of returning false.
 */
const IS_PUBLIC = 'isPublic';
const Public = () => SetMetadata(IS_PUBLIC, true);

@Injectable()
class GlobalTokenGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const open = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (open) return true;
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    if (!req.headers.authorization) throw new UnauthorizedException();
    return req.headers.authorization === 'Bearer valid';
  }
}

@Controller('payments')
class PaymentsController {
  @Get()
  list() {
    return 'payments';
  }
}

@Controller('refunds')
class RefundsController {
  @Get()
  list() {
    return 'refunds';
  }
}

@Controller('health')
class HealthController {
  @Public()
  @Get()
  check() {
    return 'ok';
  }
}

describe('B: a global guard with a public opt-out', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController, RefundsController, HealthController],
      providers: [{ provide: APP_GUARD, useClass: GlobalTokenGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('answers each request', async () => {
    for (const path of ['/payments', '/refunds', '/health']) {
      const res = await request(app.getHttpServer()).get(path);
      console.log(`  Nest, B, APP_GUARD, GET ${path} anonymous: ${res.status}`);
    }
    const wrong = await request(app.getHttpServer()).get('/refunds').set('Authorization', 'Bearer nope');
    console.log(`  Nest, B, APP_GUARD, GET /refunds wrong token: ${wrong.status}`);
    const ok = await request(app.getHttpServer()).get('/refunds').set('Authorization', 'Bearer valid');
    console.log(`  Nest, B, APP_GUARD, GET /refunds valid token: ${ok.status}`);
  });
});
