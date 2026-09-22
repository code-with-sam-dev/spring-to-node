import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * One thread. Block it and every other request waits.
 *
 * THIS IS THE EPISODE'S ONE MEASUREMENT. A Spring developer's instinct is not
 * wrong so much as inapplicable: in Spring a slow handler occupies ITS thread
 * and the others carry on, because each request has one. Here there is a single
 * thread running your JavaScript, so a slow handler occupies EVERYBODY's.
 *
 * WHY THE SERVER RUNS IN A CHILD PROCESS, and this is the trap that makes the
 * obvious version of this demo LIE. The first draft ran the client and the
 * server in one process. It reported that a ping during the blocking handler
 * took 2 ms, which looks like proof that nothing was blocked. It was not: the
 * client's own `await setTimeout(100)` could not fire either, because it was
 * queued behind the same busy loop. By the time the client's code resumed, the
 * block was already over and it timed an idle server.
 *
 * The measurement was measuring itself. So the server is forked, the client
 * stays in the parent, and the two event loops are genuinely independent.
 *
 * WHY A BUSY LOOP AND NOT A TIMER. The busy loop is the honest model of what
 * actually happens in production: a large JSON parse, a synchronous crypto
 * call, an unfortunate regular expression, a loop over ten thousand rows. A
 * timer is precisely the thing that does NOT block, and it is the subject of
 * the companion demo.
 */
const BLOCK_MS = 1500;
const PORT = 3994;

@Controller()
class ProbeController {
  @Get('slow')
  slow() {
    // Deliberately synchronous. Nothing yields, so the event loop cannot run
    // anything else, including the ping handler below.
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

  // The control: nothing else is happening, so this is what a ping costs.
  const idle = await time('ping');

  // Now start the blocking request without awaiting it, give it a moment to
  // reach the busy loop, and time a ping that arrives while the thread is gone.
  const slow = fetch(`http://localhost:${PORT}/slow`);
  await new Promise((r) => setTimeout(r, 100));
  const during = await time('ping');
  await slow;
  child.kill();

  console.log(`GET /ping with the server idle      ${idle} ms`);
  console.log(`GET /ping while /slow is running    ${during} ms`);
  console.log(`\n/slow held the only thread for ${BLOCK_MS} ms.`);

  if (idle > 250) {
    throw new Error(`CLAIM FAILED: the idle ping took ${idle} ms, so the baseline is not clean`);
  }
  if (during < 500) {
    throw new Error(
      `CLAIM FAILED: the ping during /slow took only ${during} ms. Either something ` +
        `yielded, or the client is sharing an event loop with the server again.`,
    );
  }
  console.log('asserted: a synchronous handler delays every other request');
}
