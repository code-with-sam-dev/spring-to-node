import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

// THE SAME CLASS, NOW WITH RUNTIME VALIDATION.
//
// The field types below have not changed and still validate nothing. What
// changed is that every field now carries a DECORATOR, and a decorator is a
// function that runs and registers a rule the ValidationPipe can check when a
// request actually arrives.
//
// For a Spring developer this is Bean Validation and it reads almost
// identically: @IsInt() is @NotNull plus a type check, @Min(1) is @Positive,
// @IsIn([...]) is a constrained set. The habit transfers completely. What does
// NOT transfer is the assumption that the field TYPE was doing any of this.
export class CreatePaymentRequest {
  @IsInt({ message: 'amountInMinorUnits must be an integer number of minor units' })
  @Min(1, { message: 'amountInMinorUnits must be at least 1' })
  amountInMinorUnits!: number;

  @IsIn(['USD', 'EUR', 'GBP', 'ZAR'], { message: 'currency must be a supported ISO code' })
  currency!: string;

  @IsString()
  @IsNotEmpty({ message: 'idempotencyKey is required' })
  idempotencyKey!: string;
}
