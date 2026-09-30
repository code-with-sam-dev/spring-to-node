import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EPISODE 14 EVIDENCE: what a GENERATED migration would contain.
 *
 * `typeorm migration:generate` diffs the entities against the live schema, the same
 * schema builder synchronize uses. This prints its up-queries for two changes to a
 * column that already holds data, WITHOUT running them:
 *   1  a rename (quantity -> units)
 *   2  a type change (quantity varchar -> integer)
 */
const base = {
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5434),
  username: 'payments',
  password: 'payments',
  database: 'payments_node',
};

@Entity('ep13_stock')
class StockV1 {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar' }) quantity!: string;
}
@Entity('ep13_stock')
class StockRenamed {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar' }) units!: string;
}
@Entity('ep13_stock')
class StockNullableV1 {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', nullable: true }) quantity!: string | null;
}
@Entity('ep13_stock')
class StockNullableRetyped {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'integer', nullable: true }) quantity!: number | null;
}
@Entity('ep13_stock')
class StockRetyped {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'integer' }) quantity!: number;
}

const v1 = new DataSource({ ...base, entities: [StockV1] });
await v1.initialize();
await v1.query('DROP TABLE IF EXISTS ep13_stock');
await v1.synchronize();
await v1.query("INSERT INTO ep13_stock (quantity) VALUES ('12'), ('40')");
await v1.destroy();

for (const [label, entity] of [['rename quantity -> units', StockRenamed], ['type change varchar -> integer', StockRetyped]] as const) {
  const ds = new DataSource({ ...base, entities: [entity] });
  await ds.initialize();
  const plan = await ds.driver.createSchemaBuilder().log();
  console.log(`  ${label}:`);
  for (const q of plan.upQueries) console.log(`    ${q.query}`);
  await ds.destroy();
}
/* 3: RUN them, on rows holding "123" and "abc", in a transaction each, and report. */
const run = async (label: string, queries: string[]) => {
  const ds = new DataSource({ ...base, entities: [] });
  await ds.initialize();
  await ds.query('DROP TABLE IF EXISTS ep13_stock');
  await ds.query('CREATE TABLE ep13_stock (id serial PRIMARY KEY, quantity varchar NOT NULL)');
  await ds.query("INSERT INTO ep13_stock (quantity) VALUES ('123'), ('abc')");
  const qr = ds.createQueryRunner();
  await qr.startTransaction();
  let outcome = 'ran';
  try {
    for (const q of queries) await qr.query(q);
    await qr.commitTransaction();
  } catch (e) {
    await qr.rollbackTransaction();
    outcome = `failed and rolled back: ${(e as Error).message}`;
  }
  await qr.release();
  const rows = await ds.query('SELECT * FROM ep13_stock ORDER BY id');
  console.log(`  ${label}: ${outcome}`);
  console.log(`    rows after: ${JSON.stringify(rows)}`);
  await ds.destroy();
};
console.log('\n  running each migration on rows ("123", "abc"):');
await run('generated (DROP then ADD NOT NULL)', ['ALTER TABLE "ep13_stock" DROP COLUMN "quantity"', 'ALTER TABLE "ep13_stock" ADD "quantity" integer NOT NULL']);
// The same type change on a NULLABLE column: generate its plan from the entities, then run
// exactly what was generated.
{
  const pre = new DataSource({ ...base, entities: [StockNullableV1] });
  await pre.initialize();
  await pre.query('DROP TABLE IF EXISTS ep13_stock');
  await pre.synchronize();
  await pre.destroy();
  const gen = new DataSource({ ...base, entities: [StockNullableRetyped] });
  await gen.initialize();
  const plan = (await gen.driver.createSchemaBuilder().log()).upQueries.map((q) => q.query);
  await gen.destroy();
  console.log('  nullable column, varchar -> integer, generated:');
  for (const q of plan) console.log(`    ${q}`);
  const ds = new DataSource({ ...base, entities: [] });
  await ds.initialize();
  await ds.query('DROP TABLE IF EXISTS ep13_stock');
  await ds.query('CREATE TABLE ep13_stock (id serial PRIMARY KEY, quantity varchar)');
  await ds.query("INSERT INTO ep13_stock (quantity) VALUES ('123'), ('abc')");
  for (const q of plan) await ds.query(q);
  console.log(`  generated, nullable column: ran`);
  console.log(`    rows after: ${JSON.stringify(await ds.query('SELECT * FROM ep13_stock ORDER BY id'))}`);
  await ds.destroy();
}
await run('hand written (ALTER ... TYPE integer USING quantity::integer)', ['ALTER TABLE "ep13_stock" ALTER COLUMN "quantity" TYPE integer USING "quantity"::integer']);

const clean = new DataSource({ ...base, entities: [] });
await clean.initialize();
await clean.query('DROP TABLE IF EXISTS ep13_stock');
await clean.destroy();
