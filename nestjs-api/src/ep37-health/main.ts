import 'reflect-metadata';
import { Controller, Get, Injectable, Module, ServiceUnavailableException, type BeforeApplicationShutdown } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthCheck, HealthCheckService, TerminusModule } from '@nestjs/terminus';

/**
 * EPISODE 38. A slow payment, a fast one, and a Terminus readiness check, run as its own process.
 *
 *   node dist/ep37-health/main.js <port> <none | hooks | drain>
 *
 * none   Nest as created: no shutdown hooks
 * hooks  app.enableShutdownHooks()
 * drain  shutdown hooks, readiness reports 503 once shutdown starts, and Terminus waits before closing
 */
const [port, mode] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
class Readiness implements BeforeApplicationShutdown {
  shuttingDown = false;
  beforeApplicationShutdown() {
    this.shuttingDown = true;
  }
}

@Controller()
class PaymentsController {
  constructor(private readonly health: HealthCheckService, private readonly readiness: Readiness) {}

  @Get('slow')
  async slow() {
    await sleep(3000);
    return 'charged';
  }

  @Get('fast')
  fast() {
    return 'ok';
  }

  @Get('health/ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => {
        if (this.readiness.shuttingDown) throw new ServiceUnavailableException({ ready: { status: 'down' } });
        return { ready: { status: 'up' } };
      },
    ]);
  }
}

@Module({
  imports: [TerminusModule.forRoot(mode === 'drain' ? { gracefulShutdownTimeoutMs: 2000 } : {})],
  controllers: [PaymentsController],
  providers: [Readiness],
})
class HealthModule {}

void (async () => {
  const app = await NestFactory.create(HealthModule, { logger: false });
  if (mode !== 'none') app.enableShutdownHooks();
  await app.listen(Number(port));
  console.log('READY');
})();
