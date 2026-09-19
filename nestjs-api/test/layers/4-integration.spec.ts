import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PaymentsModule } from '../../src/payments/payments.module.js';
import { PaymentEntity } from '../../src/payments/payment.entity.js';

// LAYER 4: AGAINST A REAL POSTGRES.
//
// This is the layer that can see what the mocked one cannot: the column
// mapping, the constraint, the SQL that actually runs. @DataJpaTest is the
// nearest Spring relative, except that this one talks to the real engine
// rather than an in-memory substitute, which matters because the bugs live in
// the differences between engines.
//
// Requires: docker compose up -d   (POSTGRES_PORT from .env)
const PORT = Number(process.env.TEST_DB_PORT ?? 5434);

describe('layer 4: integration against real PostgreSQL', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: PORT,
          username: 'payments',
          password: 'payments',
          database: 'payments_node',
          entities: [PaymentEntity],
          synchronize: true,
        }),
        PaymentsModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => { await app?.close(); });

  it('round trips a payment through the database', async () => {
    const key = `it-${Date.now()}`;
    const created = await request(app.getHttpServer())
      .post('/payments')
      .send({ amountInMinorUnits: 12_345, currency: 'USD', idempotencyKey: key })
      .expect(201);

    const fetched = await request(app.getHttpServer())
      .get(`/payments/${created.body.id}`)
      .expect(200);

    // THE ASSERTION THE MOCKED LAYER CANNOT MAKE: the value came back from
    // Postgres, through the column mapping, as the right number.
    expect(fetched.body.amountInMinorUnits).toBe(12_345);
    expect(fetched.body.currency).toBe('USD');
  });

  it('returns the SAME payment for a repeated idempotency key', async () => {
    const key = `idem-${Date.now()}`;
    const body = { amountInMinorUnits: 500, currency: 'EUR', idempotencyKey: key };

    const first = await request(app.getHttpServer()).post('/payments').send(body).expect(201);
    const second = await request(app.getHttpServer()).post('/payments').send(body).expect(201);

    expect(second.body.id).toBe(first.body.id);
  });
});
