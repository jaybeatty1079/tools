// node coin-drop/test.mjs   (the payroll model checks itself when it loads; this adds the figures the page quotes)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const M = createRequire(import.meta.url)('./model.js');

const one = M.single();
assert.equal(one.n, 576, 'one paycheck is a full drop of 576 coins');
assert.deepEqual(one.coins.off, { taxes: 132, health: 75, k401: 16, pulse: 0, fee: 0, company: 0, bank: 353 });
assert.deepEqual(one.coins.on, { taxes: 95, health: 75, k401: 16, pulse: 120, fee: 3, company: 6, bank: 261 });
assert.equal(one.after.rewardCoins, 100); assert.equal(one.after.planCoins, 20);
assert.equal(one.delta.company, 56.8); assert.equal(one.delta.fee, 35); assert.equal(one.delta.reward, 1000); assert.equal(one.delta.plan, 200);
assert.ok(Math.abs(one.delta.bank - 79.25) < 0.01, 'take-home gain');
assert.ok(Math.abs(one.after.bank - 3605.33) < 0.01, 'take-home with the reward');

const co = M.scenario(50, 80);
assert.equal(co.enrolled, 40); assert.equal(co.coin, 500); assert.equal(co.delta.company, 2272); assert.equal(co.delta.fee, 1400);
assert.equal(co.delta.plan, 8000); assert.equal(co.delta.reward, 40000);
console.log('coin-drop model: ok');
