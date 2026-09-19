import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentRequest } from './dto/create-payment.dto.js';

const request = (over: Partial<CreatePaymentRequest> = {}): CreatePaymentRequest => ({
  amountInMinorUnits: 10_000,
  currency: 'USD',
  idempotencyKey: 'key-1',
  ...over,
});

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = new PaymentsService();
  });

  it('creates a payment and gives it an id', () => {
    const payment = service.create(request());
    expect(payment.id).toMatch(/^pay_/);
    expect(payment.amountInMinorUnits).toBe(10_000);
    expect(payment.currency).toBe('USD');
  });

  it('finds a payment it created', () => {
    const created = service.create(request());
    expect(service.findById(created.id)).toEqual(created);
  });

  it('returns undefined for an unknown id', () => {
    expect(service.findById('pay_nope')).toBeUndefined();
  });

  it('lists payments newest first', () => {
    const first = service.create(request({ idempotencyKey: 'key-1' }));
    const second = service.create(request({ idempotencyKey: 'key-2' }));
    expect(service.findAll().map((p) => p.id)).toEqual([second.id, first.id]);
  });

  // THE FLAGSHIP'S ACT 5 LIVES HERE. This is the guarantee the whole video is
  // built to protect, and at this point in the build it is NOT protected: the
  // service happily creates two payments for one idempotency key. The test
  // records today's honest behaviour so the change in Act 5 is visible.
  it('DOES NOT YET enforce idempotency, and that is the open loop', () => {
    const first = service.create(request({ idempotencyKey: 'same-key' }));
    const second = service.create(request({ idempotencyKey: 'same-key' }));
    expect(first.id).not.toBe(second.id);
    expect(service.findAll()).toHaveLength(2);
  });
});
