import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health/health.controller.js';
import { DatabaseModule } from './database.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';

@Module({
  imports: [DatabaseModule, PaymentsModule, ReceiptsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
