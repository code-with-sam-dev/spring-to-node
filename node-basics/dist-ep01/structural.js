"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Merchant {
    id;
    constructor(id) {
        this.id = id;
    }
}
class Customer {
    id;
    constructor(id) {
        this.id = id;
    }
}
const m = new Customer('c_1');
console.log('structural typing: assigned a Customer to a Merchant ->', m.id);
