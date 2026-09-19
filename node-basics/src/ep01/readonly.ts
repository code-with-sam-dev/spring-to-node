class Payment {
  constructor(public readonly id: string) {}
}
const p = new Payment('pay_1');
(p as any).id = 'MUTATED';
console.log('readonly at runtime ->', p.id);
