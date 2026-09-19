import { Controller, Get, Query } from '@nestjs/common';
import { createHash } from 'node:crypto';

// A REAL CPU-BOUND TASK, not a sleep.
//
// A sleep would prove nothing: setTimeout yields the event loop and Node keeps
// serving. The whole point of this act is work that CANNOT yield, which is what
// a signature, a PDF render, an image resize or a big JSON parse actually is.
//
// In Spring this runs on the request's own thread and the other threads in the
// pool carry on. In Node there is one thread running your JavaScript, so while
// this loop runs NOTHING else in the process makes progress. Not the health
// check, not another payment, nothing.
@Controller('receipts')
export class ReceiptsController {
  // Blocking, deliberately. This is the "innocent" version a Spring developer
  // writes on their first week in Node.
  @Get('sign')
  sign(@Query('rounds') rounds = '400000'): { digest: string; rounds: number } {
    const n = Number(rounds);
    let digest = 'seed';
    for (let i = 0; i < n; i++) {
      digest = createHash('sha256').update(digest).digest('hex');
    }
    return { digest: digest.slice(0, 16), rounds: n };
  }

  // The same work, moved off the event loop. Kept here so the fix is one line
  // of diff on screen rather than a new file.
  @Get('sign-async')
  async signAsync(@Query('rounds') rounds = '400000'): Promise<{ digest: string; rounds: number }> {
    const n = Number(rounds);
    const { Worker } = await import('node:worker_threads');
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        `const {createHash}=require('node:crypto');
         const {workerData,parentPort}=require('node:worker_threads');
         let d='seed';
         for(let i=0;i<workerData.n;i++){d=createHash('sha256').update(d).digest('hex');}
         parentPort.postMessage({digest:d.slice(0,16),rounds:workerData.n});`,
        { eval: true, workerData: { n } },
      );
      worker.on('message', resolve);
      worker.on('error', reject);
    });
  }
}
