import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * EPISODE 15 EVIDENCE: transactions and idempotency in TypeORM.
 *
 *   A  inside ds.transaction(m => ...), write through m, then throw: what is left
 *   B  the same, but write through a repository obtained OUTSIDE the transaction, then fixed
 *   C  ten concurrent requests with the same idempotency key, no unique constraint
 *   D  the same, with a unique constraint
 *   E  the constraint, with the violation translated into the existing payment
 *   F  the same catch, but INSIDE one transaction: what the next query does
 *   G  same key, different amount: ten concurrent requests, five of each
 *   H  the outbox: payment and event in one transaction, then the wrong repository for the event
 *   I  no constraint, check then insert at SERIALIZABLE, with and without a retry
 *
 * The Spring half is Ep14TransactionsTest. Tables ep14_*, created and dropped here.
 */
const base = {
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5434),
  username: 'payments',
  password: 'payments',
  database: 'payments_node',
};

@Entity('ep14_ledger')
class LedgerEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  note!: string;
}

@Entity('ep14_payments_loose')
class LoosePayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  idempotencyKey!: string;
}

@Entity('ep14_payments_keyed')
@Unique(['idempotencyKey'])
class KeyedPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  idempotencyKey!: string;
}

@Entity('ep14_payments_amount')
@Unique(['idempotencyKey'])
class AmountPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  idempotencyKey!: string;

  @Column()
  amount!: number;
}

@Entity('ep14_payments_ob')
class OutboxPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  amount!: number;
}

@Entity('ep14_outbox')
class OutboxEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string;
}

const ds = new DataSource({ ...base, entities: [LedgerEntry, LoosePayment, KeyedPayment, AmountPayment, OutboxPayment, OutboxEvent], synchronize: true, poolSize: 20 });
await ds.initialize();
const ledger = ds.getRepository(LedgerEntry);
const count = async () => ledger.count();

/* A */
await ledger.clear();
console.log('=== A: write through the transaction manager, then throw ===');
try {
  await ds.transaction(async (m) => {
    await m.save(LedgerEntry, { note: 'debit' });
    await m.save(LedgerEntry, { note: 'credit' });
    throw new Error('boom');
  });
} catch { /* expected */ }
console.log(`  rows left after the error: ${await count()}`);

/* B */
await ledger.clear();
console.log('\n=== B: the same, but through the repository from outside the transaction ===');
try {
  await ds.transaction(async (m) => {
    await ledger.save({ note: 'debit' });
    await m.save(LedgerEntry, { note: 'credit' });
    throw new Error('boom');
  });
} catch { /* expected */ }
console.log(`  rows left after the error: ${await count()}`);
console.log(`  which: ${JSON.stringify((await ledger.find()).map((e) => e.note))}`);

/* B, fixed */
await ledger.clear();
console.log('\n=== B, fixed: the repository taken from the manager ===');
try {
  await ds.transaction(async (m) => {
    const repo = m.getRepository(LedgerEntry);
    await repo.save({ note: 'debit' });
    await repo.save({ note: 'credit' });
    throw new Error('boom');
  });
} catch { /* expected */ }
console.log(`  rows left after the error: ${await count()}`);

/* C, D */
const race = async (label: string, entity: typeof LoosePayment | typeof KeyedPayment) => {
  const repo = ds.getRepository(entity);
  await repo.clear();
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => (async () => {
    const existing = await repo.findOneBy({ idempotencyKey: 'pay-42' });
    if (existing) return 'duplicate, returned existing';
    await repo.save({ idempotencyKey: 'pay-42' });
    return 'inserted';
  })()));
  const tally = results.map((r) => (r.status === 'fulfilled' ? r.value : `rejected: ${(r.reason as { code?: string }).code ?? (r.reason as Error).message}`));
  const counts = tally.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});
  console.log(`\n=== ${label} ===`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${v} x ${k}`);
  console.log(`  rows with key pay-42: ${await repo.countBy({ idempotencyKey: 'pay-42' })}`);
};
await race('C: 10 concurrent requests, same key, check then insert, no constraint', LoosePayment);
await race('D: the same, with a unique constraint on the key', KeyedPayment);

/* E */
{
  const repo = ds.getRepository(KeyedPayment);
  await repo.clear();
  const ids = await Promise.all(Array.from({ length: 10 }, async () => {
    try {
      return (await repo.save({ idempotencyKey: 'pay-42' })).id;
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e;
      return (await repo.findOneByOrFail({ idempotencyKey: 'pay-42' })).id;
    }
  }));
  const counts = ids.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});
  console.log('\n=== E: the constraint, and the violation translated into the existing payment ===');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${v} x payment id ${k}`);
  console.log(`  rows with key pay-42: ${await repo.countBy({ idempotencyKey: 'pay-42' })}`);
}

