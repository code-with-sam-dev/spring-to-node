import 'reflect-metadata';
import { CanActivate, Controller, ExecutionContext, Get, INestApplication, Injectable, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

/**
 * EPISODE 20 PROBE, A: a guard on the payments controller, and a refunds controller added later
 * with no security code of its own. What does each answer without credentials?
 */
@Injectable()
class TokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    return req.headers.authorization === 'Bearer valid';
  }
}

@Controller('payments')
@UseGuards(TokenGuard)
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

describe('A: a guard per controller', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [PaymentsController, RefundsController], providers: [TokenGuard] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('answers anonymous requests', async () => {
    for (const path of ['/payments', '/refunds']) {
      const res = await request(app.getHttpServer()).get(path);
      console.log(`  Nest, A, @UseGuards on payments only, GET ${path} anonymous: ${res.status}`);
    }
  });
});
