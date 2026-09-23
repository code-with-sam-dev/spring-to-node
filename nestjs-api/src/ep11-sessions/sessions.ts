import 'reflect-metadata';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * WHAT DOES A SESSION COST, WITH NOTHING CONFIGURED?
 *
 * Spring, measured by Ep11SessionTest: an HttpSession parameter is the whole
 * of it. A JSESSIONID cookie arrives, HttpOnly, and state survives between
 * requests. Nothing installed, nothing configured.
 *
 * This measures the same counter here in three states: with nothing, with
 * express-session at its defaults, and it captures what express-session says
 * about itself when it starts, because that sentence is the episode.
 */
const PORT = Number(process.env.PORT ?? 4001);

type Req = { session?: Record<string, unknown> & { visits?: number } };

@Controller()
class VisitController {
  @Get('visit')
  visit(@Req() req: Req) {
    if (!req.session) return { session: 'undefined' };
    req.session.visits = (req.session.visits ?? 0) + 1;
    return { visits: req.session.visits };
  }
}

@Module({ controllers: [VisitController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  if (process.env.WITH_SESSION === '1') {
    // The secret is a placeholder for a demo and would come from configuration
    // in any real service; episode 6 covers exactly that.
    app.use(session({ secret: 'demo-only', resave: false, saveUninitialized: false }));
  }
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const run = async (withSession: boolean, nodeEnv = 'development') => {
    let stderr = '';
    const child = fork(fileURLToPath(import.meta.url), [], {
      env: { ...process.env, ROLE: 'server', WITH_SESSION: withSession ? '1' : '0', NODE_ENV: nodeEnv },
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    child.stderr?.on('data', (d) => { stderr += String(d); });
    await new Promise<void>((r) => child.once('message', () => r()));

    const first = await fetch(`http://localhost:${PORT}/visit`);
    const setCookie = first.headers.get('set-cookie');
    const cookie = setCookie?.split(';')[0];
    const second = await fetch(`http://localhost:${PORT}/visit`,
      { headers: cookie ? { cookie } : {} });
    const out = {
      first: await first.text(), second: await second.text(), setCookie, stderr: stderr.trim(),
    };
    child.kill();
    await new Promise((r) => setTimeout(r, 200));
    return out;
  };

  const bare = await run(false);
  const withStore = await run(true);
  // THE SAME SERVER AGAIN, with NODE_ENV=production and nothing else changed.
  // The MemoryStore warning is printed only here: silent in development, where
  // a developer would read it, and loud in production, where it is too late.
  const inProduction = await run(true, 'production');

  console.log('NestJS, nothing installed:');
  console.log(`  first   ${bare.first}   set-cookie: ${bare.setCookie ?? '(none)'}`);
  console.log('\nNestJS, express-session at its defaults:');
  console.log(`  first   ${withStore.first}   set-cookie: ${withStore.setCookie ?? '(none)'}`);
  console.log(`  second  ${withStore.second}`);
  console.log('\nwhat express-session printed at startup, NODE_ENV=development:');
  console.log(`  ${withStore.stderr || '(nothing)'}`);
  console.log('what the same server printed at startup, NODE_ENV=production:');
  console.log(`  ${inProduction.stderr.replace(/\n/g, ' ') || '(nothing)'}`);

  if (!bare.first.includes('undefined')) {
    throw new Error(`CLAIM FAILED: a session existed with nothing installed: ${bare.first}`);
  }
  if (!withStore.second.includes('"visits":2')) {
    throw new Error(`CLAIM FAILED: express-session did not carry state: ${withStore.second}`);
  }
  if (withStore.stderr.includes('MemoryStore')) {
    throw new Error('OBSERVATION CHANGED: the warning now prints in development too');
  }
  if (!inProduction.stderr.includes('MemoryStore is not')) {
    throw new Error(`CLAIM FAILED: no MemoryStore warning in production: ${inProduction.stderr}`);
  }
  console.log('\nasserted: no session exists until a package is installed and registered');
  console.log('asserted: with express-session, state survives, via connect.sid');
  console.log('asserted: the MemoryStore warning is silent in development and printed');
  console.log('          only under NODE_ENV=production');
}
