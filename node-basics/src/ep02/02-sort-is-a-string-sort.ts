/**
 * Array.sort() with no comparator sorts as STRINGS. Every time.
 *
 * Collections.sort on a List<Integer> does what you mean. This does not, and
 * it does not throw: it returns a wrong order that looks plausible until the
 * numbers cross a digit boundary.
 */
import assert from 'node:assert/strict';

const amounts = [10, 9, 100, 1];

const naive = [...amounts].sort();
assert.deepEqual(naive, [1, 10, 100, 9], 'the default sort is lexicographic');

const correct = [...amounts].sort((a, b) => a - b);
assert.deepEqual(correct, [1, 9, 10, 100]);

console.log('input                ->', amounts.join(', '));
console.log('sort()               ->', naive.join(', '), '  <- wrong, and silent');
console.log('sort((a,b) => a - b) ->', correct.join(', '));
