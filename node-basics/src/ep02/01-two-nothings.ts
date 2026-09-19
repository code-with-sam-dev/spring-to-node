/**
 * Java has one nothing. TypeScript has two, and they are not interchangeable.
 *
 * A Java developer reads `undefined` as "null with extra steps". It is not: a
 * missing PROPERTY and a property explicitly SET to null are different states,
 * and the difference reaches your database as a different write.
 */
import assert from 'node:assert/strict';

type Payment = {id: string; reference?: string | null};

const missing: Payment = {id: 'pay_1'};
const explicit: Payment = {id: 'pay_2', reference: null};

assert.equal(missing.reference, undefined);
assert.equal(explicit.reference, null);

// The trap: loose equality says they are the same, strict equality does not.
assert.ok(missing.reference == explicit.reference, 'loose equality conflates them');
assert.ok(missing.reference !== explicit.reference, 'strict equality separates them');

// And it survives serialisation asymmetrically, which is where it bites.
assert.equal(JSON.stringify(missing), '{"id":"pay_1"}');
assert.equal(JSON.stringify(explicit), '{"id":"pay_2","reference":null}');

// 'in' is the only reliable test for "was the key there at all".
assert.ok(!('reference' in missing));
assert.ok('reference' in explicit);

console.log('missing.reference   ->', missing.reference);
console.log('explicit.reference  ->', explicit.reference);
console.log('loose  == says       ->', missing.reference == explicit.reference);
console.log('strict === says      ->', missing.reference === explicit.reference);
console.log('JSON of missing      ->', JSON.stringify(missing));
console.log('JSON of explicit     ->', JSON.stringify(explicit));
