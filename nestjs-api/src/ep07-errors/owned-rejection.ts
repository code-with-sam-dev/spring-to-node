import 'reflect-metadata';
import {
  ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpStatus, Logger, Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The same failing background write as unhandled-rejection.ts, but OWNED.
 *
 * Two honest fixes, and they mean different things:
 *
 *   /catch   the write is genuinely fire and forget, so the caller attaches a
 *            .catch() where it creates the promise. The request succeeds, the
 *            failure is logged, and the process carries on.
 *   /await   the debit belongs to the request's outcome, so it is awaited. The
 *            rejection is back inside the request pipeline, so it reaches the
 *            InsufficientFunds filter and becomes the same 409 as filtered.ts.
 *            The filter was never broken. The error simply never reached it.
 *
 * Detached does not mean unowned. Neither fix is a process-level handler.
 *
 * The server runs in a forked child and the parent is the client, so a crash
 * cannot hide itself: the parent reads the child's exit, which it would see if
 * either route took the process down.
 */
const PORT = 3992;

async function writeAudit(): Promise<void> {
  throw new Error('audit store unavailable');
}

class InsufficientFunds extends Error {
  constructor(readonly shortfall: number, readonly currency: string) {
    super(`short by ${shortfall}`);
  }
}

async function debitAccount(): Promise<void> {
  throw new InsufficientFunds(250, 'USD');
}

@Catch(InsufficientFunds)
class InsufficientFundsFilter implements ExceptionFilter<InsufficientFunds> {
  catch(exception: InsufficientFunds, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(HttpStatus.CONFLICT).json({
      error: 'insufficient_funds',
      shortfallInMinorUnits: exception.shortfall,
      currency: exception.currency,
    });
  }
}

const logger = new Logger('Audit');

@Controller()
class OwnedController {
  @Get('ok')
  ok() {
    return { ok: true };
  }

  @Get('catch')
  fireAndForget() {
    // Deliberately detached, so it gets a deliberate failure policy. Not a
    // no-op catch: here it is logged, and in a real service it might be
    // retried or queued.
    void writeAudit().catch((err: Error) => {
      logger.error(`background audit write failed: ${err.message}`);
      process.send?.(`logged: background audit write failed: ${err.message}`);
    });
    return { started: true };
  }

  @Get('await')
  async awaited() {
    await debitAccount();
    return { debited: true };
  }
}

@Module({ controllers: [OwnedController] })
class AppModule {}

if (process.env.ROLE === 'server') {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalFilters(new InsufficientFundsFilter());
  await app.listen(PORT);
  process.send?.('ready');
} else {
  const child = fork(fileURLToPath(import.meta.url), [], {
    env: { ...process.env, ROLE: 'server' },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const logs: string[] = [];
  await new Promise<void>((r) =>
    child.on('message', (m) => (m === 'ready' ? r() : logs.push(String(m)))),
  );
  let exit: string | null = null;
  child.once('exit', (code, signal) => (exit = `code ${code}, signal ${signal}`));

  const get = async (path: string) => {
    const res = await fetch(`http://localhost:${PORT}${path}`);
    return `${res.status}  ${await res.text()}`;
  };
  const settle = () => new Promise((r) => setTimeout(r, 1500));

  console.log(`GET /catch  ${await get('/catch')}`);
  await settle();
  console.log(`  ${logs.join(' | ') || 'nothing logged'}`);
  console.log(`  then GET /ok  ${exit ? `process EXITED, ${exit}` : await get('/ok')}`);

  const lastAwait = await get('/await');
  console.log(`GET /await  ${lastAwait}`);
  await settle();
  console.log(`  then GET /ok  ${exit ? `process EXITED, ${exit}` : await get('/ok')}`);
  console.log(`node     ${process.version}`);

  child.kill();
  if (!lastAwait.startsWith('409')) {
    throw new Error(`CLAIM FAILED: the awaited domain rejection did not reach the filter: ${lastAwait}`);
  }
  if (exit) throw new Error(`CLAIM FAILED: the process exited (${exit})`);
  if (!logs.some((l) => l.includes('audit store unavailable'))) {
    throw new Error('CLAIM FAILED: the caught failure was not logged');
  }
  console.log('\nasserted: an owned rejection is logged or answered, and the process stays up');
}
