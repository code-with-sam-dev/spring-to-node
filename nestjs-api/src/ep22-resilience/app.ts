import 'reflect-metadata';
import { Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpClient, HttpClientModule } from '@nestjs/http-client';
import { CircuitBreaker, ResilienceModule, Retry } from '@nestjs/resilience';

/**
 * EPISODE 23. A payments app calling the payments API through @nestjs/http-client, with
 * @nestjs/resilience on its handlers. Built with the HTTP client's own retries on or off.
 */
export async function startApp(opts: { downstream: string; clientRetry: boolean }) {
  const warnings: string[] = [];

  @Injectable()
  class PaymentsService {
    constructor(private readonly http: HttpClient) {}

    @Retry({ attempts: 3 })
    async statusFromService() {
      return (await this.http.get(`${opts.downstream}/service`)).data;
    }
  }

  @Controller('payments')
  class PaymentsController {
    constructor(
      private readonly http: HttpClient,
      private readonly service: PaymentsService,
    ) {}

    @Get('status')
    @Retry({ attempts: 3 })
    async status() {
      return (await this.http.get(`${opts.downstream}/status`)).data;
    }

    @Post('charge')
    @Retry({ attempts: 3 })
    async charge() {
      return (await this.http.post(`${opts.downstream}/charge`, { json: { amount: 100 } })).data;
    }

    @Post('charge-idempotent')
    @Retry({ attempts: 3, idempotent: true })
    async chargeIdempotent() {
      return (await this.http.post(`${opts.downstream}/charge-idempotent`, { json: { amount: 100 } })).data;
    }

    @Get('via-service')
    async viaService() {
      return this.service.statusFromService();
    }

    @Get('breaker')
    @CircuitBreaker({ failureRateThreshold: 50, minimumCalls: 5, slidingWindow: { type: 'count', size: 5 }, openDuration: '1s', halfOpenMaxCalls: 1 })
    async breaker() {
      return (await this.http.get(`${opts.downstream}/breaker`)).data;
    }
  }

  @Module({
    imports: [HttpClientModule.register({ retry: opts.clientRetry ? undefined : false }), ResilienceModule.forRoot({})],
    controllers: [PaymentsController],
    providers: [PaymentsService],
  })
  class PaymentsModule {}

  const app = await NestFactory.create(PaymentsModule, {
    abortOnError: false,
    logger: {
      log: () => undefined, debug: () => undefined, verbose: () => undefined,
      error: (message: unknown) => console.error(message), fatal: (message: unknown) => console.error(message),
      warn: (message: unknown) => void warnings.push(String(message)),
    },
  });
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as { port: number };
  return { app, url: `http://127.0.0.1:${port}`, warnings };
}
