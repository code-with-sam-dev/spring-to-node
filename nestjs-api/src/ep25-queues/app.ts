import 'reflect-metadata';
import { BullModule, InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Controller, Inject, Injectable, Module, Post, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * EPISODE 26. Receipts sent in the background, three ways: a promise nobody awaits, a BullMQ queue
 * with its defaults, and a BullMQ queue with retries. Every finished piece of work is recorded in
 * Redis, so the count survives the process that did it.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const RECORDS = Symbol('records');

@Processor('receipts', { concurrency: Number(process.env.RECEIPTS_CONCURRENCY ?? 1) })
export class ReceiptsProcessor extends WorkerHost {
  constructor(@Inject(RECORDS) private readonly records: Redis) {
    super();
  }

  async process(job: Job<{ id: string; ms: number; failFirst?: boolean }>) {
    await this.records.rpush('attempts', `${job.data.id}:${job.attemptsMade + 1}`);
    if (job.data.failFirst && job.attemptsMade === 0) throw new Error('mail server busy');
    await sleep(job.data.ms);
    await this.records.rpush('sent', job.data.id);
  }
}

@Processor('charges')
export class ChargesProcessor extends WorkerHost {
  constructor(@Inject(RECORDS) private readonly records: Redis) {
    super();
  }

  async process(job: Job<{ id: string }>) {
    await this.records.rpush('charged', job.data.id);
    await sleep(3000);
  }
}

@Injectable()
class Mailer {
  constructor(@Inject(RECORDS) private readonly records: Redis) {}

  async send(id: string, ms: number) {
    await sleep(ms);
    await this.records.rpush('sent', id);
  }
}

@Controller()
class ReceiptsController {
  constructor(
    @InjectQueue('receipts') private readonly receipts: Queue,
    @InjectQueue('charges') private readonly charges: Queue,
    private readonly mailer: Mailer,
  ) {}

  @Post('receipts')
  async enqueue(@Query('mode') mode: string, @Query('count') count = '5', @Query('ms') ms = '2000') {
    for (let i = 1; i <= Number(count); i++) {
      if (mode === 'promise') void this.mailer.send(`r${i}`, Number(ms));
      else await this.receipts.add('receipt', { id: `r${i}`, ms: Number(ms) });
    }
    return { accepted: Number(count) };
  }

  @Post('receipts/flaky')
  async flaky(@Query('retries') retries: string) {
    const options = retries ? { attempts: 3, backoff: { type: 'exponential', delay: 200 } } : {};
    await this.receipts.add('receipt', { id: 'flaky', ms: 10, failFirst: true }, options);
    return { accepted: 1 };
  }

  @Post('charges')
  async charge() {
    await this.charges.add('charge', { id: 'pay_1' });
    return { accepted: 1 };
  }
}

export async function startApp(opts: { redisUrl: string; port?: number }) {
  const { hostname, port } = new URL(opts.redisUrl);
  const records = new Redis(opts.redisUrl);

  @Module({
    imports: [
      BullModule.forRoot({ connection: { host: hostname, port: Number(port) } }),
      BullModule.registerQueue({ name: 'receipts' }, { name: 'charges' }),
    ],
    controllers: [ReceiptsController],
    providers: [ReceiptsProcessor, ChargesProcessor, Mailer, { provide: RECORDS, useValue: records }],
  })
  class QueuesModule {}

  const app = await NestFactory.create(QueuesModule, { logger: false });
  await app.listen(opts.port ?? 0, '127.0.0.1');
  const address = app.getHttpServer().address() as { port: number };
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await app.close();
      records.disconnect();
    },
  };
}
