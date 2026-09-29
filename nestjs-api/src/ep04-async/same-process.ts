import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * The benchmark that measured itself. Kept on purpose, because it is the
 * episode's second beat.
 *
 * This is the FIRST version of blocking.ts: client and server in one process.
 * The handler is identical and it really does hold the thread for 1500 ms. Yet
 * the ping during it comes back in a few milliseconds, because the client's own
 * `setTimeout(100)` and its timer start are queued behind the same busy loop.
 * By the time the client resumes, the block is over, and it times an idle server.
 *
 * The assertion is the reverse of blocking.ts: it FAILS if the ping looks slow,
 * because the point is that this measurement cannot see the block.
 */
const BLOCK_MS = 1500;
const PORT = 3992;

@Controller()
class ProbeController {
  @Get('slow')
  slow() {
    const until = Date.now() + BLOCK_MS;
    while (Date.now() < until) {
      /* spin */
    }
    return { blockedMs: BLOCK_MS };
  }

  @Get('ping')
  ping() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(PORT);

const time = async (path: string) => {
  const t0 = Date.now();
  await fetch(`http://localhost:${PORT}/${path}`);
  return Date.now() - t0;
};

const wall = Date.now();
const slow = fetch(`http://localhost:${PORT}/slow`);
await new Promise((r) => setTimeout(r, 100));
const sentAt = Date.now() - wall;
const during = await time('ping');
await slow;
await app.close();

console.log(`the client meant to send the ping at   100 ms`);
console.log(`it actually got to send it at          ${sentAt} ms`);
console.log(`GET /ping, as this client timed it     ${during} ms`);

if (during > 250) {
  throw new Error(`CLAIM FAILED: expected the same-process client to miss the block, got ${during} ms`);
}
if (sentAt < 1000) {
  throw new Error(`CLAIM FAILED: expected the client's own timer to be delayed by the block, it fired at ${sentAt} ms`);
}
console.log('asserted: a client sharing the event loop cannot see the block. Its own timer waited too.');
