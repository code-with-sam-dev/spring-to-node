import 'reflect-metadata';
import { Controller, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Ctx, EventPattern, MicroserviceOptions, Payload, RmqContext, Transport } from '@nestjs/microservices';

/**
 * EPISODE 28. A Nest RabbitMQ consumer as its own process. It prints one line per message it
 * handles. A payment whose id is "poison" always throws.
 *
 *   node dist/ep27-rabbitmq/main.js <amqpUrl> <queue> <mode>
 *
 * mode "auto": the defaults, noAck true.
 * mode "manual": noAck false; acknowledges after the handler succeeds, never on failure.
 * mode "dead-letter": noAck false; acknowledges on success, rejects without requeue on failure,
 * so the queue's dead letter exchange takes the message.
 */
const [url, queue, mode] = process.argv.slice(2);
const manual = mode !== 'auto';

@Controller()
class PaymentsConsumer {
  @EventPattern<string>('payment.created')
  handle(@Payload() payment: { id: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    console.log(`HANDLED nest ${payment.id} redelivered ${message.fields.redelivered}`);
    if (payment.id === 'poison') {
      if (mode === 'dead-letter') channel.nack(message, false, false);
      throw new Error('cannot settle this payment');
    }
    if (manual) channel.ack(message);
  }
}

@Module({ controllers: [PaymentsConsumer] })
class ConsumerModule {}

void (async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ConsumerModule, {
    transport: Transport.RMQ,
    options: { urls: [url], queue, noAck: !manual, noAssert: true },
    logger: false,
  });
  await app.listen();
  console.log('READY');
})();
