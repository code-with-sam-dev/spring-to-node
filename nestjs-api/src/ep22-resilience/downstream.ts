import { createServer, Server } from 'node:http';

/**
 * EPISODE 23. The payments API: answers 500 while it is down and 200 once it is back, and records
 * the moment of every request it receives, per path.
 */
export async function startDownstream() {
  const hits = new Map<string, number[]>();
  const state = { down: true };
  const server: Server = createServer((req, res) => {
    const path = req.url ?? '/';
    hits.set(path, [...(hits.get(path) ?? []), performance.now()]);
    req.resume();
    req.on('end', () => {
      res.statusCode = state.down ? 500 : 200;
      res.setHeader('content-type', 'application/json');
      res.end(state.down ? '{"error":"payments down"}' : '{"status":"settled"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return {
    url: `http://127.0.0.1:${port}`,
    state,
    hits: (path: string) => hits.get(path)?.length ?? 0,
    /** Milliseconds of each hit after the first, rounded to tens. */
    timeline: (path: string) => {
      const t = hits.get(path) ?? [];
      return t.map((n) => `${Math.round((n - t[0]) / 10) * 10} ms`).join(', ');
    },
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((r) => server.close(() => r()));
    },
  };
}
