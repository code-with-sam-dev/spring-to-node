import 'reflect-metadata';
import { Controller, Get, Headers, Module, Sse, type MessageEvent } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { interval, map, Observable, tap, finalize } from 'rxjs';

/**
 * EPISODE 31. A payment status stream with @Sse, one event a second, run as its own process.
 *
 *   node dist/ep30-sse/main.js <port> [resume] [compression]
 */
const flags = new Set(process.argv.slice(3));
const stats = { open: 0, produced: 0, lastEventIdSeen: 'none' };

@Controller('sse')
class PaymentsStream {
  @Sse('payments')
  payments(@Headers('last-event-id') lastEventId?: string): Observable<MessageEvent> {
    if (lastEventId) stats.lastEventIdSeen = lastEventId;
    const start = flags.has('resume') && lastEventId ? Number(lastEventId) + 1 : 1;
    stats.open++;
    return interval(1000).pipe(
      map((n) => ({ id: String(start + n), data: `payment ${start + n}` })),
      tap(() => stats.produced++),
      finalize(() => stats.open--),
    );
  }

  @Get('stats')
  stats() {
    return stats;
  }
}

@Module({ controllers: [PaymentsStream] })
class SseModule {}

void (async () => {
  const app = await NestFactory.create(SseModule, { logger: false });
  if (flags.has('compression')) app.use(compression());
  await app.listen(Number(process.argv[2]));
  console.log('READY');
})();
