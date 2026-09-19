class Merchant {
  constructor(public id: string) {}
}
class Customer {
  constructor(public id: string) {}
}
const m: Merchant = new Customer('c_1');
console.log('structural typing: assigned a Customer to a Merchant ->', m.id);
