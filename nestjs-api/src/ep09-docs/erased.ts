import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString, Length } from 'class-validator';

/**
 * WHAT DOES YOUR DTO DOCUMENT BY ITSELF?
 *
 * In Spring the answer is everything. springdoc reads the record components and
 * the Bean Validation annotations and writes a schema without being asked, so a
 * Spring developer has never had to think about it.
 *
 * This measures the same DTO here. It carries real TypeScript types AND
 * class-validator decorators, which is more information than the Java version
 * has in its source. The question is how much of it survives to runtime, where
 * the document is generated.
 *
 * This is episode 2's erasure lesson arriving in a place nobody expects it.
 */
const PORT = 3995;

class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  amountInMinorUnits!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

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

console.log('the DTO declares three properties, all typed, all validated.');
console.log('what the generated OpenAPI schema says about it:\n');
console.log(JSON.stringify(schema ?? null, null, 2));

const properties = Object.keys(schema?.properties ?? {});
console.log(`\nproperties documented: ${properties.length} of 3`);
console.log(`required documented:   ${(schema?.required ?? []).length} of 3`);

// Pinning the OBSERVED behaviour rather than the expected one, the same way
// IncludeMessageTest does, so a future version that fixes this fails here and
// tells us rather than passing silently.
if (properties.length !== 0) {
  throw new Error(
    `OBSERVATION CHANGED: the schema now documents ${properties.length} properties `
    + 'without the CLI plugin. Re-measure before the episode says otherwise.',
  );
}
// Probe A from the 2026-09-30 consult: is the type information really gone?
// These properties carry class-validator decorators, so emitDecoratorMetadata
// still records a design:type for each one.
console.log('\nwhat runtime reflection still knows about the same class:');
for (const p of ['amountInMinorUnits', 'currency', 'idempotencyKey']) {
  const t = Reflect.getMetadata('design:type', CreatePaymentDto.prototype, p) as { name?: string } | undefined;
  console.log(`  ${p.padEnd(19)} design:type = ${t?.name ?? 'nothing'}`);
}
console.log('\nasserted: with no plugin and no ApiProperty, the schema is EMPTY,');
console.log('even though runtime reflection still knows each decorated property\'s type:');
console.log('@nestjs/swagger builds schemas from its own ApiProperty metadata, and none exists');
