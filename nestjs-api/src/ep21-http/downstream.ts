import { createServer, Server } from 'node:http';

/**
 * EPISODE 22. The API we call: counts every request it receives, per path. /slow answers after ten
 * seconds and records whether the caller hung up first; /fail answers 500; /flaky/<id> answers 500
 * the first time for each id and 200 after; anything else answers 200 with a small JSON body.
 */
export async function startDownstream() {
  const hits = new Map<string, number>();
  const events: string[] = [];
  let requests = 0;
  const started = Date.now();
  const at = () => `${((Date.now() - started) / 1000).toFixed(1)} s`;
  const server: Server = createServer((req, res) => {
    requests++;
    const path = req.url ?? '/';
    hits.set(path, (hits.get(path) ?? 0) + 1);
    if (path === '/slow') {
      const began = Date.now();
      res.on('close', () => {
        if (!res.writableFinished) events.push(`caller hung up after ${((Date.now() - began) / 1000).toFixed(1)} s`);
      });
      setTimeout(() => {
        events.push(`work finished after ${((Date.now() - began) / 1000).toFixed(1)} s`);
        if (!res.destroyed) res.end('{"late":true}');
      }, 10000);
      return;
    }
    const fail = path === '/fail' || (path.startsWith('/flaky/') && hits.get(path) === 1);
    res.statusCode = fail ? 500 : 200;
    res.setHeader('content-type', 'application/json');
    res.end(fail ? '{"error":"downstream failed"}' : '{"id":"pay_1","status":"settled"}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return {
    url: `http://127.0.0.1:${port}`,
    requests: () => requests,
    hits: (path: string) => hits.get(path) ?? 0,
    events,
    at,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((r) => server.close(() => r()));
    },
  };
}

/** A port nothing listens on: opened, read, closed. */
export async function closedPort() {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as { port: number };
  await new Promise<void>((r) => s.close(() => r()));
  return `http://127.0.0.1:${port}`;
}
