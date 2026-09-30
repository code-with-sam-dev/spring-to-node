import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * EPISODE 15 EVIDENCE: transactions and idempotency in TypeORM.
 *
 *   A  inside ds.transaction(m => ...), write through m, then throw: what is left
 *   B  the same, but write through a repository obtained OUTSIDE the transaction
 *   C  ten concurrent requests with the same idempotency key, no unique constraint
 *   D  the same, with a unique constraint
 *   E  the constraint, with the violation translated into the existing payment
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

const ds = new DataSource({ ...base, entities: [LedgerEntry, LoosePayment, KeyedPayment], synchronize: true, poolSize: 20 });
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

await ds.query('DROP TABLE IF EXISTS ep14_ledger, ep14_payments_loose, ep14_payments_keyed');
await ds.destroy();
