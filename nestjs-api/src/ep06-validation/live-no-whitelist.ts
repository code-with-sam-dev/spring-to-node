import 'reflect-metadata';
import { Body, Controller, Module, Post, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IsInt, IsString, Min } from 'class-validator';

/**
 * mass-assignment.ts proves the property survives plainToInstance. This proves it
 * through a REAL HTTP request, a real ValidationPipe and a real handler: what the
 * handler receives, with transform on and whitelist off, and then with whitelist on.
 *
 * The handler echoes the keys of the object it was given, so the evidence is what
 * the controller actually received, not what a transform function returns.
 */
class CreatePaymentDto {
  @IsInt()
  @Min(1)
  amountInMinorUnits!: number;

  @IsString()
  currency!: string;
}

@Controller()
class ProbeController {
  @Post('probe')
  probe(@Body() dto: CreatePaymentDto) {
    return { receivedKeys: Object.keys(dto).sort(), isDto: dto instanceof CreatePaymentDto };
  }
}

@Module({ controllers: [ProbeController] })
class AppModule {}

async function run(pipe: ValidationPipe, port: number) {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(pipe);
  await app.listen(port);
  const res = await fetch(`http://localhost:${port}/probe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amountInMinorUnits: 1, currency: 'USD', isAdmin: true, role: 'admin' }),
  });
  const body = await res.json();
  await app.close();
  return { status: res.status, body };
}

const open = await run(new ValidationPipe({ transform: true }), 3981);
console.log(`transform on, whitelist off   ${open.status}  handler received: ${open.body.receivedKeys?.join(', ')}`);
const stripped = await run(new ValidationPipe({ transform: true, whitelist: true }), 3982);
console.log(`transform on, whitelist on    ${stripped.status}  handler received: ${stripped.body.receivedKeys?.join(', ')}`);

if (!open.body.receivedKeys?.includes('isAdmin')) {
  throw new Error(`CLAIM FAILED: expected isAdmin to reach the handler without whitelist: ${JSON.stringify(open.body)}`);
}
if (stripped.body.receivedKeys?.includes('isAdmin')) {
  throw new Error(`CLAIM FAILED: whitelist should have removed isAdmin: ${JSON.stringify(stripped.body)}`);
}
console.log('asserted: through a real request, the handler receives undeclared fields until whitelist is on');
