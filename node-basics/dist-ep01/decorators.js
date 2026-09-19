"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
function Injectable() {
    console.log('  [decorator body ran]');
    return (target) => {
        console.log('  [decorator applied to]', target.name);
    };
}
console.log('1. before the class is defined');
let PaymentService = class PaymentService {
    charge() { return 'charged'; }
};
PaymentService = __decorate([
    Injectable()
], PaymentService);
console.log('2. class is defined, no instance exists yet');
const svc = new PaymentService();
console.log('3. first instance created ->', svc.charge());
