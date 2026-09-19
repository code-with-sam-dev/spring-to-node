import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from '../../src/payments/payments.module.js';
import { PaymentEntity } from '../../src/payments/payment.entity.js';

// LAYER 5: CONCURRENCY.
//
// The only layer that can catch the bug the whole flagship is about. Every
// layer above this one passed while the service was creating fifty payments
// for one idempotency key.
const PORT = Number(process.env.TEST_DB_PORT ?? 5434);

describe('layer 5: concurrency and idempotency', () => {
  let app: INestApplication;
  let baseUrl: string;

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
    // LISTEN ON A REAL PORT rather than using supertest's per-request ephemeral
    // server. Twenty five concurrent supertest calls each open their own
    // listener and the run dies with ECONNRESET, which looks like a service
    // bug and is actually a test-harness artefact. A concurrency test has to
    // exercise ONE server the way a client would.
    await app.listen(0);
    baseUrl = await app.getUrl();
  }, 30_000);

  afterAll(async () => { await app?.close(); });

  it('creates exactly ONE payment for 25 concurrent identical requests', async () => {
    const key = `race-${Date.now()}`;
    const body = JSON.stringify({ amountInMinorUnits: 7_777, currency: 'GBP', idempotencyKey: key });

    const responses = await Promise.all(
      Array.from({ length: 25 }, () =>
        fetch(`${baseUrl}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }).then((r) => r.json()),
      ),
    );

    const ids = new Set(responses.map((r: any) => r.id).filter(Boolean));
    expect(ids.size).toBe(1);

    const all = await fetch(`${baseUrl}/payments`).then((r) => r.json());
    const forKey = all.filter((p: any) => p.idempotencyKey === key);
    expect(forKey).toHaveLength(1);
  }, 30_000);
});
