import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IsInt, IsUrl, Max, Min, validateSync } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';

/**
 * Buying Spring's startup failure back, in about fifteen lines.
 *
 * This is the payoff of the episode and it matters that it is small. The
 * default is permissive, the fix is not a framework change, and once it is in
 * place a missing or malformed setting stops the application on the machine of
 * whoever broke it, which is the behaviour a Spring developer already expects.
 *
 * THE SECOND HALF IS THE INTERESTING HALF. Validating that a variable EXISTS is
 * the obvious win. Converting it is the one people skip, and it is what closes
 * the "false" is truthy hole: declare the field as a number or a boolean and
 * the transform produces one, so the rest of the application never touches the
 * string.
 */
class Env {
  @IsUrl({ require_tld: false })
  PAYMENT_GATEWAY_URL!: string;

  // @Type IS LOAD BEARING. Without it PORT stays the string "3000" and
  // @IsInt fails on a perfectly good port. Relying on
  // enableImplicitConversion alone did exactly that while this was written.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;
}

const validate = (raw: Record<string, unknown>) => {
  const parsed = plainToInstance(Env, raw);
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '));
  }
  return parsed;
};

/*
  A FRESH MODULE PER CASE, and the reason is the thing that cost the most time
  here. `ConfigModule.forRoot` reads the environment at the moment the module
  is built, not at the moment the application starts. Declaring one AppModule
  at the top of the file froze the environment as it was then: setting the
  variable afterwards and starting a second context changed nothing, because
  the module had already captured the old values.

  Two wrong guesses went by before a three line probe showed plainToInstance
  converting "3000" to 3000 exactly as documented. The transform was never the
  problem; the ordering was.
*/
const buildModule = () => {
  class ConfiguredModule {}
  // Applied for its side effect: Nest's Module decorator defines metadata on
  // the class and returns void, so returning its result hands createApplication
  // Context `undefined`, which quietly builds an empty container that validates
  // nothing at all.
  Module({ imports: [ConfigModule.forRoot({ ignoreEnvFile: true, validate })] })(ConfiguredModule);
  return ConfiguredModule;
};

const startWith = async (env: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    const app = await NestFactory.createApplicationContext(buildModule(), {
      logger: false,
      abortOnError: false,
    });
    await app.close();
    return null;
  } catch (err) {
    return String((err as Error).message);
  }
};

// Case one: the setting is missing, exactly as in missing-config.ts.
const refusal = await startWith({ PAYMENT_GATEWAY_URL: undefined, PORT: '3000' });

console.log('with PAYMENT_GATEWAY_URL unset, the application:');
console.log(refusal ? `  REFUSED TO START: ${refusal.split('\n')[0]}` : '  started (claim failed)');

if (!refusal) {
  throw new Error('CLAIM FAILED: validation did not stop the application');
}
if (!/PAYMENT_GATEWAY_URL/.test(refusal)) {
  throw new Error(`CLAIM FAILED: the refusal does not name the key:\n${refusal}`);
}

// Case two: set it properly and the same graph starts.
const second = await startWith({
  PAYMENT_GATEWAY_URL: 'https://api.example.test/v2',
  PORT: '3000',
});
console.log(second ? `\nstill refused: ${second}` : '\nwith it set, the application started.');
if (second) {
  throw new Error(`CLAIM FAILED: a valid environment was rejected: ${second}`);
}
console.log('asserted: validation buys back the startup failure, and converts the types');
