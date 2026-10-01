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
 * ws-guard  the same, with a limit on what may queue for one client
 */
const [port, mode, redisUrl] = process.argv.slice(2);
const plain = mode === 'ws' || mode === 'ws-guard';

/* The slow-client policy Spring has by default: past 512 KB queued, disconnect that client. */
const LIMIT = 512 * 1024;
function send(client: any, data: string) {
  if (client.readyState !== client.OPEN) return;
  if (mode === 'ws-guard' && client.bufferedAmount > LIMIT) {
    console.log(`CLOSED terminated with ${client.bufferedAmount} bytes queued, over the ${LIMIT} byte limit`);
    client.terminate();
    return;
  }
  client.send(data);
}

@WebSocketGateway()
class PaymentsGateway {
  @WebSocketServer()
  server: any;

  @SubscribeMessage('pay')
  pay(@MessageBody() id: string) {
    if (plain) {
      for (const client of this.server.clients) send(client, JSON.stringify({ event: 'payment', data: id }));
    } else {
      this.server.emit('payment', id);
    }
  }

  @SubscribeMessage('flood')
  flood(@MessageBody() count: number) {
    const chunk = 'x'.repeat(1024);
    const started = Date.now();
    for (let i = 0; i < count; i++) {
      if (plain) {
        for (const client of this.server.clients) send(client, chunk);
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
  if (plain) app.useWebSocketAdapter(new WsAdapter(app as INestApplicationContext));
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
    const buffered = plain
      ? [...gw.server.clients].reduce((n: number, c: any) => n + c.bufferedAmount, 0)
      : [...gw.server.sockets.sockets.values()].reduce((n: number, s: any) => n + (s.conn.transport.socket?._socket?.writableLength ?? 0) + s.conn.writeBuffer.length, 0);
    console.log(`MEM rss ${Math.round(process.memoryUsage().rss / 1048576)} MB buffered ${buffered}`);
  }, 1000);
})();
