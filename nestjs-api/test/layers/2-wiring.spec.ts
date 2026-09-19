import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { PaymentsController } from '../../src/payments/payments.controller.js';
import { PaymentsService } from '../../src/payments/payments.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentEntity } from '../../src/payments/payment.entity.js';

// LAYER 2: NEST WIRING. The @SpringBootTest equivalent, minus the database.
// This is the layer that catches "you forgot to declare the provider", which
// in Spring would have been found by component scanning.
describe('layer 2: module wiring', () => {
  it('can construct the controller with its dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentEntity), useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(PaymentsController)).toBeInstanceOf(PaymentsController);
  });
});
