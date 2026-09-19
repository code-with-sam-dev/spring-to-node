import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PaymentEntity } from './payment.entity.js';
import type { Payment } from './payment.js';
import type { CreatePaymentRequest } from './dto/create-payment.dto.js';

// @InjectRepository(PaymentEntity) is the nearest thing to having Spring Data
// hand you a JpaRepository<Payment, String>. The difference: Spring Data
// GENERATES an implementation from an interface you never write. TypeORM gives
// you a generic Repository and you write the queries yourself.
//
// Less magic, more typing, and you can always see the SQL you are asking for.
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
  ) {}

  async create(request: CreatePaymentRequest): Promise<Payment> {
    // THE IDEMPOTENT PATH, AND THE ORDER MATTERS.
    //
    // A Spring developer's instinct is: look it up, and if it is not there,
    // insert it. That instinct is correct and it is also not enough, because
    // fifty concurrent requests all look, all find nothing, and all insert.
    // Measured before this change: 50 requests, 50 payments.
    //
    // So the lookup is an OPTIMISATION for the common retry, and the database
    // constraint is the GUARANTEE. We try the insert and let Postgres be the
    // one that refuses.
    const existing = await this.payments.findOne({
      where: { idempotencyKey: request.idempotencyKey },
    });
    if (existing) {
      return toPayment(existing);
    }

    const entity = this.payments.create({
      // String() because the column is bigint, and the driver round-trips
      // bigint as a string to avoid losing precision above 2^53.
      amountInMinorUnits: String(request.amountInMinorUnits),
      currency: request.currency,
      idempotencyKey: request.idempotencyKey,
    });

    try {
      const saved = await this.payments.save(entity);
      return toPayment(saved);
    } catch (error) {
      // 23505 is Postgres for unique_violation. Losing this race is the NORMAL
      // outcome for a retry, not an error: the other request already created
      // the payment, so return it.
      if (error instanceof QueryFailedError && (error as any).driverError?.code === '23505') {
        const winner = await this.payments.findOne({
          where: { idempotencyKey: request.idempotencyKey },
        });
        if (winner) {
          return toPayment(winner);
        }
        throw new ConflictException('Duplicate idempotency key');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Payment | undefined> {
    const found = await this.payments.findOne({ where: { id: id.replace(/^pay_/, '') } });
    return found ? toPayment(found) : undefined;
  }

  async findAll(): Promise<Payment[]> {
    const rows = await this.payments.find({ order: { createdAt: 'DESC' } });
    return rows.map(toPayment);
  }
}

function toPayment(entity: PaymentEntity): Payment {
  return {
    // Prefixed to match the Spring side, so the two are comparable on screen.
    id: `pay_${entity.id}`,
    amountInMinorUnits: Number(entity.amountInMinorUnits),
    currency: entity.currency,
    idempotencyKey: entity.idempotencyKey,
    createdAt: entity.createdAt.toISOString(),
  };
}
