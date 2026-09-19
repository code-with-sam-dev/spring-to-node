"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Types vanish. ENUMS DO NOT. They are the exception that catches people who
 * learned rule one properly.
 */
const strict_1 = __importDefault(require("node:assert/strict"));
var Currency;
(function (Currency) {
    Currency["USD"] = "USD";
    Currency["EUR"] = "EUR";
})(Currency || (Currency = {}));
// A numeric enum emits a REVERSE MAP, which is a real object at runtime.
var Status;
(function (Status) {
    Status[Status["Pending"] = 0] = "Pending";
    Status[Status["Settled"] = 1] = "Settled";
})(Status || (Status = {}));
strict_1.default.equal(typeof Currency, 'object', 'the enum exists at runtime');
strict_1.default.equal(Currency.USD, 'USD');
strict_1.default.equal(Status.Pending, 0);
strict_1.default.equal(Status[0], 'Pending', 'numeric enums are reverse mapped');
console.log('typeof Currency      ->', typeof Currency);
console.log('Status.Pending       ->', Status.Pending);
console.log('Status[0]            ->', Status[0]);
console.log('Object.keys(Status)  ->', Object.keys(Status).join(', '));
