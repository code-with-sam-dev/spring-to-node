import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentRequest } from './dto/create-payment.dto.js';
import type { Payment } from './payment.js';

// @Controller('payments') is @RestController plus @RequestMapping("/payments").
// @Post() is @PostMapping. @Body() is @RequestBody. @Param() is @PathVariable.
//
// The shapes line up almost exactly, which is the point of the whole course and
// also the trap: CreatePaymentRequest below looks like a validated DTO and,
// until the validation act, checks nothing at all.
@Controller('payments')
export class PaymentsController {
  // Constructor injection, same as Spring, and here it is the only kind Nest
  // offers for a class provider. There is no field injection to fall back on.
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(@Body() request: CreatePaymentRequest): Promise<Payment> {
    return this.payments.create(request);
  }

  @Get()
  findAll(): Promise<Payment[]> {
    return this.payments.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Payment> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      // A built-in HTTP exception, the rough equivalent of throwing something
      // a @ControllerAdvice would map. The errors act replaces this with a
      // domain error and a filter, which is the shape that survives growth.
      throw new NotFoundException(`No payment with id ${id}`);
    }
    return payment;
  }
}
