import { IsInt, IsString } from 'class-validator';

/**
 * IDENTICAL IN EVERY WAY THAT A DEVELOPER CAN SEE, and invisible to the plugin,
 * because the file is not named `*.dto.ts`. Nothing warns. The class simply
 * documents nothing.
 */
export class CreateReceiptDto {
  @IsInt()
  paymentId!: number;

  @IsString()
  format!: string;
}
