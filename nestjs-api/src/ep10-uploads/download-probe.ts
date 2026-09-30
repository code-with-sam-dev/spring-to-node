import 'reflect-metadata';
import { Controller, Get, Module, StreamableFile } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createReadStream, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * THE QUESTION download.ts COULD NOT ANSWER.
 *
 * download.ts reads arrayBuffers once when the response ends and again 1.5 s
 * later, and treats "unchanged" as "held". It is not. An idle process has no
 * allocation pressure, so the collector has no reason to run, and a buffer that
 * is already garbage reads exactly like one that is still in use.
 *
 * This probe measures the two things that ARE meaningful:
 *   PEAK   sampled every 2 ms inside the server while the response is sent
 *   AFTER GC   arrayBuffers after a forced full collection (--expose-gc)
 * at several file sizes, so a figure that scales with the file can be told
 * apart from a fixed cost.
 *
 *   SIZES=10,50,200 CONC=1 node dist/ep10-uploads/download-probe.js
 */
const PORT = 3997;
const mb = (n: number) => +(n / 1048576).toFixed(1);

const dir = process.env.EP10_DIR ?? mkdtempSync(join(tmpdir(), 'ep10p-'));
const file = join(dir, 'report.bin');

let peak = 0;
let timer: NodeJS.Timeout | undefined;
const startSampling = () => {
  peak = process.memoryUsage().arrayBuffers;
  timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().arrayBuffers); }, 2);
};

@Controller()
class ProbeController {
  @Get('baseline')
  baseline() {
    (globalThis as { gc?: () => void }).gc?.();
    const base = process.memoryUsage().arrayBuffers;
    startSampling();
    return { base };
  }

  @Get('result')
  result() {
    clearInterval(timer);
    const atEnd = process.memoryUsage().arrayBuffers;
    (globalThis as { gc?: () => void }).gc?.();
    return { peak, atEnd, afterGc: process.memoryUsage().arrayBuffers };
  }

  @Get('buffered')
  async buffered() {
    return new StreamableFile(await readFile(file));
  }

  @Get('streamed')
  streamed() {
    return new StreamableFile(createReadStream(file));
  }
}

@Module({ controllers: [ProbeController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  if (typeof (globalThis as { gc?: unknown }).gc !== 'function') {
    throw new Error('run the server with --expose-gc, or AFTER GC means nothing');
  }
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const sizes = (process.env.SIZES ?? '10,50,200').split(',').map(Number);
  const url = (p: string) => `http://localhost:${PORT}/${p}`;

  const measure = async (route: string, sizeMb: number) => {
    writeFileSync(file, Buffer.alloc(sizeMb * 1048576, 7));
    const child = fork(fileURLToPath(import.meta.url), [],
      { env: { ...process.env, ROLE: 'server', EP10_DIR: dir }, execArgv: ['--expose-gc'] });
    await new Promise<void>((r) => child.once('message', () => r()));
    const { base } = await (await fetch(url('baseline'))).json() as { base: number };
    // CONC simultaneous downloads, to tell a per-download cost from a per-process one.
    const conc = Number(process.env.CONC ?? 1);
    const all = await Promise.all(Array.from({ length: conc }, async () =>
      (await (await fetch(url(route))).arrayBuffer()).byteLength));
    const bytes = all.every((b) => b === all[0]) ? all[0] : -1;
    const r = await (await fetch(url('result'))).json() as { peak: number; atEnd: number; afterGc: number };
    child.kill();
    if (bytes !== sizeMb * 1048576) throw new Error(`CLAIM FAILED: ${route} delivered ${bytes} bytes`);
    return { peak: mb(r.peak - base), atEnd: mb(r.atEnd - base), afterGc: mb(r.afterGc - base) };
  };

  console.log(`arrayBuffers above a post-GC baseline, one fresh server per row, ${process.env.CONC ?? 1} concurrent download(s)\n`);
  console.log('  size     route      peak      at end    after gc');
  for (const size of sizes) {
    for (const route of ['buffered', 'streamed']) {
      const m = await measure(route, size);
      console.log(`  ${String(size).padStart(4)} MB  ${route.padEnd(9)} ${String(m.peak).padStart(6)} MB  `
        + `${String(m.atEnd).padStart(6)} MB  ${String(m.afterGc).padStart(6)} MB`);
    }
  }
}
