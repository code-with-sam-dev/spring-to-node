import 'reflect-metadata';
import { ClientKafka, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

/**
 * EPISODE 27: sends one payment with Nest's ClientKafka, to show what goes on the wire.
 *
 *   node dist/ep26-kafka/produce.js <broker>
 */
const [broker] = process.argv.slice(2);

void (async () => {
  const client = ClientProxyFactory.create({
    transport: Transport.KAFKA,
    options: { client: { clientId: 'payments-producer', brokers: [broker] }, producerOnlyMode: true },
  }) as ClientKafka;
  await client.connect();
  await lastValueFrom(client.emit('interop', { key: 'pay_nest', value: { id: 'pay_nest', amount: 100 } }));
  console.log('SENT nest');
  await client.close();
})();
