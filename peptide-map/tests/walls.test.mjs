// The walls: three of them, four steps to a wall. Windows open one by one and stay until the wall; a tap on a number takes the pinned panel over;
// the cart goes through a wall that opens, stops in front of one that holds, and is shunted off before a wall it could never reach; Pause freezes the debris.
// Run: node tests/walls.test.mjs   (about five minutes: it rides three compounds; needs Chrome and network, see lib.mjs)
import assert from 'node:assert/strict';
import {serve, launch, open} from './lib.mjs';
const {srv, url} = await serve(), browser = await launch();
const S = page => page.evaluate(() => ({...window.ride.state(), clock: window.ride.clock(), name: document.querySelector('#now .nm')?.textContent, tabs: [...document.querySelectorAll('#now .tabs button')].map(b => [b.textContent, b.getAttribute('aria-pressed'), b.disabled])}));
const until = (page, fn, arg) => page.waitForFunction(fn, arg, {timeout: 300000, polling: 'raf'});
const rect = (page, sel) => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return {l: r.left, t: r.top, r: r.right, b: r.bottom} }, sel);
try {
  // ---- geometry: one wall to a lift, 14 units short of its crest, every step opening before its wall, in order
  let {page, ctx, errors} = await open(browser, url, 1200, 800);
  const g = await page.evaluate(() => ({walls: window.ride.WALLS, lifts: window.ride.LIFTS, RV: window.ride.RV}));
  assert.equal(g.walls.length, 3); assert.equal(g.RV.length, 12);
  g.walls.forEach((w, i) => { assert.ok(w.t > g.lifts[i][0] && w.t < g.lifts[i][1], 'wall ' + i + ' stands on its lift'); if (i) assert.ok(w.s > g.walls[i - 1].s); for (let k = 0; k < 4; k++) { const j = i * 4 + k; assert.ok(g.RV[j] < w.s, 'step ' + j + ' opens before its wall'); if (j) assert.ok(g.RV[j] > g.RV[j - 1], 'steps open in order') } });
  console.log('geometry: three walls, twelve steps, in order');

  // ---- BPC-157 goes through all three walls
  await page.evaluate(() => window.ride.start('bpc-157'));
  for (let k = 0; k < 4; k++) { await until(page, k => window.ride.state().shown >= k, k); assert.deepEqual((await S(page)).windows, [0, 1, 2, 3].slice(0, k + 1), 'windows open one by one and stay'); if (k === 1) {
      // a tap on step 1 while step 2 is the newest takes the pinned panel over: step 3 opens without stealing it, and its tab comes alive
      await page.click('#now .tabs [data-i="0"]'); let s = await S(page); assert.equal(s.name, 'Discovery and design'); assert.equal(s.focus, 0);
      await until(page, () => window.ride.state().shown >= 2); s = await S(page); assert.equal(s.focus, 0, 'a manual choice is not taken back inside the wall'); assert.equal(s.tabs[2][2], false, 'the third tab is enabled once its step opens'); k = 2 } }
  await page.click('#now .tabs [data-i="3"]'); assert.equal((await S(page)).name, 'Cleavage and crude product');
  // the four windows: step 1 north-west, step 2 under it (south-west), step 3 north-east, step 4 under it (south-east); the pinned panel sits between the columns
  const [p0, p1, p2, p3, now] = await Promise.all(['#p0', '#p1', '#p2', '#p3', '#now'].map(x => rect(page, x)));
  assert.ok(Math.abs(p0.l - p1.l) < 1 && p1.t >= p0.b - 1, 'south-west under north-west'); assert.ok(Math.abs(p2.l - p3.l) < 1 && p3.t >= p2.b - 1, 'south-east under north-east'); assert.ok(p0.r < now.l && now.r < p2.l, 'the pinned panel sits between the two columns');
  await until(page, () => window.ride.state().walls[0].broken); let s = await S(page); assert.deepEqual(s.windows, [0, 1, 2, 3], 'the windows are still up as the cart goes through');
  // Pause freezes the debris; Resume lets it fall
  await page.evaluate(() => window.ride.pause()); const d1 = await page.evaluate(() => window.ride.debris()[0]); await page.waitForTimeout(900); const d2 = await page.evaluate(() => window.ride.debris()[0]); assert.deepEqual(d1, d2, 'debris moved while paused');
  await page.evaluate(() => window.ride.resume()); await page.waitForTimeout(400); const d3 = await page.evaluate(() => window.ride.debris()[0]); assert.notDeepEqual(d1, d3, 'debris did not move after Resume');
  await until(page, () => window.ride.state().phase === 'run'); assert.deepEqual((await S(page)).windows, [], 'the windows step aside over the crest');
  await until(page, () => window.ride.state().shown >= 4); s = await S(page); assert.deepEqual(s.windows, [4], 'the second wall opens its first window'); assert.equal(s.name, 'Purification'); assert.deepEqual(s.tabs.map(t => t[0]), ['5', '6', '7', '8']);
  await until(page, () => window.ride.state().readout); s = await S(page); assert.deepEqual(s.walls, [{broken: true, held: false}, {broken: true, held: false}, {broken: true, held: false}], 'three walls broken');
  console.log('bpc-157: through all three walls, windows and tabs as designed, debris freezes on Pause');
  assert.deepEqual(errors.filter(e => !/404/.test(e)), []); await ctx.close();

  // ---- ipamorelin: the gate is closed, so the second wall holds and the cart stops in front of it
  ({page, ctx, errors} = await open(browser, url, 375, 812));
  await page.evaluate(() => window.ride.start('ipamorelin')); await until(page, () => window.ride.state().phase === 'stopped'); s = await S(page);
  assert.deepEqual(s.walls, [{broken: true, held: false}, {broken: false, held: true}, {broken: false, held: false}]); assert.deepEqual(s.windows, [4, 5, 6, 7]); assert.equal(s.name, 'The facility');
  await until(page, () => window.ride.state().readout); console.log('ipamorelin (375 px): wall two holds, the cart stops, the standing follows');
  await ctx.close();

  // ---- retatrutide: no lawful route, so the cart is shunted onto the siding before the second wall and the steps it cannot reach light red
  ({page, ctx, errors} = await open(browser, url, 1200, 800));
  await page.evaluate(() => window.ride.start('retatrutide')); await until(page, () => window.ride.state().phase === 'siding'); s = await S(page);
  assert.equal(s.walls[1].broken, false); assert.equal(s.walls[1].held, false); assert.deepEqual(s.windows, [4, 5, 6]); assert.deepEqual(s.lit.slice(7), [true, true, true, true, true], 'the unreachable steps are lit'); assert.equal(s.tabs[3][2], true, 'and their tab stays off');
  await until(page, () => window.ride.state().readout); await page.click('#again'); s = await S(page);
  assert.deepEqual(s.walls, [0, 1, 2].map(() => ({broken: false, held: false})), 'Order another puts the walls back'); assert.ok(s.lit.every(x => !x), 'and the frames go dark'); assert.deepEqual(s.windows, []);
  console.log('retatrutide: shunted onto the siding before wall two; Order another resets the walls');
  assert.deepEqual(errors.filter(e => !/404/.test(e)), []); await ctx.close();
  console.log('walls: all checks passed');
} catch (e) { console.error('FAIL', e.stack || e.message); process.exitCode = 1 } finally { await browser.close(); srv.close() }
