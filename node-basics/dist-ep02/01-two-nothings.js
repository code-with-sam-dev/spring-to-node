"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Java has one nothing. TypeScript has two, and they are not interchangeable.
 *
 * A Java developer reads `undefined` as "null with extra steps". It is not: a
 * missing PROPERTY and a property explicitly SET to null are different states,
 * and the difference reaches your database as a different write.
 */
const strict_1 = __importDefault(require("node:assert/strict"));
const missing = { id: 'pay_1' };
const explicit = { id: 'pay_2', reference: null };
strict_1.default.equal(missing.reference, undefined);
strict_1.default.equal(explicit.reference, null);
// The trap: loose equality says they are the same, strict equality does not.
strict_1.default.ok(missing.reference == explicit.reference, 'loose equality conflates them');
strict_1.default.ok(missing.reference !== explicit.reference, 'strict equality separates them');
// And it survives serialisation asymmetrically, which is where it bites.
strict_1.default.equal(JSON.stringify(missing), '{"id":"pay_1"}');
strict_1.default.equal(JSON.stringify(explicit), '{"id":"pay_2","reference":null}');
// 'in' is the only reliable test for "was the key there at all".
strict_1.default.ok(!('reference' in missing));
strict_1.default.ok('reference' in explicit);
console.log('missing.reference   ->', missing.reference);
console.log('explicit.reference  ->', explicit.reference);
console.log('loose  == says       ->', missing.reference == explicit.reference);
console.log('strict === says      ->', missing.reference === explicit.reference);
console.log('JSON of missing      ->', JSON.stringify(missing));
console.log('JSON of explicit     ->', JSON.stringify(explicit));
