import 'reflect-metadata';
import { CanActivate, Controller, ExecutionContext, Get, INestApplication, Injectable, SetMetadata, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

/**
 * EPISODE 20 PROBE, D: the Nest counterpart of @PreAuthorize("hasRole('ADMIN')"). A @Roles()
 * marker and a RolesGuard on the route. Called as a user and an admin through the route, and
 * directly on the service.
 */
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const needed = this.reflector.get<string[]>('roles', context.getHandler()) ?? [];
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const roles = (req.headers['x-roles'] ?? '').split(',');
    return needed.every((r) => roles.includes(r));
  }
}

@Injectable()
class RefundService {
  approve() {
    return 'approved';
  }
}

@Controller('refunds')
class RefundsController {
  constructor(private readonly refunds: RefundService) {}

  @Get('approve')
  @Roles('admin')
  @UseGuards(RolesGuard)
  approve() {
    return this.refunds.approve();
  }
}

describe('D: a role check on the route', () => {
  let app: INestApplication;
  let service: RefundService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [RefundsController], providers: [RefundService, RolesGuard] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = moduleRef.get(RefundService);
  });

  afterAll(async () => app.close());

  it('answers each caller', async () => {
    const user = await request(app.getHttpServer()).get('/refunds/approve').set('x-roles', 'user');
    console.log(`  Nest, D, @Roles + RolesGuard, user via route: ${user.status}`);
    const admin = await request(app.getHttpServer()).get('/refunds/approve').set('x-roles', 'user,admin');
    console.log(`  Nest, D, @Roles + RolesGuard, admin via route: ${admin.status}`);
    console.log(`  Nest, D, @Roles + RolesGuard, direct call, no user: ${service.approve()}`);
  });
});
