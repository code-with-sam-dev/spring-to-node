import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

/**
 * Everything out of the environment is a string, including the word "false".
 *
 * Spring converts on the way in. Declare `int maxRetries` or `boolean enabled`
 * and the binder produces an int or a boolean, and complains at startup if the
 * text will not convert. The environment underneath is still strings, but you
 * never touch them.
 *
 * In Node there is no binder unless you add one. `process.env` is strings, so
 * `FEATURE_ENABLED=false` arrives as the five character string "false", and
 * every non-empty string is truthy. The feature is ON.
 *
 * THE PORT ONE IS THE SAME SHAPE and reaches further: `PORT=3000` arrives as
 * "3000", and `"3000" + 1` is "30001" rather than 3001. That is episode 2's
 * plus-versus-times bite arriving through configuration, which is worth naming
 * out loud because it is the same defect wearing a different coat.
 */
@Injectable()
class Flags {
  constructor(private readonly config: ConfigService) {}
  raw(key: string) {
    return this.config.get(key);
  }
}

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
  providers: [Flags],
})
class AppModule {}

process.env.FEATURE_ENABLED = 'false';
process.env.PORT = '3000';

const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
const flags = app.get(Flags);
const enabled = flags.raw('FEATURE_ENABLED');
const port = flags.raw('PORT');
await app.close();

console.log(`FEATURE_ENABLED   value ${JSON.stringify(enabled)}   typeof ${typeof enabled}`);
console.log(`  if (enabled) runs?  ${enabled ? 'YES, the feature is ON' : 'no'}`);
console.log();
console.log(`PORT              value ${JSON.stringify(port)}   typeof ${typeof port}`);
console.log(`  PORT + 1            ${JSON.stringify((port as any) + 1)}`);
console.log(`  Number(PORT) + 1    ${Number(port) + 1}`);

if (typeof enabled !== 'string') {
  throw new Error(`CLAIM FAILED: expected a string, got ${typeof enabled}`);
}
if (!enabled) {
  throw new Error('CLAIM FAILED: the string "false" should be truthy');
}
if ((port as any) + 1 !== '30001') {
  throw new Error(`CLAIM FAILED: expected "30001", got ${String((port as any) + 1)}`);
}
console.log('\nasserted: "false" is truthy, and PORT + 1 is "30001"');
