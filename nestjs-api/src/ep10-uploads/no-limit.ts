import 'reflect-metadata';
import {
  Controller, Get, Module, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * WHERE DOES EACH STACK DRAW THE LINE WHEN NOBODY DREW ONE?
 *
 * Spring, measured with MultipartFile and nothing configured:
 *
 *     512 KB -> 200
 *       2 MB -> 413 Payload Too Large
 *
 * spring.servlet.multipart.max-file-size defaults to 1MB, so a Spring developer
 * has met this limit whether they wanted to or not. Most have had to RAISE it,
 * which means they know it exists.
 *
 * This measures the same two uploads against the same shaped endpoint here,
 * plus one that is much larger, and it also reports what the upload did to the
 * SERVER's heap. That second number is the one that matters, because
 * FileInterceptor with no options stores the file in memory, and there is only
 * one process.
 */
const PORT = 3997;

const mb = (n: number) => +(n / 1048576).toFixed(1);

/**
 * heapUsed IS THE WRONG COUNTER AND THE FIRST VERSION OF THIS DEMO USED IT.
 *
 * A Node Buffer is allocated OUTSIDE the V8 heap, so a 50 MB upload made
 * heapUsed go DOWN, from 15.8 to 15.7, purely because a garbage collection
 * happened in between. Reported on screen that would have been a false claim
 * with a real number attached to it, which is the worst kind.
 *
 * arrayBuffers is where a Buffer actually counts, and rss is what the operating
 * system thinks the process is using. Both are reported, because rss is the
 * number that decides whether a container gets killed.
 */
const mem = () => {
  const m = process.memoryUsage();
  return { heapUsedMb: mb(m.heapUsed), arrayBuffersMb: mb(m.arrayBuffers), rssMb: mb(m.rss) };
};

@Controller()
class UploadController {
  @Get('heap')
  heap() {
    return mem();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: { originalname: string; size: number; buffer?: Buffer }) {
    return {
      name: file?.originalname,
      bytes: file?.size,
      // The tell. With the default storage there IS a buffer, which means the
      // whole upload is resident in this process.
      inMemory: Buffer.isBuffer(file?.buffer),
      ...mem(),
    };
  }
}

@Module({ controllers: [UploadController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  // FORKED, so the heap figures belong to the server alone. Measuring a server
  // from inside its own process measures the client's buffers too, which is
  // the mistake episode 5's blocking demo had to correct.
  const child = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, ROLE: 'server' } });
  await new Promise<void>((r) => child.once('message', () => r()));

  const post = async (bytes: number) => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)]), 'payload.bin');
    const res = await fetch(`http://localhost:${PORT}/upload`, { method: 'POST', body: form });
    return { status: res.status, body: await res.text() };
  };

  type Mem = { heapUsedMb: number; arrayBuffersMb: number; rssMb: number };
  const small = await post(512 * 1024);
  const twoMb = await post(2 * 1024 * 1024);
  child.kill();

  // A SECOND, FRESH SERVER FOR THE MEMORY FIGURE, and this matters. Buffers are
  // not released the instant a request ends, so running three uploads against
  // one process gives an accumulating number that cannot be attributed to any
  // single upload. The figure below is one upload into a process that has
  // served none.
  const solo = fork(fileURLToPath(import.meta.url), [], { env: { ...process.env, ROLE: 'server' } });
  await new Promise<void>((r) => solo.once('message', () => r()));
  const baseline = await (await fetch(`http://localhost:${PORT}/heap`)).json() as Mem;
  const fifty = await post(50 * 1024 * 1024);
  solo.kill();

  console.log('Spring, same endpoint shape, nothing configured:');
  console.log('  512 KB  -> 200');
  console.log('    2 MB  -> 413 Payload Too Large');
  console.log('\nNestJS, FileInterceptor, nothing configured:');
  console.log(`  512 KB  -> ${small.status}  ${small.body}`);
  console.log(`    2 MB  -> ${twoMb.status}  ${twoMb.body}`);
  console.log(`   50 MB  -> ${fifty.status}  ${fifty.body}`);
  console.log('\n--- a FRESH server, one 50 MB upload, nothing else ---');
  console.log('before:');
  console.log(`  heapUsed ${baseline.heapUsedMb} MB   arrayBuffers ${baseline.arrayBuffersMb} MB   rss ${baseline.rssMb} MB`);

  if (twoMb.status !== 201) {
    throw new Error(`CLAIM FAILED: 2 MB was not accepted, got ${twoMb.status}`);
  }
  if (fifty.status !== 201) {
    throw new Error(`CLAIM FAILED: 50 MB was not accepted, got ${fifty.status}`);
  }
  const parsed = JSON.parse(fifty.body) as Mem & { inMemory: boolean };
  if (!parsed.inMemory) {
    throw new Error('CLAIM FAILED: the default storage did not produce a buffer');
  }
  console.log('during the upload:');
  console.log(`  heapUsed ${parsed.heapUsedMb} MB   arrayBuffers ${parsed.arrayBuffersMb} MB   rss ${parsed.rssMb} MB`);

  const grew = parsed.arrayBuffersMb - baseline.arrayBuffersMb;
  if (grew < 40) {
    throw new Error(`CLAIM FAILED: arrayBuffers grew by only ${grew.toFixed(1)} MB for a 50 MB upload`);
  }
  console.log('\nasserted: the size Spring refused is accepted here, and so is one');
  console.log('          a hundred times larger, with no limit declared anywhere');
  console.log(`asserted: the file is resident in the process, arrayBuffers +${grew.toFixed(1)} MB`);
  console.log(`asserted: heapUsed moved ${(parsed.heapUsedMb - baseline.heapUsedMb).toFixed(1)} MB, so the counter most`);
  console.log('          people watch would not have shown this at all');
}
