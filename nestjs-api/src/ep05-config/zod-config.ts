import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';

/**
 * The documented fix, and the trap inside it.
 *
 * The @nestjs/config docs show a Standard Schema library passed as
 * `validationSchema`, with Zod as the example. Zod is right for this job: the
 * environment is untrusted input entering the process once, at startup.
 * Episode 7 guards a different boundary, the request body, with
 * class-validator.
 *
 * THE TRAP. The obvious way to read FEATURE_ENABLED is `z.coerce.boolean()`,
 * and it follows JavaScript's Boolean(), so the string "false" becomes true.
 * The fix that fixes the string problem reintroduces it for booleans.
 * `z.stringbool()` is the one that reads "false" as false.
 *
 * abortOnError: false, because by default Nest answers a startup failure with
 * process.exit(1) and the message never reaches this file to be asserted.
 *
 * ORDERING, from the first version of this file's sibling: forRoot reads the
 * environment when the module is DECLARED. So each module here is declared
 * inside a function, after process.env has been set for that run.
 */

const coerced = z.coerce.boolean().parse('false');
const stringbool = z.stringbool().parse('false');
console.log(`z.coerce.boolean().parse("false")   ${coerced}`);
console.log(`z.stringbool().parse("false")       ${stringbool}`);
if (coerced !== true) throw new Error(`CLAIM FAILED: coerce.boolean should turn "false" into true, got ${coerced}`);
if (stringbool !== false) throw new Error(`CLAIM FAILED: stringbool should turn "false" into false, got ${stringbool}`);
console.log();

const schema = z.object({
  PAYMENT_GATEWAY_URL: z.url(),
  PORT: z.coerce.number().int(),
  FEATURE_ENABLED: z.stringbool(),
});

async function boot(env: Record<string, string | undefined>) {
  for (const k of ['PAYMENT_GATEWAY_URL', 'PORT', 'FEATURE_ENABLED']) delete process.env[k];
  Object.assign(process.env, env);
  @Module({ imports: [ConfigModule.forRoot({ ignoreEnvFile: true, validationSchema: schema })] })
  class AppModule {}
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false });
  await app.close();
}

await boot({ PAYMENT_GATEWAY_URL: 'https://gateway.example.test', PORT: '3000', FEATURE_ENABLED: 'false' });
console.log('all three set          the application starts');

let refused = '';
try {
  await boot({ PORT: '3000', FEATURE_ENABLED: 'false' });
} catch (e) {
  refused = e instanceof Error ? e.message : String(e);
}
console.log(`PAYMENT_GATEWAY_URL missing   ${refused ? 'REFUSED TO START' : 'started'}`);
console.log(refused.split('\n').map((l) => '  ' + l).join('\n'));
if (!refused) throw new Error('CLAIM FAILED: a missing URL should stop startup');
if (!refused.includes('PAYMENT_GATEWAY_URL')) throw new Error('CLAIM FAILED: the message should name the key');
