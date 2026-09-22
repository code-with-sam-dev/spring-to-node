import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentRequest } from './dto/create-payment.dto.js';
import { PaymentEntity } from './payment.entity.js';

/*
  WHY THIS SPEC IS A FAKE REPOSITORY RATHER THAN A MOCK LIBRARY.

  PaymentsService takes an injected TypeORM Repository. A unit test has three
  options: spin up Postgres (that is the integration test, and it lives
  elsewhere), mock every method call (which asserts HOW the service talks to the
  repository rather than WHAT it guarantees), or supply a small honest fake.

  The fake is the right one here, because the guarantee under test is
  behavioural: the same idempotency key must give you back the same payment.
  A mock would let that pass while the service did something incoherent.

  WHAT THIS SPEC DELIBERATELY DOES NOT COVER: the lost-race path, where two
  concurrent inserts collide and Postgres raises 23505. That is not reachable
  without a real database and a real race, so it belongs in the integration
  suite. A fake that pretended to raise 23505 would be testing the fake.

  THIS FILE WAS RED FOR A WHILE AND NOBODY NOTICED. It was written against an
  earlier in-memory service with a no-argument constructor and synchronous
  methods. When the persistence episode gave the service a repository and made
  it async, the spec kept calling `new PaymentsService()` and reading `.id` off
  a Promise. Worse, its last test asserted that idempotency was NOT enforced,
  which stopped being true the moment the idempotency work landed. A test
  asserting the opposite of the current guarantee is worse than no test.
*/

/** The slice of Repository<PaymentEntity> that PaymentsService actually uses. */
class FakePaymentRepository {
  private rows: PaymentEntity[] = [];
  private next = 1;

  create(partial: Partial<PaymentEntity>): PaymentEntity {
    return { ...partial } as PaymentEntity;
  }

  async save(entity: PaymentEntity): Promise<PaymentEntity> {
    const saved = {
      ...entity,
      id: entity.id ?? `0000-${this.next++}`,
      createdAt: entity.createdAt ?? new Date(Date.now() + this.next),
    } as PaymentEntity;
    this.rows.push(saved);
    return saved;
  }

  async findOne(options: {where: Partial<PaymentEntity>}): Promise<PaymentEntity | null> {
    const [[key, value]] = Object.entries(options.where);
    return this.rows.find((r) => (r as any)[key] === value) ?? null;
  }

  async find(options?: {order?: {createdAt?: 'ASC' | 'DESC'}}): Promise<PaymentEntity[]> {
    const rows = [...this.rows];
    if (options?.order?.createdAt === 'DESC') {
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return rows;
  }
}

const request = (over: Partial<CreatePaymentRequest> = {}): CreatePaymentRequest => ({
  amountInMinorUnits: 10_000,
  currency: 'USD',
  idempotencyKey: 'key-1',
  ...over,
});

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = new PaymentsService(new FakePaymentRepository() as never);
  });

  it('creates a payment and gives it an id', async () => {
    const payment = await service.create(request());
    expect(payment.id).toMatch(/^pay_/);
    expect(payment.amountInMinorUnits).toBe(10_000);
    expect(payment.currency).toBe('USD');
  });

  it('finds a payment it created', async () => {
    const created = await service.create(request());
    expect(await service.findById(created.id)).toEqual(created);
  });

  it('returns undefined for an unknown id', async () => {
    expect(await service.findById('pay_nope')).toBeUndefined();
  });

  it('lists payments newest first', async () => {
    const first = await service.create(request({ idempotencyKey: 'key-1' }));
    const second = await service.create(request({ idempotencyKey: 'key-2' }));
    const ids = (await service.findAll()).map((p) => p.id);
    expect(ids).toEqual([second.id, first.id]);
  });

  /*
    THE GUARANTEE THE FLAGSHIP IS BUILT TO PROTECT.

    This test used to assert the OPPOSITE, because at the time it was written
    the service had no idempotency and the flagship's Act 5 was the moment it
    gained it. Act 5 happened. The test did not.
  */
  it('returns the SAME payment for a repeated idempotency key', async () => {
    const first = await service.create(request({ idempotencyKey: 'same-key' }));
    const second = await service.create(request({ idempotencyKey: 'same-key' }));

    expect(second.id).toBe(first.id);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('still treats different keys as different payments', async () => {
    await service.create(request({ idempotencyKey: 'a' }));
    await service.create(request({ idempotencyKey: 'b' }));
    expect(await service.findAll()).toHaveLength(2);
  });
});
