import 'reflect-metadata';
import { Body, Controller, Module, Post, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * The cost of writing ApiProperty by hand, MEASURED rather than argued.
 *
 * The same rule written twice, once for the validator and once for the
 * document, and the two disagree: exactly what happens the day someone edits
 * one and not the other. Nothing fails. The application enforces one rule and
 * the documentation advertises another.
 */
const PORT = 3996;

class CreateTransferDto {
  @IsString()
  @Length(3, 3)
  @ApiProperty({ minLength: 2, maxLength: 2 })
  currency!: string;
}

@Controller('transfers')
class TransfersController {
  @Post()
  create(@Body() dto: CreateTransferDto) {
    return dto;
  }
}

@Module({ controllers: [TransfersController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
app.useGlobalPipes(new ValidationPipe());
const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('t').setVersion('1').build());
await app.listen(PORT);

const post = async (currency: string) => {
  const res = await fetch(`http://localhost:${PORT}/transfers`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currency }),
  });
  return res.status;
};
const usd = await post('USD');
const us = await post('US');
await app.close();

const currency = (doc.components?.schemas?.['CreateTransferDto'] as any)?.properties?.currency;
console.log('the validator enforces @Length(3, 3):');
console.log(`  POST currency "USD"  ${usd}`);
console.log(`  POST currency "US"   ${us}`);
console.log('the document advertises:');
console.log(`  currency ${JSON.stringify(currency)}`);

if (usd !== 201 || us !== 400 || currency?.minLength !== 2 || currency?.maxLength !== 2) {
  throw new Error('CLAIM FAILED: the validator and the document did not disagree as described');
}
console.log('\nasserted: the application enforces one rule, the documentation advertises another,');
console.log('and nothing failed');
