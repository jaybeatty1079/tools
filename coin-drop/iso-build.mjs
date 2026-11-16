// The coin drop's bench model: the same month of payroll as a conveyor on a bench, built once with the anatomy kit.
// node coin-drop/iso-build.mjs  ->  iso.js (the figure, its parts, and precomputed coin heaps and poses) and iso.css.
// Plain payroll is a plain bench: a hopper, a belt, three diverter arms with their bins, and the cart in front. Switching
// the plan on fits the fourth arm and the Section 125 bin, the weighbridge at the belt's end, the reward hopper on its
// mast with the chute to the cart, the return belt with the company's cup and the fee cup, and the Plan $ cup. The page
// shows each bin's heap at the level the coin drop reports, runs the belt while coins fall, and tips the bridge.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '/Users/jaybeatty/.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 600, H = 390, LEVELS = 11;
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (P, points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const PLATE = { x: -168, y: -98, w: 336, d: 196, r: 8 };
const HOPPER = { x: -136, y: -60, r: 16, z: 10, h: 40 };
const BELT = { x: -120, y: -30, w: 240, d: 20, r: 2, z: 14, h: 4 };
const ARMS = { taxes: -84, health: -34, k401: 16, s125: 66 };
const BIN = (x) => ({ x: x - 4, y: 0, w: 36, d: 28, r: 2 });
const BRIDGE = { x: 100, y: 0, w: 40, d: 30, r: 2 };
const RHOP = { x: 124, y: -56, r: 10, z: 30, h: 22 };
const CART = { x: -70, y: 48, w: 120, d: 34, r: 2 };
const CUPS = { company: { x: -150, y: 30, r: 7 }, fee: { x: -150, y: 70, r: 7 }, plan: { x: 92, y: 56, r: 7 } };
const CUP_H = 30;
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [HOPPER.x, HOPPER.y, 62], [RHOP.x, RHOP.y, 56], [CART.x + CART.w, CART.y + CART.d, 40]], W, H, { pad: 24, azimuth: 40, elevation: 33 });

