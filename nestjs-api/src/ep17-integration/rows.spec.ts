import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

/**
 * EPISODE 18 PROBE, A: two tests each insert one row into the real Postgres and count, through
 * a Nest testing module with TypeORM. The Spring half is Ep17DataJpaTest.
 */
@Entity('ep17_notes_node')
class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;
}

describe('probe: two tests, one real database', () => {
  let notes: Repository<Note>;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres', host: 'localhost', port: 5434, username: 'payments', password: 'payments',
          database: 'payments_node', entities: [Note], synchronize: true,
        }),
        TypeOrmModule.forFeature([Note]),
      ],
    }).compile();
    notes = moduleRef.get(getRepositoryToken(Note));
    close = () => moduleRef.close();
  });

  afterAll(async () => close());

  it('first test inserts one', async () => {
    await notes.save({ text: 'first' });
    console.log(`  Nest, A, first test sees rows: ${await notes.count()}`);
  });

  it('second test inserts one', async () => {
    await notes.save({ text: 'second' });
    console.log(`  Nest, A, second test sees rows: ${await notes.count()}`);
  });
});
