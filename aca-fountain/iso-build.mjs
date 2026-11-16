// The isometric companion to the plumbing board: the same month as a bench model, built once with the anatomy kit.
// node aca-fountain/iso-build.mjs  ->  iso.js (the figure, its parts, and the precomputed moving states) and iso.css.
// Plain payroll is a plain bench: a tank, a header, three cisterns and the pool. Switching ACA on adds the elaborate
// layer: the Section 125 cistern with its float and threaded spindle, the bridge with the gear train that opens the
// reward valve, the ACA tank and its raised line under the bridge, the return line with its pump and two cups, and the
// Plan Dollars drain. The page swaps each vessel's water (and the trigger's pose) to the level the board reports.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from '/Users/jaybeatty/.claude/skills/anatomy/kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600, HEIGHT = 390, LEVELS = 21, POSES = 11; // water levels per vessel; poses of the trigger train
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (P, points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------- plan: x across the bench, y toward the viewer, z up ---------- */
const PLATE = { x: -168, y: -98, w: 336, d: 196, r: 8 };
const TANK = { x: -20, y: -72, r: 20, z: 12, h: 48 };
const ACA_TANK = { x: 128, y: -72, r: 12, z: 16, h: 34 };
const HEADER = { x: -140, y: -44, w: 280, d: 8, r: 1, z: 22, h: 7 };
const BASINS = {
  taxes: { x: -140, y: -22, w: 50, d: 40, r: 1.5 },
  health: { x: -84, y: -22, w: 36, d: 40, r: 1.5 },
  fsa: { x: -44, y: -22, w: 14, d: 40, r: 1.5 }, // the Section 125 plan the company already has
  k401: { x: 18, y: -22, w: 24, d: 40, r: 1.5 },
  aca: { x: 50, y: -22, w: 44, d: 40, r: 1.5 },
};
const POOL = { x: -84, y: 34, w: 130, d: 48, r: 2 };
const CUPS = { company: { x: -140, y: -82, r: 7 }, fee: { x: -140, y: 50, r: 7 }, plan: { x: 72, y: 58, r: 7 } };
const LINE_X = 44; // the raised reward line's run toward the pool, between the 401(k) and Section 125 cisterns
const BYPASS = { x: LINE_X - 2.5, y: -72, w: ACA_TANK.x - LINE_X + 2.5, d: 6, r: 1, z: 47, h: 5 };
const BRIDGE = { x: 42, y: -12, w: 60, d: 20, r: 1.5, z: 54, h: 3 }; // the gear deck over the Section 125 cistern
const FLOAT = { x: 72, y: -2, r: 4, h: 4 }; // a float can inside the cistern, on the threaded spindle
const GEARS = [{ x: 72, y: -2, r: 9, n: 14 }, { x: 57, y: -2, r: 6, n: 10 }, { x: LINE_X, y: -2, r: 7, n: 12 }]; // the last is the valve stem
const RET = { x: -152 }; // the return line down the left side
const PUMP = { x: RET.x, y: -60 };
const WALL = 2.6, FLOOR = 2, GLASS_H = 40, POOL_H = 44, CUP_H = 30;

const pts = [...k.boxCorners(PLATE, -15, 0), [TANK.x, TANK.y, TANK.z + TANK.h + 10], [GEARS[0].x, GEARS[0].y, 70], [POOL.x + POOL.w, POOL.y + POOL.d, POOL_H]];
const P = k.fitProjection(pts, WIDTH, HEIGHT, { pad: 24, azimuth: 40, elevation: 33 });

/* ---------- parts ---------- */
const part = (id, html) => `<g data-part="${id}">${html}</g>`;
const aca = (html) => `<g class="aca-part">${html}</g>`;
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -15, 10, P)}"/>`];
  for (const [x, y] of byDepth(P, k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -15, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5.4, -13.4, 3.4, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(PLATE, -10, 10, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5 }));
  const strip = { x: PLATE.x + 18, y: PLATE.y + PLATE.d - 13, w: PLATE.w - 36, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.4], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  out.push(D([k.iso([strip.x + 2, strip.y + 3, 0.6], P), k.iso([strip.x + strip.w - 2, strip.y + 3, 0.6], P)], { size: 0.45 }));
  out.push(labelPlate({ x: PLATE.x + PLATE.w - 58, y: PLATE.y + 8, w: 46, d: 14, r: 1 }, 0));
  return out.join('');
}
// A label plate: a thin slab with three rule lines and a screw at each corner.
function labelPlate(tag, z) {
  const out = [S(k.slabOf(tag, z, 0.8, P, 3), { tone: 'lo', crease: 'none' })];
  for (let i = 0; i < 3; i++) out.push(L(k.onTop([[tag.x + 3, tag.y + 3.5 + i * 3.2], [tag.x + tag.w - 3 - (i === 2 ? tag.w * 0.3 : 0), tag.y + 3.5 + i * 3.2]], z + 0.8, P), { tone: 'faint', free: i === 2 ? 'end' : undefined }));
  out.push(D([k.iso([tag.x + 1.6, tag.y + 1.6, z + 0.8], P), k.iso([tag.x + tag.w - 1.6, tag.y + 1.6, z + 0.8], P), k.iso([tag.x + 1.6, tag.y + tag.d - 1.6, z + 0.8], P), k.iso([tag.x + tag.w - 1.6, tag.y + tag.d - 1.6, z + 0.8], P)], { size: 0.4 }));
  return out.join('');
}
function tank(T, lid = true) {
  const out = [];
  const ped = { x: T.x - T.r - 4, y: T.y - T.r - 4, w: T.r * 2 + 8, d: T.r * 2 + 8, r: 3 };
  out.push(S(k.slabOf(ped, 0, T.z, P, 5, 0.8), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(ped, 3), T.z, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(ped, 3).map(([x, y]) => k.iso([x, y, T.z], P)), { size: 0.45 }));
  out.push(S(k.cylinder(T.x, T.y, T.r, T.z, T.h, P, 56, 0.8), { tone: 'mid', crease: 'lo', inner: [0.3, 0.62].map((f) => `<path class="iso-line" data-tone="lo" d="${k.sideArc(T.x, T.y, T.r, T.z + T.h * f, P, 32)}"/>`).join('') }));
  out.push(S(k.cylinder(T.x, T.y, T.r - 1.2, T.z + T.h, 3, P, 56), { tone: 'hi' }));
  out.push(L(k.knurl(T.x, T.y, T.r - 1.2, T.z + T.h, T.z + T.h + 3, 36, P), { tone: 'lo' }));
  if (lid) { out.push(S(k.cylinder(T.x, T.y, 5, T.z + T.h + 3, 3.5, P, 24), { tone: 'mid' })); out.push(L(k.ring(T.x, T.y, 3, T.z + T.h + 6.5, P, 16), { tone: 'lo' })); }
  out.push(L(k.ring(T.x, T.y, T.r - 4, T.z + T.h + 3, P, 40), { tone: 'faint' }));
  return out.join('');
}
function cistern(plan, h) {
  const back = [S(k.slabOf(plan, 0, FLOOR, P, 3, 0.4), { tone: 'lo' })];
  back.push(S(k.slabOf({ x: plan.x, y: plan.y, w: WALL, d: plan.d, r: 0.5 }, FLOOR, h - FLOOR, P, 2), { tone: 'lo', crease: 'none' }));
  back.push(S(k.slabOf({ x: plan.x, y: plan.y, w: plan.w, d: WALL, r: 0.5 }, FLOOR, h - FLOOR, P, 2), { tone: 'lo', crease: 'none' }));
  const front = [L(k.planOutline(plan, h, P, 3), { tone: 'mid' }), L(k.planOutline(plan, FLOOR + 1.2, P, 3), { tone: 'lo' })];
  front.push(L([[plan.x + plan.w, plan.y + 1], [plan.x + 1, plan.y + plan.d], [plan.x + plan.w, plan.y + plan.d]].map(([x, y]) => k.rise([x, y], FLOOR, h, P)).join(''), { tone: 'lo' }));
  const px = plan.x + plan.w / 2, py = plan.y + plan.d, half = Math.min(10, plan.w / 2 - 3);
  front.push(L([0, 1, 2].map((i) => k.pathOf([k.iso([px - half, py, h - 7 - i * 2.4], P), k.iso([px + half - (i === 2 ? 6 : 0), py, h - 7 - i * 2.4], P)])).join(''), { tone: 'faint', free: true }));
  return { back: back.join(''), front: front.join('') };
}
const waterSlab = (plan, level, cls) => (level < 0.3 ? '' : S(k.slabOf({ x: plan.x + WALL, y: plan.y + WALL, w: plan.w - WALL - 0.6, d: plan.d - WALL - 0.6, r: 0.6 }, FLOOR, level, P, 2), { tone: 'hi', crease: 'lo', className: cls }));
function cup(c, h) {
  const back = S(k.cylinder(c.x, c.y, c.r + 1.2, 0, 1.4, P, 28), { tone: 'lo' }) + S(k.cylinder(c.x, c.y, c.r, 1.4, h, P, 28, 0.4), { tone: 'mid', crease: 'none' });
  const front = L(k.ring(c.x, c.y, c.r, 1.4 + h, P, 28), { tone: 'hi' }) + L(k.ring(c.x, c.y, c.r, 1.4 + h - 2, P, 28), { tone: 'faint' });
  return { back, front };
}
const cupWater = (c, level, cls) => (level < 0.3 ? '' : S(k.cylinder(c.x, c.y, c.r - 1.4, 2, level, P, 24), { tone: 'hi', crease: 'none', className: cls }));
const channel = (plan, z, h, tone = 'mid') => S(k.slabOf(plan, z, h, P, 2, 0.4), { tone }) + L(k.planOutline(k.insetPlan(plan, 1.6), z + h, P, 2), { tone: 'faint' });
const spout = (x, y0, y1, z, w = 5, tone = 'mid') => S(k.slabOf({ x: x - w / 2, y: Math.min(y0, y1), w, d: Math.abs(y1 - y0), r: 0.8 }, z, 5, P, 2), { tone, crease: 'none' });
const post = (x, y, z0, z1, r = 1.8) => S(k.cylinder(x, y, r, z0, z1 - z0, P, 14), { tone: 'lo', crease: 'none' });
const band = (plan, z, h) => S(k.slabOf({ x: plan.x - 1, y: plan.y - 1, w: plan.w + 2, d: plan.d + 2, r: 1 }, z - 0.5, h + 1, P, 2), { tone: 'lo', crease: 'none' });
// A flat gear: a toothed ring extruded, a hub ring and a pin. `angle` turns it.
function gear(g, z, angle, h = 2.2) {
  const ring = [];
  for (let i = 0; i < g.n; i++) {
    const a = angle + (i * Math.PI * 2) / g.n, w = (Math.PI * 2) / g.n, tip = g.r + 1.6, root = g.r - 0.3;
    for (const [da, rr] of [[-w * 0.3, root], [-w * 0.17, tip], [w * 0.17, tip], [w * 0.3, root]]) ring.push([g.x + Math.cos(a + da) * rr, g.y + Math.sin(a + da) * rr]);
  }
  return S(k.extrude(ring, z, h, P, { convex: false }), { tone: 'hi', crease: 'lo' }) + L(k.ring(g.x, g.y, g.r * 0.6, z + h, P, 24), { tone: 'lo' }) + S(k.cylinder(g.x, g.y, 1.6, z + h, 1.2, P, 12), { tone: 'mid', crease: 'none' });
}
// A handwheel lying flat on a stem: a rim ring, spokes and a hub, turned by `angle`.
function handwheel(x, y, z, r, angle) {
  let spokes = '';
  for (let i = 0; i < 4; i++) { const a = angle + (i * Math.PI) / 2; spokes += k.lineOnTop([x, y], [x + Math.cos(a) * r, y + Math.sin(a) * r], z + 1.2, P); }
  return S(k.cylinder(x, y, 1.4, z - 4, 4, P, 12), { tone: 'mid', crease: 'none' }) + L(k.ring(x, y, r, z + 1.2, P, 28), { tone: 'hi' }) + L(k.ring(x, y, r - 1.1, z + 1.2, P, 28), { tone: 'mid' }) + L(spokes, { tone: 'hi' }) + S(k.cylinder(x, y, 1.8, z, 1.6, P, 12), { tone: 'hi', crease: 'none' });
}

