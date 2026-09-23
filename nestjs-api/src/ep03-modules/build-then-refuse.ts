import 'reflect-metadata';
import { Injectable, Module, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * EPISODE 4, THE EXAMPLE THAT IS TYPED ON SCREEN, MEASURED IN FOUR STATES.
 *
 * Every string the episode shows about this example comes from running this
 * file. The build is PaymentsService in PaymentsModule; ReceiptsModule then
 * wants it. The four states are the four things a Spring developer tries:
 *
 *   1. an interface as the parameter type        erased, and refused
 *   2. neither door open                          refused, and the token is NAMED
 *   3. imports only, the Spring instinct          still refused
 *   4. exports AND imports                        resolves
 *
 * abortOnError: false makes the refusal CATCHABLE; without it Nest exits the
 * process and a try/catch never runs.
 */

// ---- payments.service.ts, as typed on screen ------------------------------
@Injectable()
export class PaymentsService {
  private readonly paid = new Set<string>(['pay_1']);

  isPaid(id: string) {
    return this.paid.has(id);
  }
}

// ---- receipts.service.ts, as typed on screen ------------------------------
@Injectable()
export class ReceiptsService {
  constructor(private readonly payments: PaymentsService) {}

  receiptFor(id: string) {
    return this.payments.isPaid(id) ? `receipt for ${id}` : 'not paid';
  }
}

// ---- the erased variant: the parameter type is an interface ----------------
interface PaymentsPort {
  isPaid(id: string): boolean;
}

/*
  DECLARED WITH THE SAME CLASS NAME, ReceiptsService, inside its own scope, so
  the two refusals shown side by side in the cold open name the same consumer
  and differ only where they genuinely differ. Nest's message takes the name
  from the class declaration, so this is what it really prints for this code,
  not a renamed string.
*/
const ErasedReceiptsService = (() => {
  @Injectable()
  class ReceiptsService {
    constructor(private readonly payments: PaymentsPort) {}
  }
  return ReceiptsService;
})();

/** Builds the two modules with the doors open or shut, and runs the graph. */
async function attempt(opts: { exportIt: boolean; importIt: boolean; consumer: Type<unknown> }) {
  @Module({
    providers: [PaymentsService],
    exports: opts.exportIt ? [PaymentsService] : [],
  })
  class PaymentsModule {}

  @Module({
    imports: opts.importIt ? [PaymentsModule] : [],
    providers: [opts.consumer],
  })
  class ReceiptsModule {}

  @Module({ imports: [PaymentsModule, ReceiptsModule] })
  class AppModule {}

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false,
    });
    const out = opts.consumer === ReceiptsService
      ? app.get(ReceiptsService).receiptFor('pay_1')
      : 'started';
    await app.close();
    return { ok: true, text: out };
  } catch (err) {
    return { ok: false, text: String((err as Error).message).split('\n')[0] };
  }
}

// STATE 0, the end of the build: PaymentsModule on its own. This is the proof
// that the provider EXISTS before anything asks for it across a boundary.
@Module({ providers: [PaymentsService] })
class PaymentsOnly {}
const alone = await NestFactory.createApplicationContext(PaymentsOnly, { logger: false });
const isPaid = alone.get(PaymentsService).isPaid('pay_1');
await alone.close();
console.log('0. PaymentsModule on its own:');
console.log(`   PaymentsService.isPaid('pay_1') -> ${isPaid}\n`);
if (isPaid !== true) throw new Error('CLAIM FAILED: the provider does not exist on its own');

const erased = await attempt({ exportIt: true, importIt: true, consumer: ErasedReceiptsService });
const neither = await attempt({ exportIt: false, importIt: false, consumer: ReceiptsService });
const importOnly = await attempt({ exportIt: false, importIt: true, consumer: ReceiptsService });
// The other half of "a missing import and a missing export print the same
// message". Import-only is the missing EXPORT; this is the missing IMPORT.
const exportOnly = await attempt({ exportIt: true, importIt: false, consumer: ReceiptsService });
const both = await attempt({ exportIt: true, importIt: true, consumer: ReceiptsService });

console.log('1. an interface as the parameter type, doors open:');
console.log(`   ${erased.text}\n`);
console.log('2. PaymentsService, neither door open:');
console.log(`   ${neither.text}\n`);
console.log('3. imports: [PaymentsModule] only, the Spring instinct:');
console.log(`   ${importOnly.text}\n`);
console.log('3b. exports: [PaymentsService] only, no import:');
console.log(`   ${exportOnly.text}\n`);
console.log('4. exports AND imports:');
console.log(`   ${both.text}\n`);

if (erased.ok || !erased.text.includes('argument at index [0]')) {
  throw new Error(`CLAIM FAILED: the erased case did not refuse without a name: ${erased.text}`);
}
if (neither.ok || !neither.text.includes('argument PaymentsService at index [0]')) {
  throw new Error(`CLAIM FAILED: the shut case did not name the token: ${neither.text}`);
}
if (importOnly.ok) {
  throw new Error('CLAIM FAILED: importing without an export resolved');
}
// THE LIMIT OF THE DIAGNOSTIC, asserted so it is never overstated: a missing
// import and a missing export produce the SAME message. A named token says
// "look at visibility", not which of the two doors is shut.
if (exportOnly.ok) {
  throw new Error('CLAIM FAILED: exporting without an import resolved');
}
if (exportOnly.text !== importOnly.text) {
  throw new Error(`OBSERVATION CHANGED: a missing import and a missing export now differ:\n${exportOnly.text}\n${importOnly.text}`);
}
if (importOnly.text !== neither.text) {
  throw new Error(`OBSERVATION CHANGED: import-only now differs from neither:\n${importOnly.text}`);
}
if (!both.ok || both.text !== 'receipt for pay_1') {
  throw new Error(`CLAIM FAILED: exports plus imports did not resolve: ${both.text}`);
}
console.log('asserted: an interface is refused with NO name; the class is refused WITH its name');
console.log('asserted: importing alone is not enough; the module must also export');
console.log('asserted: a missing import and a missing export print the SAME message');
console.log('asserted: with both doors open the same classes resolve and run');
