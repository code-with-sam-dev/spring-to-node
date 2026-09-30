import 'reflect-metadata';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EPISODE 13 EVIDENCE: what a JPA developer assumes about a TypeORM entity, measured.
 *
 *   A  findOneBy({ id: undefined })          what comes back
 *   B  load, mutate, commit, no save()       does the row change (JPA: dirty checking)
 *   C  rename a property under synchronize   what happens to the column's data
 *   D  a bigint column                        what type the value is in JavaScript
 *   E  repository.save() on a new entity      which SQL statements it sends
 *
 * Every table is ep12_*, created and dropped here, in the payments_node database.
 */
const base = {
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5434),
  username: 'payments',
  password: 'payments',
  database: 'payments_node',
};

@Entity('ep12_accounts')
class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  owner!: string;

  @Column({ type: 'bigint' })
  balanceInMinorUnits!: string;
}

/* C: the same table, before and after a property rename. */
@Entity('ep12_customers')
class CustomerV1 {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  fullName!: string;
}

@Entity('ep12_customers')
class CustomerV2 {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  displayName!: string;
}

const statements: string[] = [];
const logger = {
  logQuery: (q: string) => { statements.push(q.replace(/\s+/g, ' ').trim()); },
  logQueryError: () => {}, logQuerySlow: () => {}, logSchemaBuild: () => {}, logMigration: () => {}, log: () => {},
};

const ds = new DataSource({ ...base, entities: [Account], synchronize: true, logger, logging: true });
await ds.initialize();
const repo = ds.getRepository(Account);
await repo.clear();
await repo.save([
  { owner: 'alice', balanceInMinorUnits: '5000' },
  { owner: 'bob', balanceInMinorUnits: '9007199254740993' },
]);

/* A */
const ids = [undefined, null] as const;
console.log('=== A: findOneBy with a missing id ===');
for (const id of ids) {
  try {
    const found = await repo.findOneBy({ id: id as unknown as number });
    console.log(`  findOneBy({ id: ${id} })  ->  ${found ? `row id=${found.id} owner=${found.owner}` : 'null'}`);
  } catch (e) {
    console.log(`  findOneBy({ id: ${id} })  ->  threw ${(e as Error).constructor.name}: ${(e as Error).message}`);
  }
}

/* B */
console.log('\n=== B: load, change a field, commit, never call save() ===');
await ds.transaction(async (m) => {
  const a = await m.findOneByOrFail(Account, { owner: 'alice' });
  a.owner = 'alice-renamed';
});
const after = await repo.findOneBy({ owner: 'alice-renamed' });
console.log(`  row with owner 'alice-renamed' after commit: ${after ? 'found' : 'not found'}`);

/* D */
console.log('\n=== D: a bigint column, read back ===');
const bob = await repo.findOneByOrFail({ owner: 'bob' });
console.log(`  balanceInMinorUnits = ${JSON.stringify(bob.balanceInMinorUnits)}  typeof ${typeof bob.balanceInMinorUnits}`);
console.log(`  Number(...) = ${Number(bob.balanceInMinorUnits)}   (exact value 9007199254740993)`);

/* E */
console.log('\n=== E: repository.save() on a new entity, the SQL sent ===');
statements.length = 0;
await repo.save({ owner: 'carol', balanceInMinorUnits: '1' });
for (const s of statements) console.log(`  ${s.slice(0, 140)}`);
statements.length = 0;
const carol = await repo.findOneByOrFail({ owner: 'carol' });
statements.length = 0;
carol.owner = 'carol-2';
await repo.save(carol);
console.log('  ... and save() on a loaded, changed entity:');
for (const s of statements) console.log(`  ${s.slice(0, 140)}`);
await repo.query('DROP TABLE IF EXISTS ep12_accounts');
await ds.destroy();

/* C */
console.log('\n=== C: rename a property, synchronize: true ===');
const v1 = new DataSource({ ...base, entities: [CustomerV1], synchronize: true });
await v1.initialize();
await v1.query('DROP TABLE IF EXISTS ep12_customers');
await v1.synchronize();
await v1.getRepository(CustomerV1).save([{ fullName: 'Ada Lovelace' }, { fullName: 'Grace Hopper' }]);
console.log(`  before: ${JSON.stringify(await v1.query('SELECT * FROM ep12_customers ORDER BY id'))}`);
await v1.destroy();
const v2 = new DataSource({ ...base, entities: [CustomerV2], synchronize: false });
await v2.initialize();
const plan = await v2.driver.createSchemaBuilder().log();
console.log('  what synchronize would run:');
for (const q of plan.upQueries) console.log(`    ${q.query}`);
await v2.synchronize();
console.log(`  after:  ${JSON.stringify(await v2.query('SELECT * FROM ep12_customers ORDER BY id'))}`);
await v2.query('DROP TABLE IF EXISTS ep12_customers');
await v2.destroy();
