import 'reflect-metadata';
import { Module, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsAdapter } from '@nestjs/platform-ws';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * EPISODE 30. One Nest WebSocket gateway, run as its own process.
 *
 *   node dist/ep29-websockets/main.js <port> <io | io-redis | ws> [redisUrl]
 *
 * io        the default adapter, Socket.IO
 * io-redis  Socket.IO with the Redis adapter, so a broadcast reaches every instance
 * ws        the plain WebSocket adapter from @nestjs/platform-ws
 */
const [port, mode, redisUrl] = process.argv.slice(2);

@WebSocketGateway()
class PaymentsGateway {
  @WebSocketServer()
  server: any;

  @SubscribeMessage('pay')
  pay(@MessageBody() id: string) {
    if (mode === 'ws') {
      for (const client of this.server.clients) client.send(JSON.stringify({ event: 'payment', data: id }));
    } else {
      this.server.emit('payment', id);
    }
  }

  @SubscribeMessage('flood')
  flood(@MessageBody() count: number) {
    const chunk = 'x'.repeat(1024);
    const started = Date.now();
    for (let i = 0; i < count; i++) {
      if (mode === 'ws') {
        for (const client of this.server.clients) client.send(chunk);
      } else {
        this.server.emit('flood', chunk);
      }
    }
    console.log(`FLOOD queued in ${Date.now() - started} ms`);
  }
}

class RedisIoAdapter extends IoAdapter {
  private adapter!: ReturnType<typeof createAdapter>;

  async connectToRedis(url: string) {
    const pub = new Redis(url);
    const sub = pub.duplicate();
    this.adapter = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapter);
    return server;
  }
}

@Module({ providers: [PaymentsGateway] })
class WsModule {}

void (async () => {
  const app = await NestFactory.create(WsModule, { logger: false });
  if (mode === 'ws') app.useWebSocketAdapter(new WsAdapter(app as INestApplicationContext));
  if (mode === 'io-redis') {
    const adapter = new RedisIoAdapter(app);
    await adapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(adapter);
  }
  await app.listen(Number(port));
  console.log(`READY ${mode} ${port}`);
  // Every second, how much this process is holding for its clients.
  setInterval(() => {
    const gw = app.get(PaymentsGateway);
    const buffered = mode === 'ws'
      ? [...gw.server.clients].reduce((n: number, c: any) => n + c.bufferedAmount, 0)
      : [...gw.server.sockets.sockets.values()].reduce((n: number, s: any) => n + (s.conn.transport.socket?._socket?.writableLength ?? 0) + s.conn.writeBuffer.length, 0);
    console.log(`MEM rss ${Math.round(process.memoryUsage().rss / 1048576)} MB buffered ${buffered}`);
  }, 1000);
})();
