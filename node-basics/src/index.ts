type Payment = {
  id: string;
  amount: number;
  currency: string;
};

const payment: Payment = {
  id: 'pay_001',
  amount: 100,
  currency: 'USD',
};

console.log(`Payment ${payment.id} for ${payment.amount} ${payment.currency}`);
