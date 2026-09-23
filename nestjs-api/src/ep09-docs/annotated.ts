import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Length } from 'class-validator';

/**
 * WHAT IT COSTS TO GET BACK WHAT SPRING GAVE AWAY.
 *
 * erased.ts measured 0 of 3 properties for a fully typed, fully validated DTO.
 * This is the same class with the missing information written out by hand, so
 * the comparison is a COST rather than a capability: both stacks can document
 * this, and one of them charges you a line per field to do it.
 *
 * Note what is being duplicated. @Length(3, 3) already says the currency is
 * three characters, and @ApiProperty has to say it again, because the two
 * decorators write to different places and neither reads the other. That
 * duplication is the thing to watch: the day someone changes one and not the
 * other, the documentation is wrong and everything still passes.
 */
const PORT = 3996;

class CreatePaymentDto {
  @ApiProperty({ type: Number, minimum: 1, example: 4500 })
  @IsInt()
  @IsPositive()
  amountInMinorUnits!: number;

  @ApiProperty({ type: String, minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty({ type: String, example: 'idem_8a1f' })
  @IsString()
  idempotencyKey!: string;
}

@Controller('payments')
class PaymentsController {
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return dto;
  }
}

@Module({ controllers: [PaymentsController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
const doc = SwaggerModule.createDocument(
  app,
  new DocumentBuilder().setTitle('payments').setVersion('1').build(),
);
await app.close();

const schema = doc.components?.schemas?.['CreatePaymentDto'] as
  | { properties?: Record<string, unknown>; required?: string[] }
  | undefined;

console.log('the same DTO, with ApiProperty written out by hand:\n');
console.log(JSON.stringify(schema ?? null, null, 2));

const properties = Object.keys(schema?.properties ?? {});
console.log(`\nproperties documented: ${properties.length} of 3`);
console.log(`required documented:   ${(schema?.required ?? []).length} of 3`);

if (properties.length !== 3) {
  throw new Error(`CLAIM FAILED: expected 3 properties, got ${properties.length}`);
}
console.log('\nasserted: three decorators, three lines of duplicated constraint');
console.log('Spring published the same information from annotations it already had');
