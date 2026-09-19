import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller.js';

@Module({ controllers: [ReceiptsController] })
export class ReceiptsModule {}
