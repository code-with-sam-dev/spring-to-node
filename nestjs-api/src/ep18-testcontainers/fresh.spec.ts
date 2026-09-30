import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { performance } from 'node:perf_hooks';
import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

/**
 * EPISODE 19 PROBE, A: the same two tests as episode 18, against a Postgres container started
 * for this file. Run twice: does the second run start clean? Does the second test still see the
 * first test's row?
 */
@Entity('ep18_notes')
class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;
}

describe('A: a container per run', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let notes: Repository<Note>;

  beforeAll(async () => {
    const t = performance.now();
    container = await new PostgreSqlContainer('postgres:18-alpine').start();
    console.log(`  Nest, A, container started in ${Math.round(performance.now() - t)} ms`);
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ type: 'postgres', url: container.getConnectionUri(), entities: [Note], synchronize: true }),
        TypeOrmModule.forFeature([Note]),
      ],
    }).compile();
    notes = moduleRef.get(getRepositoryToken(Note));
  }, 120_000);

  afterAll(async () => {
    await moduleRef.close();
    await container.stop();
  });

  it('first test inserts one', async () => {
    await notes.save({ text: 'first' });
    console.log(`  Nest, A, first test sees rows: ${await notes.count()}`);
  });

  it('second test inserts one', async () => {
    await notes.save({ text: 'second' });
    console.log(`  Nest, A, second test sees rows: ${await notes.count()}`);
  });
});
