import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/** EPISODE 37. The ledger service, and a payment that calls the Spring ledger. */
@Controller()
class LedgerController {
  @Get('ledger')
  ledger() {
    return 'recorded';
  }

  @Get('pay')
  async pay() {
    return (await fetch(`${process.env.SPRING_URL}/ledger`)).text();
  }
}

@Module({ controllers: [LedgerController] })
class OtelModule {}

const app = await NestFactory.create(OtelModule, { logger: false });
await app.listen(Number(process.env.PORT));
console.log('READY');
