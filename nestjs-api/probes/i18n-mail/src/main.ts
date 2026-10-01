import 'reflect-metadata';
import { join } from 'node:path';
import { Controller, Get, Module, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { I18nModule, I18nService, JsonI18nLoader } from '@nestjs/i18n';
import nodemailer from 'nodemailer';

/**
 * EPISODE 39. Translations with the first-party @nestjs/i18n, and email with nodemailer, run as its
 * own process.
 *
 *   node dist/main.js <port>
 */
const port = Number(process.argv[2]);

@Controller()
class PaymentsController {
  constructor(private readonly i18n: I18nService) {}

  @Get('receipt')
  receipt() {
    return this.i18n.translate('payment.receipt');
  }

  @Get('refund')
  refund() {
    return this.i18n.translate('payment.refund');
  }

  @Get('mail')
  async mail(@Query('port') smtpPort: string) {
    const started = Date.now();
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port: Number(smtpPort), secure: false });
    try {
      await transport.sendMail({ from: 'payments@example.test', to: 'customer@example.test', subject: 'Receipt', text: 'Paid.' });
      return `sent after ${Date.now() - started} ms`;
    } catch (e) {
      return `failed after ${Date.now() - started} ms: ${(e as Error).message}`;
    }
  }

  @Get('mail-and-forget')
  mailAndForget(@Query('port') smtpPort: string) {
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port: Number(smtpPort), secure: false });
    void transport.sendMail({ from: 'payments@example.test', to: 'customer@example.test', subject: 'Receipt', text: 'Paid.' });
    return 'payment accepted';
  }
}

@Module({
  imports: [I18nModule.forRoot({ loader: new JsonI18nLoader({ path: join(import.meta.dirname, '../i18n') }), defaultLocale: 'en' })],
  controllers: [PaymentsController],
})
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: process.env.NEST_LOG ? undefined : false });
await app.listen(port);
console.log('READY');
