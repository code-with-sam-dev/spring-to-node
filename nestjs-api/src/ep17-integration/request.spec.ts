import 'reflect-metadata';
import { Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';

/**
 * EPISODE 18 PROBE, F: a test transaction around a supertest request. The request is served by
 * the app's own connection from the pool, not by the test's query runner.
 */
@Entity('ep17_notes_request')
class RequestNote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;
}

@Controller('ep17/notes')
class NoteController {
  constructor(@InjectRepository(RequestNote) private readonly notes: Repository<RequestNote>) {}

  @Post()
  async create() {
    await this.notes.save({ text: 'via request' });
    return this.notes.count();
  }
}

describe('F: a rolled-back test transaction around a supertest request', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres', host: 'localhost', port: 5434, username: 'payments', password: 'payments',
          database: 'payments_node', entities: [RequestNote], synchronize: true,
        }),
        TypeOrmModule.forFeature([RequestNote]),
      ],
      controllers: [NoteController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = moduleRef.get(DataSource);
    await dataSource.query('TRUNCATE ep17_notes_request RESTART IDENTITY');
  });

  afterAll(async () => app.close());

  it('posts inside a transaction that is rolled back', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    await request(app.getHttpServer()).post('/ep17/notes').expect(201);
    await runner.rollbackTransaction();
    await runner.release();
    console.log(`  Nest, F, rows after the rolled-back supertest request: ${await dataSource.getRepository(RequestNote).count()}`);
  });
});
