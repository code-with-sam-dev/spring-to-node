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
const clean = new DataSource({ ...base, entities: [] });
await clean.initialize();
await clean.query('DROP TABLE IF EXISTS ep13_stock');
await clean.destroy();
