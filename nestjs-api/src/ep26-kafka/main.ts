import 'reflect-metadata';
import { Controller, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Ctx, EventPattern, KafkaContext, MicroserviceOptions, Payload, Transport } from '@nestjs/microservices';

/**
 * EPISODE 27. A Nest Kafka consumer as its own process. It prints one line per message it
 * handles, so the probe can count across processes. A message whose id is "poison" always throws.
 *
 *   node dist/ep26-kafka/main.js <broker> <groupId> [postfixId|default] [from-beginning]
 */
const [broker, groupId, postfixId, fromBeginning] = process.argv.slice(2);

@Controller()
class PaymentsConsumer {
  @EventPattern<string>('payments')
  handle(@Payload() payment: { id: string }, @Ctx() context: KafkaContext) {
    const headers = context.getMessage().headers ?? {};
    console.log(`HANDLED nest ${payment.id} partition ${context.getPartition()} headers ${Object.keys(headers).join(',') || 'none'}`);
    if (payment.id === 'poison') throw new Error('cannot settle this payment');
  }

  @EventPattern<string>('interop')
  read(@Payload() payment: unknown, @Ctx() context: KafkaContext) {
    const headers = context.getMessage().headers ?? {};
    console.log(`HANDLED nest interop payload ${JSON.stringify(payment)} headers ${Object.keys(headers).join(',') || 'none'}`);
  }
}

@Module({ controllers: [PaymentsConsumer] })
class ConsumerModule {}

void (async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ConsumerModule, {
    transport: Transport.KAFKA,
    options: {
      client: { clientId: 'payments', brokers: [broker] },
      consumer: { groupId },
      ...(postfixId !== undefined && postfixId !== 'default' ? { postfixId } : {}),
      ...(fromBeginning === 'from-beginning' ? { subscribe: { fromBeginning: true } } : {}),
    },
    logger: false,
  });
  await app.listen();
  console.log('READY');
})();