const codeOf = (e: unknown) => (e as { code?: string }).code ?? (e as Error).message;
const tallyOf = (xs: string[]) => xs.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});

/* F */
{
  const repo = ds.getRepository(KeyedPayment);
  await repo.clear();
  await repo.save({ idempotencyKey: 'pay-42' });
  console.log('\n=== F: catch the duplicate INSIDE the transaction, then look up the existing payment ===');
  try {
    await ds.transaction(async (m) => {
      try {
        await m.insert(KeyedPayment, { idempotencyKey: 'pay-42' });
      } catch (e) {
        console.log(`  insert failed: ${codeOf(e)}`);
        const existing = await m.findOneBy(KeyedPayment, { idempotencyKey: 'pay-42' });
        console.log(`  lookup returned payment id ${existing?.id}`);
      }
    });
  } catch (e) {
    console.log(`  lookup failed: ${codeOf(e)} ${(e as Error).message}`);
  }
}

/* G */
{
  const repo = ds.getRepository(AmountPayment);
  await repo.clear();
  const outcomes = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
    const amount = i % 2 === 0 ? 1000 : 5000;
    try {
      await repo.insert({ idempotencyKey: 'pay-42', amount });
      return `amount ${amount}: created`;
    } catch (e) {
      if (codeOf(e) !== '23505') throw e;
      const existing = await repo.findOneByOrFail({ idempotencyKey: 'pay-42' });
      return existing.amount === amount ? `amount ${amount}: returned existing` : `amount ${amount}: 409 conflict`;
    }
  }));
  console.log('\n=== G: same key, different amount, five requests of each ===');
  for (const [k, v] of Object.entries(tallyOf(outcomes)).sort()) console.log(`  ${v} x ${k}`);
  console.log(`  rows with key pay-42: ${await repo.countBy({ idempotencyKey: 'pay-42' })}`);
}

/* H */
{
  const payments = ds.getRepository(OutboxPayment);
  const outbox = ds.getRepository(OutboxEvent);
  const rows = async () => `payment rows ${await payments.count()}, outbox rows ${await outbox.count()}`;
  console.log('\n=== H: the outbox, payment and event in one transaction ===');
  await payments.clear(); await outbox.clear();
  await ds.transaction(async (m) => {
    await m.save(OutboxPayment, { amount: 1000 });
    await m.save(OutboxEvent, { type: 'PaymentCreated' });
  });
  console.log(`  committed:              ${await rows()}`);
  await payments.clear(); await outbox.clear();
  try {
    await ds.transaction(async (m) => {
      await m.save(OutboxPayment, { amount: 1000 });
      await m.save(OutboxEvent, { type: 'PaymentCreated' });
      throw new Error('boom');
    });
  } catch { /* expected */ }
  console.log(`  failed after both:      ${await rows()}`);
  await payments.clear(); await outbox.clear();
  try {
    await ds.transaction(async (m) => {
      await m.save(OutboxPayment, { amount: 1000 });
      await outbox.save({ type: 'PaymentCreated' });
      throw new Error('boom');
    });
  } catch { /* expected */ }
  console.log(`  event via injected repo: ${await rows()}`);
}

/* I */
{
  const repo = ds.getRepository(LoosePayment);
  const attempt = () => ds.transaction('SERIALIZABLE', async (m) => {
    const existing = await m.findOneBy(LoosePayment, { idempotencyKey: 'pay-42' });
    if (existing) return 'duplicate, returned existing';
    await m.insert(LoosePayment, { idempotencyKey: 'pay-42' });
    return 'inserted';
  });
  await repo.clear();
  const once = await Promise.all(Array.from({ length: 10 }, () => attempt().catch((e) => `rejected: ${codeOf(e)}`)));
  console.log('\n=== I: no constraint, check then insert, SERIALIZABLE ===');
  for (const [k, v] of Object.entries(tallyOf(once)).sort()) console.log(`  ${v} x ${k}`);
  console.log(`  rows with key pay-42: ${await repo.countBy({ idempotencyKey: 'pay-42' })}`);

  await repo.clear();
  let retries = 0;
  const withRetry = async (): Promise<string> => {
    for (;;) {
      try { return await attempt(); } catch (e) { if (codeOf(e) !== '40001') throw e; retries++; }
    }
  };
  const retried = await Promise.all(Array.from({ length: 10 }, withRetry));
  console.log('  the same, retrying on 40001:');
  for (const [k, v] of Object.entries(tallyOf(retried)).sort()) console.log(`  ${v} x ${k}`);
  console.log(`  retries: ${retries}, rows with key pay-42: ${await repo.countBy({ idempotencyKey: 'pay-42' })}`);
}

await ds.query('DROP TABLE IF EXISTS ep14_ledger, ep14_payments_loose, ep14_payments_keyed, ep14_payments_amount, ep14_payments_ob, ep14_outbox');
await ds.destroy();
