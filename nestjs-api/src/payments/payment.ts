// The domain object. Deliberately separate from the request: keeping transport
// input away from the thing you store is a habit that transfers from Spring
// unchanged.
export interface Payment {
  id: string;
  amountInMinorUnits: number;
  currency: string;
  idempotencyKey: string;
  createdAt: string;
}
