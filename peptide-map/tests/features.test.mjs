// The swoop after wall one: the standing picks the experience. Yellow takes a loop (the camera goes over the top and comes back level),
// orange and red go through a tunnel, green runs clear. Each ride is teleported to just before the feature, so this takes about a minute.
// Run: node tests/features.test.mjs   (needs Chrome and network, see lib.mjs)
import assert from 'node:assert/strict';
import {serve, launch, open} from './lib.mjs';
const {srv, url} = await serve(), browser = await launch();
const S = page => page.evaluate(() => ({...window.ride.state(), clock: window.ride.clock(), up: window.ride.camUp()}));
const until = (page, fn, arg) => page.waitForFunction(fn, arg, {timeout: 120000, polling: 'raf'});
async function toSwoop(page, id, metresBefore) {   // past the doors, then to just short of the loop's lead-in
  await page.evaluate(i => window.ride.start(i), id); await page.click('#boardNow'); await until(page, () => window.ride.state().phase === 'lift');
  await page.evaluate(m => { const r = window.ride; r.jump(r.sToT(r.FS.b0 - m), 'run') }, metresBefore);
}
try {
  const {page, ctx, errors} = await open(browser, url, 1200, 800);
  // the rule is the standing's colour, with no exceptions
  const cards = await page.evaluate(() => JSON.parse(document.getElementById('data').textContent).cards), want = {yellow: 'loop', orange: 'tunnel', red: 'tunnel', green: null};
  for (const c of cards) assert.equal(c.feature ?? null, want[c.standing], c.id + ' is ' + c.standing);
  const n = f => cards.filter(c => (c.feature ?? null) === f).length; console.log('features: loop', n('loop'), 'tunnel', n('tunnel'), 'clear', n(null), 'of', cards.length);
  // what is in the scene for each kind
  await page.evaluate(() => window.ride.start('semaglutide')); let s = await S(page); assert.deepEqual([s.tunnel, s.loop, s.railB], [false, false, true], 'green: a clear run');
  await page.evaluate(() => window.ride.start('m-selank')); s = await S(page); assert.deepEqual([s.tunnel, s.loop, s.railB], [true, false, true], 'orange: the tunnel');
  await page.evaluate(() => window.ride.start('ipamorelin')); s = await S(page); assert.deepEqual([s.tunnel, s.loop, s.railB], [false, true, false], 'yellow: the loop, and the stretch of main line it replaces is hidden');

  // a loop ride: over the top and level again, Pause freezes it, and the cart is back on the main line afterwards
  await toSwoop(page, 'ipamorelin', 26); await until(page, () => window.ride.state().on === 'loop');
  let minUp = 9, froze = false, prev = -1;
  for (;;) { s = await S(page); if (s.on !== 'loop') break; assert.ok(s.up.every(Number.isFinite), 'the camera frame stays finite'); minUp = Math.min(minUp, s.up[1]);
    if (!froze && s.up[1] < -0.5) { froze = true; await page.evaluate(() => window.ride.pause()); const a = await S(page); await page.waitForTimeout(700); const b = await S(page); assert.deepEqual([a.t, a.clock, a.up], [b.t, b.clock, b.up], 'Pause freezes the loop'); await page.evaluate(() => window.ride.resume()) }
    await page.waitForTimeout(60) }
  assert.ok(minUp < -0.9, 'upside down at the top: up.y ' + minUp); assert.ok(froze, 'paused while upside down');
  s = await S(page); assert.equal(s.on, 'main'); assert.ok(s.up[1] > 0.7, 'level again on the main line: up.y ' + s.up[1]); assert.equal(s.railB, false);
  await until(page, () => !window.ride.state().fx); await until(page, () => window.ride.state().phase === 'lift'); console.log('loop: over the top (up.y ' + minUp.toFixed(2) + '), level again, Pause freezes it, back on the main line, then lift two');
  assert.deepEqual(errors.filter(e => !/404/.test(e)), []); await ctx.close();

  // a tunnel ride: the caption comes and goes, the camera stays upright, and the tunnel is there for the whole of it
  const t = await open(browser, url, 375, 812); await toSwoop(t.page, 'm-selank', 26); let seenFx = false, tunnelOn = true;
  for (;;) { s = await S(t.page); seenFx ||= s.fx; tunnelOn &&= s.tunnel; assert.ok(s.up[1] > 0.5, 'upright in the tunnel: up.y ' + s.up[1]); if (seenFx && !s.fx) break; await t.page.waitForTimeout(60) }
  assert.ok(seenFx && tunnelOn); assert.equal((await S(t.page)).on, 'main'); console.log('tunnel (375 px): caption on and off, upright all the way through');
  assert.deepEqual(t.errors.filter(e => !/404/.test(e)), []); await t.ctx.close();
  console.log('features: all checks passed');
} catch (e) { console.error('FAIL', e.stack || e.message); process.exitCode = 1 } finally { await browser.close(); srv.close() }
