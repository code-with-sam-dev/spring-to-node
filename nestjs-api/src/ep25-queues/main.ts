import { startApp } from './app.js';

/**
 * EPISODE 26: the queues app as its own process, for the crash probes.
 *
 *   node dist/ep25-queues/main.js <redisUrl> <port>
 */
const [redisUrl, port] = process.argv.slice(2);
void startApp({ redisUrl, port: Number(port) }).then(() => console.log('READY'));
