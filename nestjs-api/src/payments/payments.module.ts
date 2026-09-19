import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PaymentEntity } from './payment.entity.js';

// There is no @ComponentScan here and that is deliberate on Nest's part.
// forFeature declares which repositories this module can inject. Leave the
// entity out and the application fails at bootstrap naming exactly what it
// could not resolve, which is a better failure than a null at runtime.
@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
