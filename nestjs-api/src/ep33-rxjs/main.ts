import 'reflect-metadata';
import { Controller, Get, Module, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { count, defer, filter, finalize, fromEvent, map, mergeMap, of, range, takeUntil, timer, type Observable } from 'rxjs';

/**
 * EPISODE 34. A stream returned from a handler, mergeMap's concurrency, and a client that leaves.
 *
 *   node dist/ep33-rxjs/main.js <port>
 */
let charged = 0;

@Controller()
class PaymentsController {
  @Get('payments/ids')
  ids(): Observable<number> {
    return of(1, 2, 3);
  }

  @Get('fanout')
  fanout(@Query('n') n: string, @Query('concurrency') concurrency?: string): Observable<{ done: number; peakInFlight: number }> {
    let inFlight = 0;
    let peak = 0;
    const work = () =>
      defer(() => {
        peak = Math.max(peak, ++inFlight);
        return timer(200);
      }).pipe(finalize(() => inFlight--));
    return range(1, Number(n)).pipe(
      mergeMap(work, concurrency ? Number(concurrency) : undefined),
      count(),
      map((done) => ({ done, peakInFlight: peak })),
    );
  }

  @Get('slow')
  slow(): Observable<string> {
    return timer(2000).pipe(
      map(() => {
        charged++;
        return 'charged';
      }),
    );
  }

  @Get('slow-cancellable')
  slowCancellable(@Res({ passthrough: true }) res: Response): Observable<string> {
    const clientLeft = fromEvent(res, 'close').pipe(filter(() => !res.writableFinished));
    return timer(2000).pipe(
      takeUntil(clientLeft),
      map(() => {
        charged++;
        return 'charged';
      }),
    );
  }

  @Get('stats')
  stats() {
    return { charged };
  }
}

@Module({ controllers: [PaymentsController] })
class RxjsModule {}

void (async () => {
  const app = await NestFactory.create(RxjsModule, { logger: false });
  await app.listen(Number(process.argv[2]));
  console.log('READY');
})();
