import 'reflect-metadata';
import { join } from 'node:path';
import { Controller, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GrpcMethod, Transport, type MicroserviceOptions } from '@nestjs/microservices';
import type { ServerUnaryCall } from '@grpc/grpc-js';

/**
 * EPISODE 33. The same payments.proto, served by a NestJS gRPC microservice, run as its own process.
 *
 *   node dist/ep32-grpc/main.js <port> [loader-options]
 *
 * loader-options switches on longs: Number and defaults: true for @grpc/proto-loader.
 */
const [port, mode] = process.argv.slice(2);
let completed = 0;
let skipped = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ChargeRequest = { paymentId?: string; amountCents?: number; capture?: boolean };

@Controller()
class PaymentsController {
  @GrpcMethod('Payments', 'Charge')
  charge(request: ChargeRequest) {
    const amount = request.amountCents as number;
    const seen = `typeof amount_cents ${typeof amount}, amount_cents plus 1 ${String(amount + 1)}, amount_cents === 0 ${amount === 0}, as JSON ${JSON.stringify(request)}`;
    return { seen };
  }

  @GrpcMethod('Payments', 'Slow')
  async slow() {
    await sleep(1000);
    completed++;
    return { seen: 'charged' };
  }

  @GrpcMethod('Payments', 'SlowChecked')
  async slowChecked(_request: ChargeRequest, _metadata: unknown, call: ServerUnaryCall<unknown, unknown>) {
    await sleep(1000);
    if (call.cancelled) {
      skipped++;
      return { seen: 'skipped' };
    }
    completed++;
    return { seen: 'charged' };
  }

  @GrpcMethod('Payments', 'Fail')
  fail() {
    throw new Error('ledger offline at ledger-db:5432');
  }

  @GrpcMethod('Payments', 'Stats')
  stats() {
    return { completed, skipped };
  }
}

@Module({ controllers: [PaymentsController] })
class GrpcModule {}

void (async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(GrpcModule, {
    logger: false,
    transport: Transport.GRPC,
    options: {
      package: 'payments',
      protoPath: join(import.meta.dirname, '../../../spring-grpc/src/main/proto/payments.proto'),
      url: `127.0.0.1:${port}`,
      ...(mode === 'loader-options' ? { loader: { longs: Number, defaults: true } } : {}),
    },
  });
  await app.listen();
  console.log('READY');
})();
