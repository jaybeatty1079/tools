// node coin-drop/test.mjs   (the payroll model checks itself when it loads; this adds the figures the page quotes)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const M = createRequire(import.meta.url)('./model.js');

const one = M.single();
assert.equal(one.n, 358, 'one paycheck at $10 a coin'); // the Section 125 tray (120 coins) sets the limit
assert.deepEqual(one.coins.off, { taxes: 87, health: 16, k401: 3, pulse: 0, fee: 0, company: 0, bank: 252 });
assert.deepEqual(one.coins.on, { taxes: 49, health: 16, k401: 3, pulse: 120, fee: 4, company: 6, bank: 160 });
assert.equal(one.after.rewardCoins, 100); assert.equal(one.after.planCoins, 20);
assert.equal(one.delta.company, 56.8); assert.equal(one.delta.fee, 35); assert.equal(one.delta.reward, 1000); assert.equal(one.delta.plan, 200);
assert.ok(Math.abs(one.delta.bank - 88.27) < 0.01, 'take-home gain'); // $40,000 single 0/0, $160 health, 1% 401(k), 2026 tables
assert.ok(Math.abs(one.after.bank - 2604.29) < 0.01, 'take-home with the reward');

const co = M.scenario(50, 80);
assert.equal(co.enrolled, 40); assert.equal(co.coin, 400); assert.equal(co.delta.company, 2272); assert.equal(co.delta.fee, 1400);
assert.equal(co.delta.plan, 8000); assert.equal(co.delta.reward, 40000);
console.log('coin-drop model: ok');

// The offline worker's precache list must name files that exist, or the install fails and the tool never goes offline.
import { readFileSync, existsSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const files = [...readFileSync(new URL('sw.js', here), 'utf8').match(/FILES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1].split('?')[0]);
for (const f of files) assert.ok(existsSync(new URL(f, here)), `sw.js precaches a missing file: ${f}`);
const man = JSON.parse(readFileSync(new URL('manifest.webmanifest', here), 'utf8'));
for (const i of man.icons) assert.ok(existsSync(new URL(i.src, here)), `manifest icon missing: ${i.src}`);
assert.ok(!/pulse|aca/i.test(man.name + man.short_name), 'no brand name on the home screen label');
console.log('offline files: ok');