/* ---------- parts ---------- */
const part = (id, html) => `<g data-part="${id}">${html}</g>`;
const plan = (html) => `<g class="plan-part">${html}</g>`;
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -15, 10, P)}"/>`];
  for (const [x, y] of byDepth(P, k.corners(PLATE, 22))) { out.push(S(k.cylinder(x, y, 7, -15, 1.6, P, 28), { tone: 'lo' })); out.push(S(k.cylinder(x, y, 5.4, -13.4, 3.4, P, 28), { tone: 'mid' })); }
  out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5 }));
  const strip = { x: PLATE.x + 18, y: PLATE.y + PLATE.d - 13, w: PLATE.w - 36, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.4], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(tag({ x: PLATE.x + PLATE.w - 58, y: PLATE.y + 8, w: 46, d: 14, r: 1 }, 0));
  return out.join('');
}
const tag = (t, z) => S(k.slabOf(t, z, 0.8, P, 3), { tone: 'lo', crease: 'none' }) + [0, 1, 2].map((i) => L(k.onTop([[t.x + 3, t.y + 3.5 + i * 3.2], [t.x + t.w - 3 - (i === 2 ? t.w * 0.3 : 0), t.y + 3.5 + i * 3.2]], z + 0.8, P), { tone: 'faint', free: i === 2 ? 'end' : undefined })).join('') + D([k.iso([t.x + 1.6, t.y + 1.6, z + 0.8], P), k.iso([t.x + t.w - 1.6, t.y + 1.6, z + 0.8], P), k.iso([t.x + 1.6, t.y + t.d - 1.6, z + 0.8], P), k.iso([t.x + t.w - 1.6, t.y + t.d - 1.6, z + 0.8], P)], { size: 0.4 });
const post = (x, y, z0, z1, r = 1.8) => S(k.cylinder(x, y, r, z0, z1 - z0, P, 14), { tone: 'lo', crease: 'none' });
const box = (plan, z, h, tone = 'mid', bevel = 0.5) => S(k.slabOf(plan, z, h, P, 3, bevel), { tone }) + L(k.planOutline(k.insetPlan(plan, 2), z + h, P, 3), { tone: 'faint' });
function coins(x, y, z, n, r = 3.2, t = 1.1, cls = 'coin') { let out = ''; for (let i = 0; i < n; i++) out += S(k.cylinder(x + ((i * 7) % 3 - 1) * 0.3, y + ((i * 5) % 3 - 1) * 0.3, r, z + i * t, t, P, 12), { tone: 'hi', crease: 'none', className: cls }); return out; }
// A heap over a rectangle at a fill level 0..1: stacks in a grid, the tallest in the middle, up to `max` coins high.
function heap(plan, z, level, max, cls = 'coin', r = 3.2) {
  if (level <= 0.01) return '';
  const cols = Math.max(2, Math.floor((plan.w - 6) / 12)), rows = Math.max(1, Math.floor((plan.d - 6) / 12)), pw = (plan.w - 6) / cols, pd = (plan.d - 6) / rows;
  let out = '';
  // painter's order: back row first, right to left within a row reads fine at this camera
  for (let j = 0; j < rows; j++) for (let i = cols - 1; i >= 0; i--) {
    const cx = (i + 0.5) / cols - 0.5, cy = (j + 0.5) / rows - 0.5, dome = 1 - 0.55 * Math.hypot(cx * 1.4, cy * 1.4);
    const n = Math.round(level * max * dome + (level > 0.1 ? 0.3 : 0));
    if (n > 0) out += coins(plan.x + 3 + pw * (i + 0.5), plan.y + 3 + pd * (j + 0.5), z, n, r, 1.1, cls);
  }
  return out;
}
function hopper(T) {
  const ped = { x: T.x - T.r - 4, y: T.y - T.r - 4, w: T.r * 2 + 8, d: T.r * 2 + 8, r: 3 };
  return S(k.slabOf(ped, 0, T.z, P, 5, 0.8), { tone: 'lo' }) + L(k.planOutline(k.insetPlan(ped, 3), T.z, P, 4), { tone: 'faint' }) + D(k.corners(ped, 3).map(([x, y]) => k.iso([x, y, T.z], P)), { size: 0.45 })
    + S(k.cylinder(T.x, T.y, T.r, T.z, T.h, P, 56, 0.8), { tone: 'mid', crease: 'lo', inner: [0.35, 0.7].map((f) => `<path class="iso-line" data-tone="lo" d="${k.sideArc(T.x, T.y, T.r, T.z + T.h * f, P, 32)}"/>`).join('') })
    + S(k.cylinder(T.x, T.y, T.r - 1.2, T.z + T.h, 3, P, 56), { tone: 'hi' }) + L(k.knurl(T.x, T.y, T.r - 1.2, T.z + T.h, T.z + T.h + 3, 36, P), { tone: 'lo' }) + L(k.ring(T.x, T.y, T.r - 5, T.z + T.h + 3, P, 40), { tone: 'faint' });
}
function cup(c, h) {
  const back = S(k.cylinder(c.x, c.y, c.r + 1.2, 0, 1.4, P, 28), { tone: 'lo' }) + S(k.cylinder(c.x, c.y, c.r, 1.4, h, P, 28, 0.4), { tone: 'mid', crease: 'none' });
  const front = L(k.ring(c.x, c.y, c.r, 1.4 + h, P, 28), { tone: 'hi' }) + L(k.ring(c.x, c.y, c.r, 1.4 + h - 2, P, 28), { tone: 'faint' });
  return { back, front };
}
const cupCoins = (c, level, cls) => coins(c.x, c.y, 2, Math.round(level * 14), c.r - 1.6, 1.6, cls);
// A spring: a short cylinder with a knurl as its coils.
const spring = (x, y, z0, z1) => S(k.cylinder(x, y, 2.6, z0, z1 - z0, P, 12), { tone: 'lo', crease: 'none' }) + L(k.knurl(x, y, 2.6, z0 + 1, z1 - 1, 12, P, 0.2), { tone: 'lo' });

