// Every ride ends in Mount Evidence. A ride that runs the whole track goes through the doorway; one that stopped at a wall, or on the siding, is taken to court:
// a cut to the top of the last stretch. Either way the banner comes up, lights, and the ruling follows. Each ride is teleported near its end, so this takes a few minutes.
// Run: node tests/court.test.mjs   (needs Chrome and network, see lib.mjs)
import assert from 'node:assert/strict';
import {serve, launch, open} from './lib.mjs';
const {srv, url} = await serve(), browser = await launch();
const S = page => page.evaluate(() => ({...window.ride.state(), pos: window.ride.camPos()}));
const until = (page, fn, arg) => page.waitForFunction(fn, arg, {timeout: 240000, polling: 'raf'});
const board = async (page, id) => { await page.evaluate(i => window.ride.start(i), id); await page.click('#boardNow'); await until(page, () => window.ride.state().phase === 'lift') };
try {
  const {page, ctx, errors} = await open(browser, url, 1200, 800);
  const geo = await page.evaluate(() => { const r = window.ride; return {CT: r.CT, crest: r.tToS(r.crestT), p: r.MAIN.getPointAt(r.sToT(r.CT.door)).toArray(), e: r.MAIN.getPointAt(r.sToT(r.CT.end - .01)).toArray()} });
  assert.ok(geo.crest < geo.CT.cut && geo.CT.cut < geo.CT.door && geo.CT.door < geo.CT.end, 'the last stretch runs: crest, cut, doorway, end'); assert.ok(geo.p[2] > 39 && geo.p[2] < 42 && geo.e[2] > 80, 'the doorway is at z 40 and the track ends deeper in');
  console.log('geometry: crest, cut point, doorway, end, in that order');

  // 1. a ride that runs the whole track (a green compound, from just before the cut): through the doorway, banner on, banner lit, ruling
  await board(page, 'semaglutide'); await page.evaluate(() => { const r = window.ride; r.jump(r.sToT(r.CT.cut - 20), 'run') });
  await until(page, () => window.ride.state().court); let s = await S(page); assert.equal(s.verdict, ''); assert.equal(s.finale, false);
  await until(page, () => window.ride.state().finale); s = await S(page); assert.ok(s.pos[2] > 38, 'the doorway is behind the cart when the banner comes up: z ' + s.pos[2]); assert.match(s.verdict, /on/);
  await until(page, () => /lit/.test(window.ride.state().verdict)); await until(page, () => window.ride.state().readout); s = await S(page); assert.ok(s.pos[2] > 60, 'the cart is inside the mountain when the ruling comes up: z ' + s.pos[2]);
  console.log('semaglutide: whole track, doorway, banner lit, ruling');

  // 2. a closed gate (ipamorelin): the second wall holds, then it is taken to court from the cut point
  await board(page, 'ipamorelin'); await page.evaluate(() => { const r = window.ride; r.jump(r.sToT(r.WALLS[1].s - 40), 'lift') });
  await until(page, () => window.ride.state().phase === 'stopped'); s = await S(page); assert.equal(s.walls[1].held, true); assert.equal(s.court, false);
  await until(page, () => window.ride.state().court); s = await S(page); assert.equal(s.on, 'main'); assert.ok(s.pos[2] < -60 && s.pos[0] < -70 && s.pos[0] > -90, 'the cut puts it on the last stretch, high up: ' + s.pos.map(Math.round));
  await until(page, () => window.ride.state().finale); await until(page, () => /lit/.test(window.ride.state().verdict)); await until(page, () => window.ride.state().readout);
  console.log('ipamorelin: wall holds, taken to court, banner lit, ruling');
  assert.deepEqual(errors.filter(e => !/404/.test(e)), []); await ctx.close();

  // 3. no lawful route (retatrutide), at phone width: shunted onto the siding, then taken to court
  const p = await open(browser, url, 375, 812); await board(p.page, 'retatrutide'); await p.page.evaluate(() => { const r = window.ride; r.jump(r.sToT(r.RV[6] - 12), 'lift') });
  await until(p.page, () => window.ride.state().phase === 'siding'); await until(p.page, () => window.ride.state().court); s = await S(p.page); assert.equal(s.on, 'main');
  await until(p.page, () => /lit/.test(window.ride.state().verdict)); await until(p.page, () => window.ride.state().readout);
  console.log('retatrutide (375 px): siding, taken to court, banner lit, ruling');
  assert.deepEqual(p.errors.filter(e => !/404/.test(e)), []); await p.ctx.close();
  console.log('court: all checks passed');
} catch (e) { console.error('FAIL', e.stack || e.message); process.exitCode = 1 } finally { await browser.close(); srv.close() }
