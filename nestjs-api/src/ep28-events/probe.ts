import 'reflect-metadata';
import { Injectable, LoggerService, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EventEmitter2, EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Client } from 'pg';

/**
 * EPISODE 29. Application events with @nestjs/event-emitter, one scenario per run, printing what
 * the publisher saw. Run as its own process so an unhandled rejection can do what it does.
 *
 *   node dist/ep28-events/probe.js <scenario> [databaseUrl]
 */
const [scenario, databaseUrl] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const started = Date.now();
const at = () => `${Date.now() - started} ms`;
let errorsLogged = 0;

const logger: LoggerService = {
  log: () => undefined,
  warn: () => undefined,
  error: () => void errorsLogged++,
  debug: () => undefined,
  verbose: () => undefined,
};

@Injectable()
class ReceiptListener {
  receipts: string[] = [];

  @OnEvent('payment.sync-fails')
  syncFails() {
    throw new Error('mail server busy');
  }

  @OnEvent('payment.async-fails')
  async asyncFails() {
    await sleep(10);
    throw new Error('mail server busy');
  }

  @OnEvent('payment.unsuppressed', { suppressErrors: false })
  async unsuppressed() {
    await sleep(10);
    throw new Error('mail server busy');
  }

  @OnEvent('payment.slow')
  async slow(id: string) {
    await sleep(300);
    console.log(`  Nest, B, the listener finished at ${at()} for ${id}`);
  }

  @OnEvent('payment.created')
  receipt(id: string) {
    this.receipts.push(id);
  }
}

@Module({ imports: [EventEmitterModule.forRoot()], providers: [ReceiptListener] })
class EventsModule {}

void (async () => {
  const app = await NestFactory.createApplicationContext(EventsModule, { logger });
  const events = app.get(EventEmitter2);
  const listener = app.get(ReceiptListener);

  if (scenario === 'throws') {
    for (const [name, label] of [['payment.sync-fails', 'a listener that throws'], ['payment.async-fails', 'an async listener that throws']]) {
      errorsLogged = 0;
      let threw = 'no';
      try {
        events.emit(name, 'pay_1');
      } catch {
        threw = 'yes';
      }
      await sleep(100);
      console.log(`  Nest, A, @OnEvent defaults, ${label}: emit() threw ${threw}, errors logged ${errorsLogged}`);
    }
  }

  if (scenario === 'unsuppressed') {
    process.on('exit', (code) => console.log(`  Nest, A, @OnEvent with suppressErrors false, an async listener that throws: the process exited with code ${code} at ${at()}`));
    events.emit('payment.unsuppressed', 'pay_1');
    console.log(`  Nest, A, @OnEvent with suppressErrors false: emit() returned at ${at()}`);
    await sleep(1000);
    console.log(`  Nest, A, @OnEvent with suppressErrors false: still running at ${at()}`);
  }

  if (scenario === 'waits') {
    events.emit('payment.slow', 'emit');
    console.log(`  Nest, B, emit() returned at ${at()}`);
    await sleep(400);
    const t = Date.now();
    await events.emitAsync('payment.slow', 'emitAsync');
    console.log(`  Nest, B, emitAsync() resolved after ${Date.now() - t} ms`);
  }

  if (scenario === 'transaction') {
    const db = new Client({ connectionString: databaseUrl });
    await db.connect();
    await db.query('CREATE TABLE IF NOT EXISTS ep29_payments (id TEXT PRIMARY KEY)');
    await db.query('BEGIN');
    await db.query("INSERT INTO ep29_payments (id) VALUES ('pay_rolled_back')");
    events.emit('payment.created', 'pay_rolled_back');
    await db.query('ROLLBACK');
    const rows = (await db.query("SELECT count(*) FROM ep29_payments WHERE id = 'pay_rolled_back'")).rows[0].count;
    console.log(`  Nest, C, emit inside a transaction that rolled back: payments in the database ${rows}, receipts sent ${listener.receipts.length}`);
    listener.receipts = [];
    let committed = false;
    await db.query('BEGIN');
    try {
      await db.query("INSERT INTO ep29_payments (id) VALUES ('pay_rolled_back_again')");
      throw new Error('payment declined');
    } catch {
      await db.query('ROLLBACK');
    }
    if (committed) events.emit('payment.created', 'pay_rolled_back_again');
    await db.query('BEGIN');
    await db.query("INSERT INTO ep29_payments (id) VALUES ('pay_committed')");
    await db.query('COMMIT');
    committed = true;
    if (committed) events.emit('payment.created', 'pay_committed');
    console.log(`  Nest, C, emit only after COMMIT: rolled back, receipts sent ${listener.receipts.filter((r) => r === 'pay_rolled_back_again').length}; committed, receipts sent ${listener.receipts.filter((r) => r === 'pay_committed').length}`);
    await db.end();
  }

  await app.close();
})();