/* ---------- assemble, back to front ---------- */
const parts = [plate()], slots = {};
// the return belt behind the bins, from the tax arm back to the hopper, with the company's cup and the fee cup (plan on)
{
  const ret = [box({ x: -132, y: -8, w: 46, d: 8, r: 1 }, 20, 3, 'lo', 0.2)];
  for (const x of [-128, -90]) ret.push(S(k.cylinder(x, -4, 3, 17, 4, P, 20), { tone: 'mid' }));
  ret.push(post(-110, -4, 0, 17, 1.4));
  ret.push(box({ x: -158, y: 10, w: 8, d: 54, r: 1 }, 14, 3, 'lo', 0.2)); // the chute down to the cups
  ret.push(box({ x: -158, y: -8, w: 26, d: 8, r: 1 }, 18, 3, 'lo', 0.2));
  ret.push(tag({ x: -146, y: 46, w: 14, d: 7, r: 0.8 }, 0));
  const cc = cup(CUPS.company, CUP_H), fc = cup(CUPS.fee, CUP_H);
  parts.push(plan(part('return', ret.join('') + cc.back)), `<g data-coins="company" data-part="return"></g>`, plan(part('return', cc.front + fc.back)), `<g data-coins="fee" data-part="return"></g>`, plan(part('return', fc.front)));
  slots.company = Array.from({ length: LEVELS }, (_, i) => cupCoins(CUPS.company, i / (LEVELS - 1), 'coin lime'));
  slots.fee = Array.from({ length: LEVELS }, (_, i) => cupCoins(CUPS.fee, i / (LEVELS - 1), 'coin lime'));
}
// the hopper with payroll in it, and its chute onto the belt
parts.push(part('hopper', hopper(HOPPER) + coins(HOPPER.x, HOPPER.y, HOPPER.z + HOPPER.h + 3, 3, HOPPER.r - 6, 1.2) + S(k.slabOf({ x: HOPPER.x - 4, y: HOPPER.y + HOPPER.r, w: 8, d: BELT.y - HOPPER.y - HOPPER.r + 4, r: 1 }, BELT.z + 10, 4, P, 2), { tone: 'mid', crease: 'none' })));
// the reward hopper on its mast at the back right, its lid and the chute to the cart (plan on)
{
  const r = [post(RHOP.x, RHOP.y, 0, RHOP.z, 2.6), S(k.cylinder(RHOP.x, RHOP.y, RHOP.r, RHOP.z, RHOP.h, P, 32, 0.6), { tone: 'hi', crease: 'lo' })];
  r.push(L(k.ring(RHOP.x, RHOP.y, RHOP.r - 3, RHOP.z + RHOP.h, P, 32), { tone: 'lo' }), coins(RHOP.x, RHOP.y, RHOP.z + RHOP.h, 2, RHOP.r - 4, 1.2, 'coin blue'));
  r.push(tag({ x: RHOP.x - 7, y: RHOP.y + 14, w: 14, d: 7, r: 0.8 }, 0));
  // the chute: from under the hopper, forward past the bridge, then across to the cart's right end, on two posts
  r.push(box({ x: RHOP.x - 3, y: RHOP.y + RHOP.r, w: 6, d: 40, r: 1 }, 26, 4, 'hi', 0.3));
  r.push(box({ x: CART.x + CART.w - 6, y: -6, w: RHOP.x + 3 - (CART.x + CART.w - 6), d: 6, r: 1 }, 26, 4, 'hi', 0.3));
  r.push(box({ x: CART.x + CART.w - 6, y: -6, w: 6, d: CART.y + 6 - (-6), r: 1 }, 26, 4, 'hi', 0.3));
  r.push(post(RHOP.x, -20, 0, 26), post(CART.x + CART.w - 3, 20, 0, 26), post(CART.x + CART.w - 3, 44, 0, 26));
  parts.push(plan(part('trigger', r.join(''))));
}
// the belt on its rollers and legs
{
  const b = [];
  for (const x of [-110, 110]) b.push(S(k.cylinder(x, BELT.y + BELT.d / 2, 6, BELT.z - 4, 6, P, 24), { tone: 'mid' }), L(k.knurl(x, BELT.y + BELT.d / 2, 6, BELT.z - 3, BELT.z + 1, 24, P, 0.3), { tone: 'lo' }));
  for (const x of [-80, -20, 40, 100]) b.push(post(x, BELT.y + 4, 0, BELT.z), post(x, BELT.y + BELT.d - 4, 0, BELT.z));
  b.push(box(BELT, BELT.z, BELT.h, 'lo', 0.3));
  b.push(L(k.onTop([[BELT.x + 4, BELT.y + BELT.d / 2], [BELT.x + BELT.w - 4, BELT.y + BELT.d / 2]], BELT.z + BELT.h + 0.1, P), { tone: 'faint' }));
  parts.push(part('belt', b.join('')));
  parts.push(`<g data-move="belt" data-part="belt"></g>`);
  // coins riding the belt: still when idle, a different spread when running
  slots.belt = [0, 1].map((state) => state ? Array.from({ length: 12 }, (_, i) => coins(BELT.x + 12 + i * 19, BELT.y + BELT.d / 2 + ((i % 3) - 1) * 3.5, BELT.z + BELT.h, 1, 3.2)).join('') : '');
}
// the diverter arms and their bins; the fourth is the plan's
for (const key of ['taxes', 'health', 'k401', 's125']) {
  const x = ARMS[key], isPlan = key === 's125', wrap = isPlan ? plan : (h) => h;
  const arm = [post(x, BELT.y - 4, 0, 30, 2), S(k.cylinder(x, BELT.y - 4, 3.2, 30, 2, P, 14), { tone: 'mid', crease: 'none' })];
  arm.push(S(k.extrude([[x - 1.5, BELT.y - 4], [x + 1.5, BELT.y - 4], [x + 22, BELT.y + BELT.d + 6], [x + 19, BELT.y + BELT.d + 6]], 24, 3, P, { convex: true }), { tone: isPlan ? 'hi' : 'mid', crease: 'none', lit: isPlan }));
  const bin = BIN(x);
  parts.push(wrap(part(key, arm.join('') + box(bin, 0, 16, 'lo'))));
  parts.push(`<g data-coins="${key}" data-part="${key}"></g>`);
  parts.push(wrap(part(key, L(k.planOutline(bin, 16, P, 3), { tone: 'mid' }))));
  slots[key] = Array.from({ length: LEVELS }, (_, i) => heap(bin, 16, i / (LEVELS - 1), key === 'k401' ? 2 : key === 'health' ? 3 : 5, isPlan ? 'coin blue' : 'coin'));
}
// the Plan $ cup beside the Section 125 bin, fed by a small chute (plan on)
{
  const pc = cup(CUPS.plan, CUP_H);
  parts.push(plan(part('plan', box({ x: 80, y: 28, w: 6, d: 22, r: 1 }, 12, 3, 'lo', 0.2) + pc.back)), `<g data-coins="plan" data-part="plan"></g>`, plan(part('plan', pc.front)));
  slots.plan = Array.from({ length: LEVELS }, (_, i) => cupCoins(CUPS.plan, i / (LEVELS - 1), 'coin blue'));
}
// the weighbridge at the belt's end, on four springs (plan on): level, and tipped when the last coin lands
{
  const w = [];
  for (const [x, y] of k.corners(BRIDGE, 6)) w.push(spring(x, y, 0, 8));
  w.push(tag({ x: BRIDGE.x + 12, y: BRIDGE.y + BRIDGE.d + 4, w: 16, d: 7, r: 0.8 }, 0));
  parts.push(plan(part('trigger', w.join(''))));
  parts.push(`<g data-move="bridge" data-part="trigger"></g>`);
  slots.bridge = [box(BRIDGE, 8, 3, 'hi') + coins(BRIDGE.x + 20, BRIDGE.y + 15, 11, 2, 3.2), box(BRIDGE, 5, 3, 'hi') + coins(BRIDGE.x + 20, BRIDGE.y + 15, 8, 4, 3.2) + Array.from({ length: 5 }, (_, i) => coins(RHOP.x - (i * 16), -6 + (i ? 0 : 0), 30 - i * 0.6, 1, 3.2, 1.1, 'coin blue')).join('')];
}
// the cart in front on four wheels: the take-home heap in gold, the reward heap in blue on its right end
{
  const c = [];
  for (const [x, y] of [[CART.x + 14, CART.y - 2], [CART.x + CART.w - 14, CART.y - 2], [CART.x + 14, CART.y + CART.d + 2], [CART.x + CART.w - 14, CART.y + CART.d + 2]]) c.push(S(k.cylinder(x, y, 4, 0, 3, P, 20), { tone: 'lo' }), L(k.ring(x, y, 2, 3, P, 12), { tone: 'faint' }));
  c.push(box(CART, 6, 20, 'mid', 0.8));
  c.push(S(k.slabOf({ x: CART.x - 6, y: CART.y + CART.d / 2 - 2, w: 6, d: 4, r: 1 }, 16, 3, P, 2), { tone: 'mid', crease: 'none' })); // the handle
  parts.push(part('cart', c.join('')), `<g data-coins="bank" data-part="cart"></g><g data-coins="reward" data-part="cart"></g>`, part('cart', L(k.planOutline(CART, 26, P, 3), { tone: 'mid' })));
  const gold = { x: CART.x, y: CART.y, w: CART.w * 0.68, d: CART.d, r: 0 }, blue = { x: CART.x + CART.w * 0.68, y: CART.y, w: CART.w * 0.32, d: CART.d, r: 0 };
  slots.bank = Array.from({ length: LEVELS }, (_, i) => heap(gold, 26, i / (LEVELS - 1), 7));
  slots.reward = Array.from({ length: LEVELS }, (_, i) => heap(blue, 26, i / (LEVELS - 1), 7, 'coin blue'));
}

const svg = k.figureSvg({ width: W, height: H, label: 'The same month of payroll as a conveyor on a bench. Plain payroll: a hopper feeds a belt, three diverter arms sweep coins into bins for payroll taxes, health insurance and the 401(k), and the rest rides to the cart in front, the take-home. With the plan on: a fourth arm and bin for Section 125, a weighbridge at the end of the belt that tips when the last coin lands and empties the reward hopper down a chute into the cart, a return belt carrying the company\'s coins to its cup and the fee cup, and a cup for the Plan $. Click a part to see it close.', body: parts.join('') });
const count = (svg.match(/<path class="iso-fill"/g) || []).length;
writeFileSync(join(HERE, 'iso.js'), '/* built by iso-build.mjs; do not edit */\nwindow.ISO_FIGURE = ' + JSON.stringify({ svg, levels: slots, steps: LEVELS }) + ';\n');
writeFileSync(join(HERE, 'iso.css'), readFileSync('/Users/jaybeatty/.claude/skills/anatomy/kit/iso.css', 'utf8'));
console.log('wrote iso.js (' + Math.round(svg.length / 1024) + ' KB figure, ' + count + ' solids at rest) and iso.css');
