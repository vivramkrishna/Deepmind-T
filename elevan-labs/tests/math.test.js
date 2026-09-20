import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/math.js';
for (const [question, expected] of [['2 + 3 * 4', '14'], ['(2 + 3) * 4', '20'], ['What is 24 times 7?', '168'], ['15% of 200', '30'], ['square root of 81', '9'], ['-3 squared', '-9'], ['2 ^ 3 ^ 2', '512'], ['0.1 + 0.2', '0.3'], ['12 divided by 4', '3']]) {
  test(question, () => assert.equal(calculate(question).answer, expected));
}
for (const invalid of ['1/0', 'sqrt(-1)', 'import("x")', 'a=3', '2 +', '', '9'.repeat(251), 'factorial(100000)', '2;3']) {
  test(`reject ${invalid.slice(0, 25)}`, () => assert.throws(() => calculate(invalid)));
}
