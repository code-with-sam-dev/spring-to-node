import 'reflect-metadata';
import {
  Controller, Get, Module, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { diskStorage } from 'multer';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * THE FIX, WITH A NUMBER ON IT.
 *
 * no-limit.ts measured a 50 MB upload costing 89 MB of resident memory in the
 * one process that serves everything, because FileInterceptor with no options
 * keeps the file in a Buffer and multer has no default size limit.
 *
 * Two options change both facts. This measures what they actually buy, because
 * a course that recommends a fix without measuring it is doing the same thing
 * it criticises.
 */
const PORT = 3999;

const mb = (n: number) => +(n / 1048576).toFixed(1);
const mem = () => {
  const m = process.memoryUsage();
  return { arrayBuffersMb: mb(m.arrayBuffers), rssMb: mb(m.rss) };
};

const uploadDir = process.env.EP10_UPLOADS ?? mkdtempSync(join(tmpdir(), 'ep10-up-'));

@Controller()
class BoundedController {
  @Get('mem')
  memory() {
    return mem();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    // Spring's equivalent of both lines is two properties in
    // application.properties, and one of them is already set for you.
    storage: diskStorage({ destination: uploadDir }),
    limits: { fileSize: 1024 * 1024 },
  }))
  upload(@UploadedFile() file: { size: number; buffer?: Buffer; path?: string }) {
    return {
      bytes: file?.size,
      inMemory: Buffer.isBuffer(file?.buffer),
      onDisk: typeof file?.path === 'string',
      ...mem(),
    };
  }
}

@Module({ controllers: [BoundedController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [],
    { env: { ...process.env, ROLE: 'server', EP10_UPLOADS: uploadDir } });
  await new Promise<void>((r) => child.once('message', () => r()));

  const post = async (bytes: number) => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)]), 'payload.bin');
    const res = await fetch(`http://localhost:${PORT}/upload`, { method: 'POST', body: form });
    return { status: res.status, body: await res.text() };
  };

  const before = await (await fetch(`http://localhost:${PORT}/mem`)).json() as ReturnType<typeof mem>;
  const small = await post(512 * 1024);
  const tooBig = await post(50 * 1024 * 1024);
  child.kill();

  console.log('with diskStorage and a one megabyte limit:\n');
  // Compact, so the frame can show exactly what was printed.
  const ok = JSON.parse(small.body) as { bytes: number; inMemory: boolean; onDisk: boolean; arrayBuffersMb: number };
  const refused = JSON.parse(tooBig.body) as { message: string; statusCode: number };
  console.log(`  512 KB  -> ${small.status}  bytes ${ok.bytes}  inMemory ${ok.inMemory}  onDisk ${ok.onDisk}  arrayBuffers ${ok.arrayBuffersMb} MB`);
  console.log(`   50 MB  -> ${tooBig.status}  ${refused.message}`);
  console.log(`\n  server before anything: arrayBuffers ${before.arrayBuffersMb} MB, rss ${before.rssMb} MB`);

  const parsed = JSON.parse(small.body) as {
    inMemory: boolean; onDisk: boolean; arrayBuffersMb: number; rssMb: number;
  };

  if (parsed.inMemory) {
    throw new Error('CLAIM FAILED: diskStorage still produced an in-memory buffer');
  }
  if (!parsed.onDisk) {
    throw new Error('CLAIM FAILED: the file did not reach the disk');
  }
  if (tooBig.status === 201) {
    throw new Error('CLAIM FAILED: the 50 MB upload was accepted despite the limit');
  }
  console.log('\nasserted: with diskStorage there is NO buffer, the handler gets a path');
  console.log(`asserted: the 50 MB upload is refused, ${tooBig.status}, where the default accepted it`);
  console.log(`asserted: the accepted upload left the process at arrayBuffers `
    + `${parsed.arrayBuffersMb} MB, rss ${parsed.rssMb} MB`);
}
