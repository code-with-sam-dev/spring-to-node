import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The failure that is not a 500. It is the whole process.
 *
 * A thrown exception inside a handler is a response: Nest catches it and the
 * application carries on, which thrown.ts measures. This is the other kind. A
 * promise that rejects with nobody awaiting it is not attached to any request,
 * so there is no handler to catch it and no response to turn it into.
 *
 * WHY A SPRING DEVELOPER HAS NO INSTINCT FOR THIS. In Spring an exception on a
 * request thread kills that thread. The other threads, and the JVM, do not
 * care. Here there is one process, so the blast radius is every in-flight
 * request, which is the same lesson as episode 5 arriving through errors
 * rather than through latency.
 *
 * Measured by forking a child, making it produce an unhandled rejection, and
 * reading the child's exit code from the parent. Asserting on an exit code
 * rather than on a log line, because a log line is a description and an exit
 * code is the fact.
 */
const PORT = 3991;

@Controller()
class BoomController {
  @Get('ok')
  ok() {
    return { ok: true };
  }

  @Get('detach')
  detach() {
    // Nobody awaits this. It is exactly the shape of a forgotten await on a
    // background job, a cache warm, or a fire and forget audit write.
    void Promise.reject(new Error('the detached promise nobody awaited'));
    return { started: true };
  }
}

@Module({ controllers: [BoomController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [], {
    env: { ...process.env, ROLE: 'server' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  await new Promise<void>((r) => child.once('message', () => r()));

  const exited = new Promise<{ code: number | null; signal: string | null }>((r) =>
    child.once('exit', (code, signal) => r({ code, signal })),
  );

  console.log(`before:  GET /ok -> ${await fetch(`http://localhost:${PORT}/ok`).then((r) => r.status)}`);
  await fetch(`http://localhost:${PORT}/detach`).then((r) => r.status);

  const outcome = await Promise.race([
    exited,
    new Promise<null>((r) => setTimeout(() => r(null), 3000)),
  ]);

  if (outcome === null) {
    console.log('after:   the process is still running');
    child.kill();
    console.log('\nasserted: this Node version did NOT terminate on an unhandled rejection');
  } else {
    console.log(`after:   the process EXITED, code ${outcome.code}, signal ${outcome.signal}`);
    console.log(`node     ${process.version}`);
    console.log('\nasserted: an unhandled rejection took down the whole server,');
    console.log('and every request it was serving went with it.');
    if (outcome.code === 0) {
      throw new Error('CLAIM FAILED: exited cleanly, which is not the failure being described');
    }
  }
}
