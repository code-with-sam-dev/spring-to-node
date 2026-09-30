import 'reflect-metadata';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CreatePaymentDto } from './create-payment.dto.js';
import { CreateReceiptDto } from './create-receipt.js';

/**
 * THE FIX, AND THE PRECONDITION NOBODY MENTIONS.
 *
 * erased.ts measured 0 of 3 properties for a fully typed, fully validated DTO,
 * because the types are erased and the document is built at runtime. The
 * documented answer is the CLI plugin, which rewrites the classes at BUILD time
 * and puts the information back.
 *
 * It works. It also only looks at files whose names end in `.dto.ts` or
 * `.entity.ts`, which is a default nobody reads, and a class in a file named
 * anything else is skipped in silence. Both classes below are compiled by the
 * same build, with the plugin's DEFAULT options.
 */
@Controller()
class DocsController {
  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto) {
    return dto;
  }

  @Post('receipts')
  createReceipt(@Body() dto: CreateReceiptDto) {
    return dto;
  }
}

@Module({ controllers: [DocsController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
const doc = SwaggerModule.createDocument(
  app,
  new DocumentBuilder().setTitle('docs').setVersion('1').build(),
);
await app.close();

const count = (name: string) => {
  const schema = doc.components?.schemas?.[name] as
    | { properties?: Record<string, unknown> } | undefined;
  return Object.keys(schema?.properties ?? {});
};

const payment = count('CreatePaymentDto');
const receipt = count('CreateReceiptDto');

console.log('one build, plugin default options, two identical-looking classes:\n');
console.log(`  create-payment.dto.ts  CreatePaymentDto  ${payment.length} of 3 documented`);
console.log(`  create-receipt.ts      CreateReceiptDto  ${receipt.length} of 2 documented`);
console.log('\nthe payment schema, built from nothing but the class-validator decorators:');
console.log(JSON.stringify(doc.components?.schemas?.['CreatePaymentDto'], null, 2));

// A probe run changes one plugin option; print what it produced and stop, since
// the assertions below pin the DEFAULT behaviour.
if (process.env.PLUGIN_OPTIONS) {
  console.log(`\nprobe: plugin options ${process.env.PLUGIN_OPTIONS}`);
  process.exit(0);
}
if (payment.length !== 3) {
  throw new Error(`CLAIM FAILED: the plugin did not document the .dto.ts class: ${payment.length}`);
}
if (receipt.length !== 0) {
  throw new Error(`CLAIM FAILED: the plugin documented a class it should have skipped: ${receipt.length}`);
}
console.log('\nasserted: the plugin puts back what the compiler erased, and reads');
console.log('          the class-validator decorators while it is there');
console.log('asserted: the identical class in a file not named *.dto.ts got NOTHING,');
console.log('          with no warning of any kind');
