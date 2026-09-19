"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Payment {
    id;
    constructor(id) {
        this.id = id;
    }
}
const p = new Payment('pay_1');
p.id = 'MUTATED';
console.log('readonly at runtime ->', p.id);
