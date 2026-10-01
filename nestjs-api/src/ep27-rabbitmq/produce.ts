import 'reflect-metadata';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

/**
 * EPISODE 28: sends one payment with Nest's RMQ client, to show what goes on the wire.
 *
 *   node dist/ep27-rabbitmq/produce.js <amqpUrl> <queue>
 */
const [url, queue] = process.argv.slice(2);

void (async () => {
  const client = ClientProxyFactory.create({ transport: Transport.RMQ, options: { urls: [url], queue, noAssert: true } });
  await client.connect();
  await lastValueFrom(client.emit('payment.created', { id: 'pay_nest', amount: 100 }));
  console.log('SENT nest');
  await client.close();
})();
