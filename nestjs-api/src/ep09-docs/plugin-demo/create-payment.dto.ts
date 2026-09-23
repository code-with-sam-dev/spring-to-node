import { IsInt, IsPositive, IsString, Length } from 'class-validator';

/**
 * THE FILENAME IS PART OF THE BEHAVIOUR. It ends in `.dto.ts`, which is what
 * makes the CLI plugin look at it. See create-receipt.ts, which is the same
 * class under a different name and gets nothing.
 */
export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  amountInMinorUnits!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsString()
  idempotencyKey!: string;
}
