import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsController } from '../../src/payments/payments.controller.js';
import { PaymentsService } from '../../src/payments/payments.service.js';
import { PaymentEntity } from '../../src/payments/payment.entity.js';

// LAYER 3: HTTP CONTRACT, REPOSITORY MOCKED.
//
// This is the MockMvc equivalent and it is the most dangerous layer in the
// suite, because it looks like an integration test and is not one. A mocked
// repository cannot enforce a constraint, cannot fail on a duplicate, and
// cannot tell you the column mapping is wrong.
//
// It IS the right layer for one thing: the shape of the HTTP contract.
describe('layer 3: HTTP contract (mocked repository)', () => {
  let app: INestApplication;
  const rows: any[] = [];

  beforeAll(async () => {
    const repo = {
      create: (x: any) => ({ ...x, id: `mock-${rows.length}`, createdAt: new Date() }),
      save: async (x: any) => { rows.push(x); return x; },
      findOne: async () => null,
      find: async () => rows,
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [PaymentsService, { provide: getRepositoryToken(PaymentEntity), useValue: repo }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('accepts a well formed payment', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({ amountInMinorUnits: 10_000, currency: 'USD', idempotencyKey: 'c1' })
      .expect(201);
  });

  it('rejects a string amount', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({ amountInMinorUnits: '10000', currency: 'USD', idempotencyKey: 'c2' })
      .expect(400);
  });

  it('rejects an undeclared field', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({ amountInMinorUnits: 1, currency: 'USD', idempotencyKey: 'c3', isAdmin: true })
      .expect(400);
  });

  it('rejects an empty body', async () => {
    await request(app.getHttpServer()).post('/payments').send({}).expect(400);
  });
});
