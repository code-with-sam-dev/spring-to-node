import 'reflect-metadata';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';

/**
 * DO SESSIONS EVER LEAVE MEMORY?
 *
 * express-session's own warning says MemoryStore "will leak memory". That is a
 * claim, and this measures it rather than quoting it: ten thousand visitors
 * who each get a session and never come back, then a count of what the store
 * is still holding, and the expiry each one was given.
 *
 * Spring's side, measured in Ep11SessionTest, is getMaxInactiveInterval() on a
 * default HttpSession.
 */
const PORT = 4003;
const VISITORS = 10_000;

type Req = { session: Record<string, unknown> & { visits?: number; cookie: { maxAge?: number | null; expires?: Date | null } } };

let lastCookie: { maxAge?: number | null; expires?: Date | null } | undefined;

@Controller()
class VisitController {
  @Get('visit')
  visit(@Req() req: Req) {
    req.session.visits = (req.session.visits ?? 0) + 1;
    lastCookie = req.session.cookie;
    return { visits: req.session.visits };
  }
}

@Module({ controllers: [VisitController] })
class AppModule {}

const store = new session.MemoryStore();
const app = await NestFactory.create(AppModule, { logger: false });
app.use(session({ secret: 'demo-only', resave: false, saveUninitialized: false, store }));
await app.listen(PORT);

// Ten thousand visitors, none of whom send a cookie back, which is exactly what
// a crawler, a health checker or a load balancer probe looks like.
for (let i = 0; i < VISITORS; i += 500) {
  await Promise.all(Array.from({ length: 500 }, () => fetch(`http://localhost:${PORT}/visit`).then((r) => r.text())));
}

const count = () => new Promise<number>((resolve, reject) =>
  store.length((err, n) => (err ? reject(err) : resolve(n ?? 0))));

const held = await count();
await new Promise((r) => setTimeout(r, 2000));
const later = await count();
await app.close();

console.log(`${VISITORS} visitors, each given a session, none returning:\n`);
console.log(`  sessions held by the store:        ${held}`);
console.log(`  sessions held two seconds later:   ${later}`);
console.log(`  cookie maxAge on each session:     ${lastCookie?.maxAge ?? 'null'}`);
console.log(`  cookie expires on each session:    ${lastCookie?.expires ?? 'null'}`);

if (held !== VISITORS) throw new Error(`CLAIM FAILED: expected ${VISITORS} sessions, found ${held}`);
if (lastCookie?.maxAge != null) throw new Error(`CLAIM FAILED: a default maxAge exists: ${lastCookie?.maxAge}`);
console.log('\nasserted: every session is retained, and none carries an expiry,');
console.log('          so nothing in the default configuration will ever remove them');
