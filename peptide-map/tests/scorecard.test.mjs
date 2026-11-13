// The scorecard, rendered: the ruling in big letters at the top right (stacked above the name on a phone), two tests each with a ladder and their sources,
// what could change, and the watch list on the counter. Text big enough and in contrast, every link safe, no sideways scroll.
// Run: node tests/scorecard.test.mjs   (about a minute; needs Chrome and network, see lib.mjs)
import assert from 'node:assert/strict';
import {serve, launch, open} from './lib.mjs';
const {srv, url} = await serve(), browser = await launch();
const WANT = {'bpc-157': 'JURY STILL OUT', ipamorelin: 'FAIL', semaglutide: 'PASS', 'm-selank': 'FAIL', retatrutide: 'FAIL'};
function inPage() {   // runs in the page: measurements, no judgement
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)], r = e => { const b = e.getBoundingClientRect(); return {l: b.left, t: b.top, r: b.right, b: b.bottom} };
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2] };
  const ratio = (fg, bg) => { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  const stamp = q('.stamp'), sc = q('.sc'), name = q('.sc h2');
  return {word: q('.stamp b').textContent, stamp: r(stamp), plate: r(sc), name: r(name), stage: r(q('#stage')), scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    stampRatio: ratio(getComputedStyle(q('.stamp b')).color, getComputedStyle(stamp).backgroundColor), chipRatios: all('.t .st').map(e => ratio(getComputedStyle(e).color, getComputedStyle(e).backgroundColor)),
    tests: all('.sc .t').map(e => ({links: e.querySelectorAll('.src a').length, nf: e.querySelectorAll('.src .nf').length, ladder: e.querySelectorAll('.ladder i').length, on: e.querySelectorAll('.ladder i.on').length, p: parseFloat(getComputedStyle(e.querySelector('p')).fontSize), right: r(e).r})),
    badLinks: all('.sc a, .record a').filter(a => !/^https:\/\//.test(a.getAttribute('href')) || a.target !== '_blank' || !/noopener/.test(a.rel)).length,
    next: all('.nx li').map(e => e.querySelector('.when').textContent), nfrow: !!q('.nfrow'), how: q('.how p').textContent.length, record: !!q('.record .grid3'), overflowing: all('.sc *').filter(e => r(e).r > innerWidth + 1).length};
}
try {
  for (const [w, h] of [[1200, 800], [375, 812]]) for (const [id, word] of Object.entries(WANT)) {
    const {page, ctx, errors} = await open(browser, url, w, h); await page.evaluate(i => window.ride.start(i, true), id); await page.waitForFunction(() => window.ride.state().readout, null, {timeout: 30000}); await page.waitForTimeout(1500);
    const m = await page.evaluate(inPage), tag = id + ' @' + w;
    assert.equal(m.word, word, tag + ': the ruling');
    if (w > 700) { assert.ok(m.stamp.r > m.plate.r - 30 && m.stamp.t < m.name.b, tag + ': the stamp sits at the top right'); assert.ok(m.stamp.b < m.stage.b, tag + ': the ruling is on the first screen') }
    else assert.ok(m.stamp.b <= m.name.t + 2, tag + ': on a phone the stamp stacks above the name');
    assert.equal(m.tests.length, 2, tag + ': two tests'); for (const t of m.tests) { assert.ok(t.links + t.nf >= 1, tag + ': a test row has a source or says Not found'); assert.ok(t.ladder >= 3 && t.on === 1, tag + ': a ladder with one rung lit'); assert.ok(t.p >= 16, tag + ': the row text is ' + t.p + 'px'); assert.ok(t.right <= m.innerW + 1, tag + ': a row runs off the screen') }
    assert.ok(m.stampRatio >= 4.5 && m.chipRatios.every(x => x >= 4.5), tag + ': contrast ' + [m.stampRatio, ...m.chipRatios].map(x => x.toFixed(1)));
    assert.ok(m.scrollW <= m.innerW + 1, tag + ': page scrolls sideways'); assert.equal(m.overflowing, 0, tag + ': something in the scorecard is wider than the screen'); assert.equal(m.badLinks, 0, tag + ': every link is https, opens in a new tab with noopener');
    assert.ok(m.record && m.how > 200, tag + ': the record and the rule are there');
    if (id === 'bpc-157') assert.ok(m.next.includes('2026-11-13') && m.next.length === 3, tag + ': the upcoming items ' + m.next); else if (id === 'ipamorelin') assert.ok(m.nfrow, tag + ': nothing ahead says Not found');
    assert.deepEqual(errors.filter(e => !/404/.test(e)), []); await ctx.close(); console.log('ok  ', tag, word);
  }
  // the watch list sits under the menus on the counter
  const {page, ctx} = await open(browser, url, 1200, 800); const wl = await page.evaluate(() => [...document.querySelectorAll('.watch li')].map(e => [e.querySelector('b').textContent, e.querySelector('a').href]));
  const lines = await page.evaluate(() => JSON.parse(document.getElementById('data').textContent).cards.map(c => [c.id, window.ride.lead(c)]));   // the line under every name says each fact once
  for (const [id, t] of lines) { const w = t.toLowerCase().match(/[\w'-]+/g), seen = new Set(); for (let i = 0; i + 2 < w.length; i++) { const g = w.slice(i, i + 3).join(' '); assert.ok(!seen.has(g), id + ': the line under the name repeats "' + g + '": ' + t); seen.add(g) } } console.log('ok   the line under every name says each fact once,', lines.length, 'cards');
  assert.equal(wl.length, 3); assert.ok(wl.every(([, u]) => u.startsWith('https://clinicaltrials.gov/')), 'each watch name links its registry record'); await ctx.close(); console.log('ok   watch list:', wl.map(x => x[0]).join(', '));
  console.log('scorecard: all checks passed');
} catch (e) { console.error('FAIL', e.stack || e.message); process.exitCode = 1 } finally { await browser.close(); srv.close() }
