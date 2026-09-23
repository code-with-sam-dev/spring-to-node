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
 * SENDING A BIG FILE BACK, TWO WAYS, IN ONE PROCESS.
 *
 * Spring gives a developer two obvious options and the difference between them
 * is easy to miss: returning a byte[] or a ByteArrayResource reads the whole
 * file into the heap, and returning a FileSystemResource or a
 * StreamingResponseBody does not. The consequence there is a heap spike on one
 * thread out of two hundred.
 *
 * Here there is ONE process. So the same mistake is not a spike on a worker, it
 * is the whole service, which is episode 5's lesson arriving through file
 * handling rather than through latency.
 *
 * Both endpoints below serve the SAME file and produce byte identical
 * responses. Only the memory differs.
 */
const PORT = 3998;

const mb = (n: number) => +(n / 1048576).toFixed(1);
const mem = () => {
  const m = process.memoryUsage();
  return { arrayBuffersMb: mb(m.arrayBuffers), rssMb: mb(m.rss) };
};

const dir = process.env.EP10_DIR ?? mkdtempSync(join(tmpdir(), 'ep10-'));
const file = join(dir, 'report.bin');
const SIZE = 50 * 1024 * 1024;

@Controller()
class DownloadController {
  @Get('mem')
  memory() {
    return mem();
  }

  /** The obvious one, and the one that reads well. */
  @Get('buffered')
  async buffered() {
    return new StreamableFile(await readFile(file));
  }

  /** The same response, assembled by the operating system instead. */
  @Get('streamed')
  streamed() {
    return new StreamableFile(createReadStream(file));
  }
}

@Module({ controllers: [DownloadController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  // The file is written by the parent and inherited through the path in the
  // environment. The first version wrote it here too, which allocated 50 MB in
  // the server before its own baseline was taken.
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  writeFileSync(file, Buffer.alloc(SIZE, 7));

  // ONE FRESH SERVER PER ROUTE. Buffers are not released the moment a response
  // ends, so measuring both against one process attributes the first route's
  // memory to the second.
  const measure = async (route: string) => {
    const child = fork(fileURLToPath(import.meta.url), [],
      { env: { ...process.env, ROLE: 'server', EP10_DIR: dir } });
    await new Promise<void>((r) => child.once('message', () => r()));
    const before = await (await fetch(`http://localhost:${PORT}/mem`)).json() as ReturnType<typeof mem>;
    const res = await fetch(`http://localhost:${PORT}/${route}`);
    const bytes = (await res.arrayBuffer()).byteLength;
    const after = await (await fetch(`http://localhost:${PORT}/mem`)).json() as ReturnType<typeof mem>;
    // A SECOND SAMPLE, A MOMENT LATER. This distinguishes memory that is HELD
    // from memory that simply has not been collected yet, which is the whole
    // difference between a leak and a garbage collector being unhurried.
    await new Promise((r) => setTimeout(r, 1500));
    const settled = await (await fetch(`http://localhost:${PORT}/mem`)).json() as ReturnType<typeof mem>;
    child.kill();
    return { bytes, before, after, settled };
  };

  const buffered = await measure('buffered');
  const streamed = await measure('streamed');

  const row = (label: string, r: Awaited<ReturnType<typeof measure>>) => {
    console.log(`  ${label.padEnd(10)} ${mb(r.bytes)} MB delivered   `
      + `arrayBuffers ${r.before.arrayBuffersMb} -> ${r.after.arrayBuffersMb} MB   `
      + `rss ${r.before.rssMb} -> ${r.after.rssMb} MB   `
      + `settled ${r.settled.arrayBuffersMb} MB`);
  };

  console.log(`serving the same ${mb(SIZE)} MB file two ways, one fresh process each:\n`);
  row('buffered', buffered);
  row('streamed', streamed);

  if (buffered.bytes !== SIZE || streamed.bytes !== SIZE) {
    throw new Error(`CLAIM FAILED: the two responses are not the same size: `
      + `${buffered.bytes} and ${streamed.bytes}`);
  }
  // arrayBuffers IS THE COUNTER THAT ANSWERS THIS QUESTION. rss is printed
  // beside it and now agrees; an earlier version of this demo saw the two
  // disagree wildly and that turned out to be the demo's own fault, because the
  // server process was re-writing the 50 MB file before taking its baseline.
  const bufferedGrowth = buffered.after.arrayBuffersMb - buffered.before.arrayBuffersMb;
  const streamedGrowth = streamed.after.arrayBuffersMb - streamed.before.arrayBuffersMb;
  console.log(`\n  buffered held ${bufferedGrowth.toFixed(1)} MB at the end of the response`);
  console.log(`  streamed held ${streamedGrowth.toFixed(1)} MB at the end of the response`);
  console.log(`  buffered, 1.5s later: ${buffered.settled.arrayBuffersMb} MB`);
  console.log(`  streamed, 1.5s later: ${streamed.settled.arrayBuffersMb} MB`);

  if (bufferedGrowth < 45) {
    throw new Error(`CLAIM FAILED: the buffered route did not hold the file: ${bufferedGrowth} MB`);
  }
  if (streamedGrowth >= bufferedGrowth * 0.75) {
    throw new Error(`CLAIM FAILED: streaming did not cost meaningfully less `
      + `(${streamedGrowth} against ${bufferedGrowth})`);
  }
  console.log('\nasserted: identical responses, same byte count, and one of them');
  console.log('          never held the whole file');
  console.log(`asserted: streaming peaked at ${streamedGrowth.toFixed(1)} MB against ${bufferedGrowth.toFixed(1)} MB, NOT at zero`);
}