/* ---------- assemble, back to front ---------- */
const parts = [plate()];
const slots = {};
let feeLater = '';
// the return line: the header's left end, out to the left wall, up to the company cup and down to the fee cup, with a pump
{
  const ret = [];
  ret.push(channel({ x: RET.x, y: HEADER.y, w: HEADER.x - RET.x + 2, d: 6, r: 1 }, HEADER.z, 5, 'lo'));
  ret.push(channel({ x: RET.x - 3, y: CUPS.company.y + 4, w: 6, d: HEADER.y - CUPS.company.y - 4, r: 1 }, HEADER.z, 5, 'lo'));
  ret.push(channel({ x: RET.x - 3, y: HEADER.y + 6, w: 6, d: CUPS.fee.y - HEADER.y - 10, r: 1 }, HEADER.z, 5, 'lo'));
  ret.push(channel({ x: RET.x, y: CUPS.fee.y - 3, w: CUPS.fee.x - RET.x - 4, d: 6, r: 1 }, HEADER.z, 5, 'lo'));
  ret.push(channel({ x: RET.x, y: CUPS.company.y - 3, w: CUPS.company.x - RET.x - 4, d: 6, r: 1 }, HEADER.z, 5, 'lo'));
  for (const y of [-30, 0, 30]) ret.push(post(RET.x, y, 0, HEADER.z));
  ret.push(band({ x: RET.x - 3, y: -14, w: 6, d: 3, r: 1 }, HEADER.z, 5), band({ x: RET.x - 3, y: 12, w: 6, d: 3, r: 1 }, HEADER.z, 5));
  ret.push(S(k.slabOf({ x: RET.x - 2.2, y: -11, w: 4.4, d: 23, r: 1 }, HEADER.z + 5, 1.2, P, 2), { tone: 'hi', crease: 'none', lit: true })); // the sight glass on the down run
  ret.push(S(k.cylinder(PUMP.x, PUMP.y, 6, HEADER.z - 2, 11, P, 32, 0.6), { tone: 'mid', crease: 'lo' })); // the pump housing
  ret.push(L(k.knurl(PUMP.x, PUMP.y, 6, HEADER.z + 5, HEADER.z + 8, 30, P), { tone: 'lo' }));
  ret.push(S(k.cylinder(PUMP.x, PUMP.y, 2.2, HEADER.z + 9, 3, P, 16), { tone: 'hi', crease: 'none' }));
  ret.push(S(k.slabOf({ x: PUMP.x - 12, y: PUMP.y - 5, w: 8, d: 10, r: 1.5 }, HEADER.z - 2, 9, P, 3, 0.5), { tone: 'lo' })); // its motor
  ret.push(L(k.planOutline({ x: PUMP.x - 10.5, y: PUMP.y - 3.5, w: 5, d: 7, r: 1 }, HEADER.z + 7, P, 2), { tone: 'faint' }));
  ret.push(D([k.iso([PUMP.x - 11, PUMP.y - 4, HEADER.z + 7], P), k.iso([PUMP.x - 5, PUMP.y + 4, HEADER.z + 7], P)], { size: 0.4 }));
  ret.push(labelPlate({ x: RET.x + 4, y: -8, w: 14, d: 8, r: 0.8 }, 0));
  const cc = cup(CUPS.company, CUP_H), fc = cup(CUPS.fee, CUP_H);
  parts.push(aca(part('return', ret.join('') + cc.back)), `<g data-water="company" data-part="return"></g>`, aca(part('return', cc.front)));
  slots.company = Array.from({ length: LEVELS }, (_, i) => cupWater(CUPS.company, (i / (LEVELS - 1)) * (CUP_H - 3), 'w-gold'));
  slots.fee = Array.from({ length: LEVELS }, (_, i) => cupWater(CUPS.fee, (i / (LEVELS - 1)) * (CUP_H - 3), 'w-gold'));
  feeLater = aca(part('return', fc.back)) + `<g data-water="fee" data-part="return"></g>` + aca(part('return', fc.front));
}
// the Company's tank and its main into the header
parts.push(part('tank', tank(TANK) + spout(TANK.x, TANK.y + TANK.r, HEADER.y + 1, HEADER.z + 2, 8)));
// the ACA tank and its raised line: along the back at the tank's height, then forward under the bridge toward the pool
{
  const line = [tank(ACA_TANK, false)];
  line.push(S(k.slabOf({ x: ACA_TANK.x - 6, y: ACA_TANK.y - 3, w: 12, d: 6, r: 1 }, ACA_TANK.z + 10, 4, P, 2), { tone: 'hi', crease: 'none', lit: true })); // the tank's sight glass
  for (const x of [66, 92, 118]) line.push(post(x, BYPASS.y + 3, 0, BYPASS.z));
  line.push(channel(BYPASS, BYPASS.z, BYPASS.h, 'hi'));
  line.push(band({ x: 88, y: BYPASS.y, w: 3, d: BYPASS.d, r: 1 }, BYPASS.z, BYPASS.h));
  line.push(post(LINE_X, BYPASS.y + BYPASS.d + 4, 0, BYPASS.z), post(LINE_X, 26, 0, BYPASS.z));
  line.push(spout(LINE_X, BYPASS.y + BYPASS.d, POOL.y + 4, BYPASS.z, 5, 'hi'));
  line.push(band({ x: LINE_X - 2.5, y: -40, w: 5, d: 3, r: 1 }, BYPASS.z, 5), band({ x: LINE_X - 2.5, y: 22, w: 5, d: 3, r: 1 }, BYPASS.z, 5));
  line.push(labelPlate({ x: ACA_TANK.x - 7, y: ACA_TANK.y + ACA_TANK.r + 5, w: 14, d: 7, r: 0.8 }, 0));
  parts.push(aca(part('aca-line', line.join(''))));
}
// the header channel, its diverter box, its branch spouts and legs
{
  const hd = [channel(HEADER, HEADER.z, HEADER.h)];
  const box = { x: TANK.x - 11, y: HEADER.y - 6, w: 22, d: 20, r: 2 };
  hd.push(S(k.slabOf(box, HEADER.z - 2, 14, P, 4, 0.6), { tone: 'mid' }));
  hd.push(D([k.iso([box.x + 3, box.y + 3, HEADER.z + 12], P), k.iso([box.x + box.w - 3, box.y + 3, HEADER.z + 12], P), k.iso([box.x + 3, box.y + box.d - 3, HEADER.z + 12], P)], { size: 0.45 }));
  hd.push(L(k.planOutline({ x: box.x + 5, y: box.y + 5, w: 12, d: 10, r: 1 }, HEADER.z + 12, P, 2), { tone: 'faint' }));
  for (const key of ['taxes', 'health', 'fsa', 'k401']) {
    const b = BASINS[key];
    hd.push(spout(b.x + b.w / 2, HEADER.y + HEADER.d, b.y + 6, HEADER.z - 2, key === 'k401' ? 3.5 : key === 'fsa' ? 3 : key === 'health' ? 4.5 : 6));
    for (const px of (key === 'fsa' ? [b.x + b.w / 2] : [b.x + b.w / 2 - 6, b.x + b.w / 2 + 6])) hd.push(post(px, HEADER.y + HEADER.d + 2, 0, HEADER.z - 2));
  }
  hd.push(spout(TANK.x, HEADER.y + HEADER.d, POOL.y + 6, HEADER.z - 1, 9));
  for (const px of [TANK.x - 7, TANK.x + 7]) hd.push(post(px, 12, 0, HEADER.z - 1));
  parts.push(part('header', hd.join('')));
  const b = BASINS.aca, br = [spout(b.x + b.w / 2, HEADER.y + HEADER.d, b.y + 6, HEADER.z - 2, 6)];
  for (const px of [b.x + b.w / 2 - 6, b.x + b.w / 2 + 6]) br.push(post(px, HEADER.y + HEADER.d + 2, 0, HEADER.z - 2));
  parts.push(aca(part('aca-cistern', br.join(''))));
}
// the pre-tax row
for (const key of ['taxes', 'health', 'fsa', 'k401']) {
  const c = cistern(BASINS[key], GLASS_H);
  parts.push(part(key, c.back), `<g data-water="${key}" data-part="${key}"></g>`, part(key, c.front));
  slots[key] = Array.from({ length: LEVELS }, (_, i) => waterSlab(BASINS[key], (i / (LEVELS - 1)) * (GLASS_H - FLOOR - 1), 'w-pay'));
}
// the Section 125 cistern with its floor grate, then the trigger: float, spindle, bridge, gears, the valve on the line
{
  const b = BASINS.aca, c = cistern(b, GLASS_H);
  const grate = Array.from({ length: 5 }, (_, i) => k.onTop([[b.x + 8, b.y + 24 + i * 2.4], [b.x + 22, b.y + 24 + i * 2.4]], FLOOR + 0.2, P)).join('');
  parts.push(aca(part('aca-cistern', c.back + L(grate, { tone: 'mid' }) + L(k.planOutline({ x: b.x + 7, y: b.y + 22.5, w: 16, d: 12.5, r: 0.5 }, FLOOR + 0.2, P, 2), { tone: 'mid' }))));
  parts.push(`<g data-water="aca" data-part="aca-cistern"></g>`);
  parts.push(aca(part('aca-cistern', c.front)));
  const bridge = [];
  for (const [x, y] of [[48, -10], [98, -10], [48, 6], [98, 6]]) bridge.push(post(x, y, 0, BRIDGE.z, 1.6));
  bridge.push(S(k.slabOf(BRIDGE, BRIDGE.z, BRIDGE.h, P, 3, 0.5), { tone: 'mid' }));
  bridge.push(L(k.planOutline(k.insetPlan(BRIDGE, 2), BRIDGE.z + BRIDGE.h, P, 3), { tone: 'faint' }));
  bridge.push(D(k.corners(BRIDGE, 3).map(([x, y]) => k.iso([x, y, BRIDGE.z + BRIDGE.h], P)), { size: 0.45 }));
  bridge.push(labelPlate({ x: 84, y: -10, w: 14, d: 7, r: 0.8 }, BRIDGE.z + BRIDGE.h));
  for (const g of GEARS) bridge.push(L(k.ring(g.x, g.y, g.r + 2.4, BRIDGE.z + BRIDGE.h, P, 32), { tone: 'faint' }));
  parts.push(aca(part('trigger', bridge.join(''))));
  parts.push(`<g data-move="trigger" data-part="trigger"></g>`);
  const deck = BRIDGE.z + BRIDGE.h, top = GLASS_H - FLOOR - 1;
  slots.aca = []; slots.trigger = [];
  for (let i = 0; i < LEVELS; i++) slots.aca.push(waterSlab(b, (i / (LEVELS - 1)) * top, 'w-plan'));
  for (let i = 0; i < POSES; i++) {
    const level = (i / (POSES - 1)) * top, fz = FLOOR + Math.max(0.5, level - 1.5);
    const a1 = (level / top) * Math.PI * 1.2, a2 = -a1 * (GEARS[0].r / GEARS[1].r), a3 = a1 * (GEARS[0].r / GEARS[2].r);
    const pose = [];
    pose.push(S(k.cylinder(FLOAT.x, FLOAT.y, FLOAT.r, fz, FLOAT.h, P, 20, 0.5), { tone: 'hi', crease: 'lo' }));
    pose.push(L(k.ring(FLOAT.x, FLOAT.y, FLOAT.r - 1, fz + FLOAT.h, P, 20), { tone: 'lo' }));
    pose.push(S(k.cylinder(FLOAT.x, FLOAT.y, 1.3, fz + FLOAT.h, deck + 9 - fz - FLOAT.h, P, 12), { tone: 'mid', crease: 'none' }));
    pose.push(L(k.knurl(FLOAT.x, FLOAT.y, 1.3, fz + FLOAT.h + 2, deck - 1, 10, P, 0.2), { tone: 'lo' }));
    pose.push(gear(GEARS[0], deck, a1, 2.4), gear(GEARS[1], deck, a2, 2.2), gear(GEARS[2], deck, a3, 2.2));
    pose.push(S(k.cylinder(FLOAT.x, FLOAT.y, 2.4, deck + 3.6, 2.4, P, 12), { tone: 'hi', crease: 'none' }));
    slots.trigger.push(pose.join(''));
  }
  slots.valve = [handwheel(LINE_X, -2, deck + 6, 5.5, 0), handwheel(LINE_X, -2, deck + 6, 5.5, Math.PI / 3)];
  parts.push(`<g data-move="valve" data-part="trigger"></g>`);
}
// the Plan Dollars drain to its cup, and the fee cup in front at the left
{
  const b = BASINS.aca, drain = [spout(b.x + b.w / 2 + 10, b.y + b.d, CUPS.plan.y - CUPS.plan.r, 10, 4)];
  drain.push(post(b.x + b.w / 2 + 10, 30, 0, 10, 1.4), S(k.cylinder(b.x + b.w / 2 + 10, 34, 2.4, 15, 2, P, 12), { tone: 'hi', crease: 'none' }));
  const pc = cup(CUPS.plan, CUP_H);
  parts.push(aca(part('plan', drain.join('') + pc.back)), `<g data-water="plan" data-part="plan"></g>`, aca(part('plan', pc.front)));
  slots.plan = Array.from({ length: LEVELS }, (_, i) => cupWater(CUPS.plan, (i / (LEVELS - 1)) * (CUP_H - 3), 'w-plan'));
  parts.push(feeLater);
}
// the pool
{
  const c = cistern(POOL, POOL_H);
  parts.push(part('pool', c.back), `<g data-water="bank" data-part="pool"></g><g data-water="reward" data-part="pool"></g>`, part('pool', c.front));
  slots.bank = Array.from({ length: LEVELS }, (_, i) => waterSlab(POOL, (i / (LEVELS - 1)) * (POOL_H - FLOOR - 1), 'w-pay'));
  slots.reward = Array.from({ length: LEVELS }, (_, j) => waterSlab(POOL, (j / (LEVELS - 1)) * (POOL_H - FLOOR - 1), 'w-reward'));
}

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: 'The same month as a bench model. Plain payroll: a tank pours into a header channel that feeds four glass cisterns, one of them the existing Section 125 FSA, and the pool in front. With the plan on: a fifth cistern with a float on a threaded spindle that turns a gear train on a bridge, the last gear opening the valve on a raised line from the plan\'s tank; a return line with a pump feeding two cups; a drain to the Plan Dollars cup. Click a part to see it close.', body: parts.join('') });
const count = (svg.match(/<path class="iso-fill"/g) || []).length;
writeFileSync(join(HERE, 'iso.js'), '/* built by iso-build.mjs; do not edit */\nwindow.ISO_FIGURE = ' + JSON.stringify({ svg, levels: slots, steps: LEVELS, poolRange: POOL_H - FLOOR - 1, up: [k.iso([0, 0, 1], P)[0] - k.iso([0, 0, 0], P)[0], k.iso([0, 0, 1], P)[1] - k.iso([0, 0, 0], P)[1]] }) + ';\n');
writeFileSync(join(HERE, 'iso.css'), readFileSync('/Users/jaybeatty/.claude/skills/anatomy/kit/iso.css', 'utf8'));
console.log('wrote iso.js (' + Math.round(svg.length / 1024) + ' KB figure, ' + count + ' solids at rest) and iso.css');
