import 'reflect-metadata';
import { ConsoleLogger, Controller, Injectable, Logger, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoggerModule, Logger as PinoNestLogger, PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';

/**
 * EPISODE 36. One request, four places that log, run as its own process.
 *
 *   node dist/ep35-logging/main.js <port> <default | json | pino>
 *
 * default  Nest's ConsoleLogger as it ships
 * json     ConsoleLogger({ json: true })
 * pino     nestjs-pino, the request id taken from X-Request-Id
 */
const [port, mode] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
class Payments {
  private readonly logger = new Logger(Payments.name);
  constructor(@InjectPinoLogger(Payments.name) private readonly pino: PinoLogger) {}

  log(message: string) {
    if (mode === 'pino') this.pino.info(message);
    else this.logger.log(message);
  }

  charge() {
    this.log('service: card charged');
  }
}

@Controller()
class PaymentsController {
  constructor(private readonly payments: Payments) {}

  @Post('pay')
  async pay() {
    this.payments.log('controller: payment received');
    this.payments.charge();
    await sleep(10);
    this.payments.log('after await: receipt queued');
    setTimeout(() => this.payments.log('setTimeout: customer notified'), 10);
    await sleep(30);
    return 'ok';
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: IncomingMessage) => String(req.headers['x-request-id'] ?? ''),
        autoLogging: false,
        quietReqLogger: true,
      },
    }),
  ],
  controllers: [PaymentsController],
  providers: [Payments],
})
class LoggingModule {}

void (async () => {
  const app = await NestFactory.create(LoggingModule, {
    bufferLogs: true,
    logger: mode === 'json' ? new ConsoleLogger({ json: true }) : new ConsoleLogger(),
  });
  if (mode === 'pino') app.useLogger(app.get(PinoNestLogger));
  await app.listen(Number(port));
  console.error('READY');
})();
