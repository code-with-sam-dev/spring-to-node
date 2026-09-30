import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, QueryRunner, Repository } from 'typeorm';

/**
 * EPISODE 18 PROBES, C and D: two ways to give each test a clean table.
 *   C  TRUNCATE in beforeEach
 *   D  a transaction per test, rolled back in afterEach: once writing through the injected
 *      repository, once through the query runner's manager
 */
@Entity('ep17_notes_clean')
class CleanNote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;
}

let dataSource: DataSource;
let notes: Repository<CleanNote>;
let close: () => Promise<void>;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres', host: 'localhost', port: 5434, username: 'payments', password: 'payments',
        database: 'payments_node', entities: [CleanNote], synchronize: true,
      }),
      TypeOrmModule.forFeature([CleanNote]),
    ],
  }).compile();
  dataSource = moduleRef.get(DataSource);
  notes = moduleRef.get(getRepositoryToken(CleanNote));
  close = () => moduleRef.close();
  await notes.clear();
});

afterAll(async () => close());

describe('C: TRUNCATE in beforeEach', () => {
  beforeEach(async () => {
    await dataSource.query('TRUNCATE ep17_notes_clean RESTART IDENTITY');
  });
  it('first test inserts one', async () => {
    await notes.save({ text: 'first' });
    console.log(`  Nest, C, truncate, first test sees rows: ${await notes.count()}`);
  });
  it('second test inserts one', async () => {
    await notes.save({ text: 'second' });
    console.log(`  Nest, C, truncate, second test sees rows: ${await notes.count()}`);
  });
});

describe('D: a transaction per test, rolled back', () => {
  let runner: QueryRunner;
  beforeAll(async () => {
    await dataSource.query('TRUNCATE ep17_notes_clean RESTART IDENTITY');
  });
  beforeEach(async () => {
    runner = dataSource.createQueryRunner();
    await runner.startTransaction();
  });
  afterEach(async () => {
    await runner.rollbackTransaction();
    await runner.release();
  });
  it('writes through the injected repository', async () => {
    await notes.save({ text: 'injected' });
  });
  it('writes through the runner manager', async () => {
    await runner.manager.save(CleanNote, { text: 'runner' });
  });
  it('reports what the rollbacks left', async () => {
    const left = (await notes.find()).map((n) => n.text);
    console.log(`  Nest, D, rows left after both rolled-back tests: ${left.length} ${JSON.stringify(left)}`);
  });
});
