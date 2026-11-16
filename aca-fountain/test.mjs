// node aca-fountain/test.mjs   (the payroll model checks itself when it loads; this adds the figures the page quotes)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const M = createRequire(import.meta.url)('./model.js');

const one = M.single(1400);
assert.equal(one.level, 1400);
assert.ok(Math.abs(one.total - (5831.04 - 7.65)) < 0.02, 'a month of payroll plus the company payroll tax on it, less the employer tax the FSA already saves');
assert.equal(one.dollars.off.fsa, 100); assert.equal(one.dollars.on.fsa, 100);
assert.equal(one.delta.company, 67.1); assert.equal(one.delta.fee, 40); assert.equal(one.delta.reward, 1200); assert.equal(one.delta.plan, 200); assert.equal(one.delta.invoice, 240);
assert.ok(Math.abs(one.delta.bank - 122.42) < 0.02, 'take-home gain at $1,400');
assert.ok(Math.abs(one.delta.taxes - 429.52) < 0.02, 'payroll taxes down at $1,400');
assert.ok(Math.abs(M.single(1600).delta.bank - 93.47) < 0.02, 'take-home gain at $1,600 is the overview figure');
assert.equal(M.single(675).delta.company, 11.64);
assert.equal(M.scenario(7, 80, 9999).level, 1400, 'an unknown tier falls back to the default');

const co = M.scenario(50, 80, 1400);
assert.equal(co.enrolled, 40); assert.equal(co.delta.company, 2684); assert.equal(co.delta.fee, 1600); assert.equal(co.delta.plan, 8000); assert.equal(co.delta.reward, 48000);
console.log('aca-fountain model: ok');
