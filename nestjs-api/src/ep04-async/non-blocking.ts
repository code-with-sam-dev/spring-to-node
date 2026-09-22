import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The same 1500 milliseconds, spent the other way, and nobody waits.
 *
 * This is the companion to blocking.ts and the pair is the whole beat. The
 * handler still takes 1500 ms to answer. The difference is that it AWAITS,
 * which hands the single thread back, so every other request is served while
 * it is pending.
 *
 * THE SENTENCE THIS EARNS, and it is the one to keep: a promise is not a
 * thread. It is a way of saying later. Nothing here runs in parallel. The
 * thread simply goes and does something useful instead of standing still.
 *
 * Server forked for the same reason as blocking.ts: a client sharing the
 * server's event loop cannot time it honestly.
 */
const WAIT_MS = 1500;
const PORT = 3993;

@Controller()
class ProbeController {
  @Get('slow')
  async slow() {
    // The ONLY difference from blocking.ts. This yields.
    await new Promise((r) => setTimeout(r, WAIT_MS));
    return { waitedMs: WAIT_MS };
  }

  @Get('ping')
  ping() {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, ROLE: 'server' } });
  await new Promise<void>((resolve) => child.once('message', () => resolve()));

  const time = async (path: string) => {
    const t0 = Date.now();
    await fetch(`http://localhost:${PORT}/${path}`);
    return Date.now() - t0;
  };

  const idle = await time('ping');

  const slow = fetch(`http://localhost:${PORT}/slow`);
  await new Promise((r) => setTimeout(r, 100));
  const during = await time('ping');
  const slowMs = await (async () => {
    const t0 = Date.now();
    await slow;
    return Date.now() - t0;
  })();
  child.kill();

  console.log(`GET /ping with the server idle       ${idle} ms`);
  console.log(`GET /ping while /slow is pending     ${during} ms`);
  console.log(`\n/slow still took its full ${WAIT_MS} ms to answer.`);

  if (during > 250) {
    throw new Error(
      `CLAIM FAILED: the ping took ${during} ms while an AWAITING handler was ` +
        `pending. Awaiting should have handed the thread back.`,
    );
  }
  console.log('asserted: an awaiting handler blocks nobody. A promise is not a thread.');
}
