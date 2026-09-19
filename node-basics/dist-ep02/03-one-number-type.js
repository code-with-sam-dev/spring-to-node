"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * There is one number type and it is a double. No int, no long, no BigDecimal.
 *
 * This is the single most expensive difference for anyone writing payments.
 */
const strict_1 = __importDefault(require("node:assert/strict"));
// 1. The classic, and it is the same in Java's double. Shown because a Java
//    developer reaches for BigDecimal here and there is no such default.
strict_1.default.notEqual(0.1 + 0.2, 0.3);
strict_1.default.equal(0.1 + 0.2, 0.30000000000000004);
// 2. Integers stop being exact above 2^53. A Java long does not.
const maxSafe = Number.MAX_SAFE_INTEGER;
strict_1.default.equal(maxSafe, 9007199254740991);
strict_1.default.equal(maxSafe + 1, maxSafe + 2, 'past 2^53 two different values compare equal');
// 3. Which is why a bigint column comes back as a STRING from the driver.
const fromDatabase = '9007199254740993';
strict_1.default.notEqual(Number(fromDatabase).toString(), fromDatabase, 'Number() loses it');
strict_1.default.equal(BigInt(fromDatabase).toString(), fromDatabase, 'BigInt keeps it');
console.log('0.1 + 0.2            ->', 0.1 + 0.2);
console.log('MAX_SAFE_INTEGER     ->', maxSafe);
console.log('maxSafe+1 === +2     ->', maxSafe + 1 === maxSafe + 2, ' <- both', maxSafe + 1);
console.log('Number("9007199254740993") ->', Number(fromDatabase));
console.log('BigInt("9007199254740993") ->', BigInt(fromDatabase).toString());
