/**
 * Types vanish. ENUMS DO NOT. They are the exception that catches people who
 * learned rule one properly.
 */
import assert from 'node:assert/strict';

enum Currency { USD = 'USD', EUR = 'EUR' }

// A numeric enum emits a REVERSE MAP, which is a real object at runtime.
enum Status { Pending, Settled }

assert.equal(typeof Currency, 'object', 'the enum exists at runtime');
assert.equal(Currency.USD, 'USD');
assert.equal(Status.Pending, 0);
assert.equal(Status[0], 'Pending', 'numeric enums are reverse mapped');

console.log('typeof Currency      ->', typeof Currency);
console.log('Status.Pending       ->', Status.Pending);
console.log('Status[0]            ->', Status[0]);
console.log('Object.keys(Status)  ->', Object.keys(Status).join(', '));
