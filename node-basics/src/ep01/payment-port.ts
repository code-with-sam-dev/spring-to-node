export interface PaymentPort {
  charge(amountInMinorUnits: number, currency: string): Promise<string>;
}
