import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pbkdf2, pbkdf2Sync } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * The same hash, two ways. pbkdf2Sync runs on the event-loop thread; pbkdf2
 * runs on libuv's worker pool and hands the result back later. Node's docs list
 * crypto.pbkdf2() among the Worker Pool's users. The iteration count is chosen
 * only to make the hash take long enough to see.
 */
const PORT = 3991;
const ITERATIONS = 6_000_000;
const pbkdf2Async = promisify(pbkdf2);

@Controller()
class ProbeController {
  @Get('hash-sync')
  hashSync() {
    return { key: pbkdf2Sync('secret', 'salt', ITERATIONS, 64, 'sha512').toString('hex').slice(0, 8) };
  }

  @Get('hash-async')
  async hashAsync() {
    const key = await pbkdf2Async('secret', 'salt', ITERATIONS, 64, 'sha512');
    return { key: key.toString('hex').slice(0, 8) };
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
    const res = await fetch(`http://localhost:${PORT}/${path}`);
    if (res.status !== 200) throw new Error(`GET /${path} returned ${res.status}`);
    return Date.now() - t0;
  };
  const during = async (path: string) => {
    const t0 = Date.now();
    const work = time(path);
    await new Promise((r) => setTimeout(r, 50));
    const ping = await time('ping');
    await work;
    return { ping, hash: Date.now() - t0 };
  };

  await time('hash-sync'); // warm up
  const sync = await during('hash-sync');
  const async_ = await during('hash-async');
  child.kill();

  console.log(`pbkdf2Sync   hash ${sync.hash} ms   ping during it ${sync.ping} ms`);
  console.log(`pbkdf2       hash ${async_.hash} ms   ping during it ${async_.ping} ms`);

  if (sync.ping < sync.hash / 2) throw new Error(`CLAIM FAILED: pbkdf2Sync did not delay the ping (${sync.ping} ms)`);
  if (async_.ping > 100) throw new Error(`CLAIM FAILED: pbkdf2 delayed the ping (${async_.ping} ms)`);
  console.log('asserted: the sync hash holds the event loop, the async one runs on the worker pool');
}
