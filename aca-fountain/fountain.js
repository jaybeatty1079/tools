/* The payroll fountain. A front elevation of refined plumbing on a navy plate: payroll comes in from the top as water,
   passes the main valve and a header, and branch pipes of different bore, each with its own valve and sight glass, divert
   it into glass buckets for every pre-tax withholding. What is left runs on down the main pipe into the post-tax bucket,
   the employee's take-home. Water area is dollars: every bucket and vessel uses one dollars-per-pixel scale set from the
   payroll total, so a whole company draws like one paycheck. The numbers come from model.js.

   With ACA off the right end of the header is capped. Switching ACA on fits the ACA Section 125 branch, the return line,
   the Trigger gear train and the indemnity supply (`engage` runs 0 to 1). An ACA run has three acts:
     drop    payroll pours; the tier amount fills the Section 125 bucket, the tax valve throttles back, and the tax no
             longer paid runs through the return line to the Company's vessel (the admin fee tees off, in gold). The
             float in the Section 125 bucket rises with the water and its rack turns the Trigger gears as it goes
     armed   the bucket is full: the gear train's shaft opens the reward valve on the ACA indemnity supply
     payout  the Wellness Reward pours into the post-tax bucket from ACA's own supply; the Section 125 bucket drains:
             the reward part away through the floor grate to ACA, the Plan Dollars part by pipe into their vessel */
(function () {
  'use strict';
  const M = window.FountainModel;
  const cv = document.getElementById('machine'), ctx = cv.getContext('2d');
  const W = 560, H = 664, DPR = 2, TAU = Math.PI * 2;
  cv.width = W * DPR; cv.height = H * DPR;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const SERIF = 'Baskerville, "Libre Baskerville", "Hoefler Text", Didot, Georgia, serif';
  const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (u) => u * u * (3 - 2 * u);

  // ACA's own colors: the logo's gold and brown, the signature's blue. Payroll water is pale; the Wellness Reward is the
  // brand blue; Plan Dollars a deeper blue; the company's money is the brand gold.
  const C = {
    ivory: '#F4EEDD', mute: '#98A2B6', faint: '#5C667A',
    brassHi: '#F6E3AC', brass: '#CFA84F', brassMid: '#9C7A2E', brassLo: '#5A4112', brassDeep: '#2E2108',
    nickelHi: '#F2F4F7', nickel: '#B9C0CB', nickelMid: '#7D8591', nickelLo: '#4A515C',
    pay: [164, 200, 240], reward: [37, 110, 205], plan: [96, 150, 230], gold: [232, 198, 106],
    glass: 'rgba(190,210,240,.07)', glassEdge: 'rgba(220,232,250,.35)',
  };
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const AMBER = '#F5C24B';

  /* ---------- the plumbing ---------- */
  const MAIN = { x: 280, bore: 26, valveY: 76, glass: [112, 158], end: 436 };
  const HEADER = { y: 182, bore: 16, l: 92, r: 372, rOn: 448 };
  const ROW = { top: 268, bottom: 368 };
  const BR = {
    taxes: { x: 97, bore: 12, bx: 52, bw: 90, name: ['PAYROLL TAXES'] },
    health: { x: 180, bore: 7, bx: 148, bw: 64, name: ['HEALTH', 'INSURANCE'] },
    fsa: { x: 236, bore: 4, bx: 218, bw: 36, name: ['FSA'] }, // the Section 125 plan a company this size already has
    k401: { x: 370, bore: 5, bx: 348, bw: 44, name: ['401(k)'] },
    aca: { x: 452, bore: 12, bx: 410, bw: 84, name: ['SECTION 125', 'WELLNESS'] },
  };
  const VALVE_Y = 214, GLASS = [234, 256], PIPE_END = 262;
  const POOL = { x: 170, w: 220, top: 450, bottom: 580 };
  const VESSEL = {
    company: { x: 48, w: 24, top: 44, bottom: 118 },
    fee: { x: 48, w: 24, top: 470, bottom: 540 },
    plan: { x: 440, w: 24, top: 402, bottom: 448 },
  };
  const RET = { x: 36 };
  // The Trigger: a float in the Section 125 bucket lifts a rack; the rack turns a train of three gears on the right
  // wall; the last gear's shaft runs down to the reward valve on the ACA indemnity supply.
  const RACK = { x: 500, top: 258, bottom: 344 };
  const GEARS = [{ x: 514, y: 282, r: 10, n: 12 }, { x: 514, y: 306, r: 14, n: 16 }, { x: 514, y: 338, r: 18, n: 20 }];
  const SUPPLY = { y: 470, valveX: 514, glass: [410, 440], edge: 536 }; // the ACA indemnity supply, in from the right edge
  const SPEED = 420, POUR = 6;

  let S = M.single(M.DEFAULT), scope = 'employee';
  let aca = false, engage = 0, running = false, finished = false, clock = 0, t = 0, act = 'idle', quiet = false, raf = 0, last = 0;
  let armedAt = -9, paidAt = -9, lastSent = false, drops = [], valveOpen = 0, snap = 0, rewardOpen = 0;
  const listeners = [];
  const emit = () => listeners.forEach((fn) => fn(api.state()));
  const sfx = (name) => { if (!quiet && api.sfx) api.sfx(name, { aca }); };
  const mode = () => (aca ? 'on' : 'off');
  const D = () => S.dollars[mode()];
  const K = () => S.total / 26000;

  /* ---------- timing ---------- */
  const T1 = (HEADER.y - MAIN.valveY) / SPEED;
  const streamOn = () => T1 + 0.2, streamOff = () => POUR + T1 + 0.4;
  const fill = (lag) => (act === 'idle' ? 0 : clamp((t - lag) / POUR, 0, 1));
  const fillBucket = () => fill(streamOn() + 0.3), fillPool = () => fill(streamOn() + 0.7), fillVessel = () => fill(streamOn() + 0.9);
  const flowing = () => act !== 'idle' && t > streamOn() && t < streamOff();
  const pay = () => (aca && (act === 'payout' || act === 'done') ? ease(clamp((clock - paidAt) / 2.4, 0, 1)) : 0);
  const settled = () => streamOff() + (POOL.bottom - PIPE_END) / SPEED + 0.3;
  const hOf = (dollars, w) => dollars / (w * K());
  const planShare = () => (S.after.plan ? S.after.plan / S.dollars.on.aca : 0); // the Plan Dollars part of the Section 125 bucket
  function levelOf(key) {
    const d = D();
    if (key === 'bank') return (d.bank * fillPool() + S.after.reward * pay()) / (POOL.w * K());
    if (key === 'aca') return hOf(d.aca * fillBucket() * (1 - pay()), BR.aca.bw);
    if (key === 'company' || key === 'fee') return hOf(d[key] * fillVessel(), VESSEL[key].w);
    if (key === 'plan') return hOf(S.after.plan * pay(), VESSEL.plan.w);
    return hOf(d[key] * fillBucket(), BR[key].bw);
  }
  function shownDollars(key) {
    const d = D();
    if (key === 'bank') return d.bank * fillPool() + S.after.reward * pay();
    if (key === 'aca') return d.aca * fillBucket() * (1 - pay());
    if (key === 'company' || key === 'fee') return d[key] * fillVessel();
    if (key === 'plan') return S.after.plan * pay();
    return d[key] * fillBucket();
  }
  function run(on, off, top, bottom) {
    if (act === 'idle' || t < on) return null;
    const y2 = Math.min(bottom, top + (t - on) * SPEED), y1 = t > off ? Math.min(bottom, top + (t - off) * SPEED) : top;
    return y1 >= bottom - 0.5 ? null : [y1, y2];
  }

  function reset() { t = 0; act = 'idle'; running = false; finished = false; drops = []; lastSent = false; armedAt = -9; paidAt = -9; }
  function step(dt) {
    clock += dt;
    engage += ((aca ? 1 : 0) - engage) * Math.min(1, dt / 0.4);
    if (Math.abs((aca ? 1 : 0) - engage) < 0.004) engage = aca ? 1 : 0;
    const open = act !== 'idle' && t < POUR ? 1 : 0, paying = act === 'payout' || act === 'done' ? 1 : 0, armed = act === 'armed' || paying ? 1 : 0;
    valveOpen += (open - valveOpen) * Math.min(1, dt / 0.35);
    snap += (armed - snap) * Math.min(1, dt / 0.16);
    rewardOpen += (paying - rewardOpen) * Math.min(1, dt / 0.3);
    for (const p of drops) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 2.2; }
    drops = drops.filter((p) => p.a > 0);
    if (!running) return;
    t += dt;
    if (act === 'drop' && t > settled()) {
      if (!aca) { act = 'done'; running = false; finished = true; sfx('finish'); emit(); }
      else if (!lastSent) { lastSent = true; sfx('ready'); }
    }
    if (act === 'drop' && aca && t > settled() + 0.9) { act = 'armed'; armedAt = clock; sfx('trigger'); }
    if (act === 'armed' && clock - armedAt > 0.55) { act = 'payout'; paidAt = clock; sfx('reward'); }
    if (act === 'payout' && clock - paidAt > 3.1) { act = 'done'; running = false; finished = true; sfx('finish'); emit(); }
  }

  /* ---------- the backdrop, drawn once ---------- */
  function layer(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w * DPR; c.height = h * DPR;
    const g = c.getContext('2d'); g.scale(DPR, DPR); paint(g); return c;
  }
  const BACK = layer(W, H, (g) => {
    let grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#101B33'); grad.addColorStop(1, '#070C18');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    grad = g.createRadialGradient(280, 120, 20, 280, 200, 420); grad.addColorStop(0, 'rgba(90,120,180,.16)'); grad.addColorStop(1, 'rgba(90,120,180,0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(207,168,79,.55)'; g.lineWidth = 1; g.strokeRect(14.5, 14.5, W - 29, H - 29);
    g.strokeStyle = 'rgba(207,168,79,.25)'; g.strokeRect(19.5, 19.5, W - 39, H - 39);
    for (const [x, y] of [[14.5, 14.5], [W - 14.5, 14.5], [14.5, H - 14.5], [W - 14.5, H - 14.5]]) {
      g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fillStyle = '#8A6B22'; g.fill(); g.strokeStyle = 'rgba(246,227,172,.6)'; g.lineWidth = 0.7; g.stroke();
      g.beginPath(); g.moveTo(x - 1.8, y - 1.2); g.lineTo(x + 1.8, y + 1.2); g.strokeStyle = '#2E2108'; g.lineWidth = 0.9; g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,.025)'; g.lineWidth = 1; g.beginPath();
    for (let x = 40; x < W - 20; x += 20) { g.moveTo(x + 0.5, 20); g.lineTo(x + 0.5, H - 20); }
    for (let y = 40; y < H - 20; y += 20) { g.moveTo(20, y + 0.5); g.lineTo(W - 20, y + 0.5); }
    g.stroke();
  });

  /* ---------- drawing helpers ---------- */
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function text(s, x, y, size, color, opts = {}) {
    ctx.font = (opts.weight || 500) + ' ' + size + 'px ' + (opts.serif ? SERIF : SANS); ctx.fillStyle = color; ctx.textAlign = opts.align || 'center'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (opts.space || 0) + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  const splash = (x, y, n, spread) => { if (quiet || drops.length > 200) return; for (let i = 0; i < n; i++) drops.push({ x: x + (Math.random() - 0.5) * spread, y, vx: (Math.random() - 0.5) * 80, vy: -50 - Math.random() * 100, a: 0.9 }); };
  const dot = (x, y, r, fill, ring) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); if (ring) { ctx.lineWidth = 0.5; ctx.strokeStyle = ring; ctx.stroke(); } };
  const screw = (x, y) => { dot(x, y, 1.3, '#8A6B22', 'rgba(246,227,172,.7)'); ctx.beginPath(); ctx.moveTo(x - 0.8, y - 0.5); ctx.lineTo(x + 0.8, y + 0.5); ctx.lineWidth = 0.6; ctx.strokeStyle = '#2E2108'; ctx.stroke(); };
  const bolt = (x, y) => dot(x, y, 0.9, '#3A2A0C', 'rgba(246,227,172,.5)');
  function brassGrad(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.brassLo); g.addColorStop(0.22, C.brass); g.addColorStop(0.38, C.brassHi); g.addColorStop(0.6, C.brass); g.addColorStop(0.85, C.brassMid); g.addColorStop(1, C.brassDeep);
    return g;
  }
  function nickelGrad(x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, C.nickelLo); g.addColorStop(0.3, C.nickel); g.addColorStop(0.45, C.nickelHi); g.addColorStop(0.7, C.nickel); g.addColorStop(1, C.nickelLo);
    return g;
  }
  function pipe(x1, y1, x2, y2, bore, flanges = '') {
    const vert = x1 === x2, r = bore / 2;
    if (vert) { ctx.fillStyle = brassGrad(x1 - r, 0, x1 + r, 0); ctx.fillRect(x1 - r, Math.min(y1, y2), bore, Math.abs(y2 - y1)); }
    else { ctx.fillStyle = brassGrad(0, y1 - r, 0, y1 + r); ctx.fillRect(Math.min(x1, x2), y1 - r, Math.abs(x2 - x1), bore); }
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.8;
    if (vert) ctx.strokeRect(x1 - r + 0.4, Math.min(y1, y2), bore - 0.8, Math.abs(y2 - y1)); else ctx.strokeRect(Math.min(x1, x2), y1 - r + 0.4, Math.abs(x2 - x1), bore - 0.8);
    for (const [end, at] of [['a', [x1, y1]], ['b', [x2, y2]]]) if (flanges.includes(end)) flange(at[0], at[1], bore, vert);
  }
  function flange(x, y, bore, vert) {
    const r = bore / 2 + 2.5, len = 5;
    if (vert) { ctx.fillStyle = brassGrad(x - r, 0, x + r, 0); rr(x - r, y - len / 2, r * 2, len, 1.5); } else { ctx.fillStyle = brassGrad(0, y - r, 0, y + r); rr(x - len / 2, y - r, len, r * 2, 1.5); }
    ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    if (vert) { bolt(x - r + 1.6, y); bolt(x + r - 1.6, y); } else { bolt(x, y - r + 1.6); bolt(x, y + r - 1.6); }
  }
  function clip(x, y, bore, vert) {
    const r = bore / 2 + 3;
    if (vert) { ctx.fillStyle = brassGrad(x - r, 0, x + r, 0); rr(x - r, y - 2, r * 2, 4, 1); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke(); screw(x - r - 2.2, y); screw(x + r + 2.2, y); }
    else { ctx.fillStyle = brassGrad(0, y - r, 0, y + r); rr(x - 2, y - r, 4, r * 2, 1); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke(); screw(x, y - r - 2.2); screw(x, y + r + 2.2); }
  }
  function joint(x, y, bore) {
    const r = bore / 2 + 1.5, g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.5, x, y, r);
    g.addColorStop(0, C.brassHi); g.addColorStop(0.5, C.brass); g.addColorStop(1, C.brassLo);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function cap(x, y, bore, vert) {
    const r = bore / 2 + 2;
    ctx.fillStyle = vert ? brassGrad(x - r, 0, x + r, 0) : brassGrad(0, y - r, 0, y + r);
    if (vert) rr(x - r, y - 3, r * 2, 7, 2); else rr(x - 3, y - r, 7, r * 2, 2);
    ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    if (vert) { bolt(x - r + 1.6, y); bolt(x + r - 1.6, y); } else { bolt(x, y - r + 1.6); bolt(x, y + r - 1.6); }
  }
  function sightGlass(x, a, b, bore, flow, color, horiz = false, standing = 0) {
    const r = bore / 2 + 1.5;
    const box = () => (horiz ? rr(a, x - r, b - a, r * 2, r) : rr(x - r, a, r * 2, b - a, r));
    ctx.save(); box(); ctx.fillStyle = 'rgba(200,220,250,.08)'; ctx.fill(); ctx.clip();
    const level = Math.max(flow, standing);
    if (level > 0.02) {
      ctx.fillStyle = rgba(color, 0.85 * level);
      if (horiz) ctx.fillRect(a, x - r, b - a, r * 2); else ctx.fillRect(x - r, a, r * 2, b - a);
      if (flow > 0.02) {
        ctx.setLineDash([5, 9]); ctx.lineDashOffset = -clock * 90; ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,' + 0.45 * flow + ')';
        ctx.beginPath(); if (horiz) { ctx.moveTo(a - 20, x - r * 0.35); ctx.lineTo(b + 20, x - r * 0.35); } else { ctx.moveTo(x - r * 0.35, a - 20); ctx.lineTo(x - r * 0.35, b + 20); } ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
    box(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.glassEdge; ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath();
    if (horiz) { ctx.moveTo(a + 3, x - r * 0.5); ctx.lineTo(b - 3, x - r * 0.5); } else { ctx.moveTo(x - r * 0.5, a + 3); ctx.lineTo(x - r * 0.5, b - 3); } ctx.stroke();
    if (horiz) { flange(a, x, bore, false); flange(b, x, bore, false); } else { flange(x, a, bore, true); flange(x, b, bore, true); }
  }
  function wheel(x, y, open, radius, lit = false, gold = false) {
    const g = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 1, x, y, radius);
    if (gold) { g.addColorStop(0, C.brassHi); g.addColorStop(0.6, C.brass); g.addColorStop(1, C.brassLo); } else { g.addColorStop(0, C.nickelHi); g.addColorStop(0.6, C.nickel); g.addColorStop(1, C.nickelLo); }
    if (lit) { ctx.shadowColor = rgba(C.reward, 0.9); ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.lineWidth = radius * 0.3; ctx.strokeStyle = g; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(x, y, radius + radius * 0.15, 0, TAU); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, radius - radius * 0.15, 0, TAU); ctx.stroke();
    const a0 = open * Math.PI * 0.75;
    ctx.lineWidth = Math.max(1.4, radius * 0.2); ctx.strokeStyle = gold ? C.brass : C.nickel; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = a0 + (i * TAU) / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (radius - 1), y + Math.sin(a) * (radius - 1)); ctx.stroke(); }
    ctx.lineCap = 'butt';
    const hr = Math.max(2.6, radius * 0.3);
    ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6; ctx.stroke();
    if (radius >= 9) { ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = a0 + (i * TAU) / 12; ctx.moveTo(x + Math.cos(a) * (hr - 0.6), y + Math.sin(a) * (hr - 0.6)); ctx.lineTo(x + Math.cos(a) * hr, y + Math.sin(a) * hr); } ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke(); }
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = a0 + (i * TAU) / 6, px = x + Math.cos(a) * hr * 0.5, py = y + Math.sin(a) * hr * 0.5; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fillStyle = gold ? C.brassLo : C.nickelLo; ctx.fill();
  }
  function valve(x, y, bore, open, radius, lit = false) {
    const bw = bore + 8, bh = radius * 1.6;
    ctx.fillStyle = brassGrad(x - bw / 2, 0, x + bw / 2, 0); rr(x - bw / 2, y - bh / 2, bw, bh, 3); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.stroke();
    for (const yy of [y - bh / 2 + 2, y + bh / 2 - 2]) { bolt(x - bw / 2 + 2, yy); bolt(x + bw / 2 - 2, yy); }
    ctx.beginPath(); ctx.arc(x, y, radius * 0.55, 0, TAU); ctx.fillStyle = nickelGrad(x - radius, 0, x + radius, 0); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    wheel(x, y, open, radius, lit);
  }
  function valveH(x, y, bore, open, radius, lit = false) {
    const bh = bore + 8, bw = radius * 1.6;
    ctx.fillStyle = brassGrad(0, y - bh / 2, 0, y + bh / 2); rr(x - bw / 2, y - bh / 2, bw, bh, 3); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.stroke();
    for (const xx of [x - bw / 2 + 2, x + bw / 2 - 2]) { bolt(xx, y - bh / 2 + 2); bolt(xx, y + bh / 2 - 2); }
    ctx.beginPath(); ctx.arc(x, y, radius * 0.55, 0, TAU); ctx.fillStyle = nickelGrad(0, y - radius, 0, y + radius); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    wheel(x, y, open, radius, lit);
  }
  function gear(x, y, r, n, angle, lit = false) {
    const tip = r + 3, root = r - 0.5, g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, tip);
    g.addColorStop(0, C.brassHi); g.addColorStop(0.55, C.brass); g.addColorStop(1, C.brassLo);
    if (lit) { ctx.shadowColor = AMBER; ctx.shadowBlur = 10; }
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = angle + (i * TAU) / n, w = TAU / n;
      ctx.lineTo(x + Math.cos(a - w * 0.3) * root, y + Math.sin(a - w * 0.3) * root);
      ctx.lineTo(x + Math.cos(a - w * 0.18) * tip, y + Math.sin(a - w * 0.18) * tip);
      ctx.lineTo(x + Math.cos(a + w * 0.18) * tip, y + Math.sin(a + w * 0.18) * tip);
      ctx.lineTo(x + Math.cos(a + w * 0.3) * root, y + Math.sin(a + w * 0.3) * root);
    }
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(46,33,8,.6)'; ctx.stroke();
    if (r >= 14) for (let i = 0; i < 4; i++) { const a = angle + (i * TAU) / 4 + TAU / 8; dot(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52, r * 0.15, '#0D1427', 'rgba(0,0,0,.6)'); }
    ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fillStyle = nickelGrad(x - r * 0.3, 0, x + r * 0.3, 0); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6; ctx.stroke();
    dot(x, y, r * 0.1, C.nickelLo);
  }
  function water(x, w, surface, bottom, color, stir, alpha = 0.82) {
    if (surface >= bottom - 0.3) return;
    const wave = (i) => surface + Math.sin(clock * 5 + (x + i) * 0.14) * (0.4 + 1.5 * stir) * (0.5 + 0.5 * Math.sin((x + i) * 0.05 + clock));
    ctx.beginPath(); ctx.moveTo(x, bottom);
    for (let i = 0; i <= w; i += 4) ctx.lineTo(x + i, wave(i));
    ctx.lineTo(x + w, bottom); ctx.closePath();
    const grad = ctx.createLinearGradient(0, surface, 0, bottom); grad.addColorStop(0, rgba(color, alpha)); grad.addColorStop(1, rgba(color, alpha * 0.5));
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); for (let i = 0; i <= w; i += 4) (i ? ctx.lineTo(x + i, wave(i)) : ctx.moveTo(x, wave(0))); ctx.stroke();
  }
  function stream(x, w, y1, y2, color = C.pay, alpha = 0.8) {
    if (y2 - y1 < 1 || w < 0.8) return;
    const grad = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    grad.addColorStop(0, rgba(color, alpha * 0.95)); grad.addColorStop(0.4, rgba(color, alpha * 0.5)); grad.addColorStop(0.6, rgba(color, alpha * 0.5)); grad.addColorStop(1, rgba(color, alpha * 0.95));
    ctx.fillStyle = grad; ctx.fillRect(x - w / 2, y1, w, y2 - y1);
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y1, w, y2 - y1); ctx.clip();
    ctx.setLineDash([9, 13]); ctx.lineDashOffset = -clock * SPEED * 0.9; ctx.lineWidth = Math.max(0.8, w * 0.18); ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.moveTo(x - w * 0.22, y1 - 20); ctx.lineTo(x - w * 0.22, y2 + 20); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  function hit(x, y, w) {
    ctx.beginPath(); ctx.ellipse(x, y, w * 1.4 + 3, 2.2, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
    if (Math.random() < 0.6) splash(x, y, 1, w);
  }
  function bucket(x, w, top, bottom, level, color, stir, plate, layers) {
    rr(x, top, w, bottom - top, 4); ctx.fillStyle = C.glass; ctx.fill();
    const surface = Math.max(top + 2, bottom - 1.5 - level);
    if (layers) layers(surface); else water(x + 1.5, w - 3, surface, bottom - 1.5, color, stir);
    rr(x, top, w, bottom - top, 4); ctx.lineWidth = 1.4; ctx.strokeStyle = C.glassEdge; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4, top + 8); ctx.lineTo(x + 4, bottom - 8); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke();
    for (const y of [top, bottom - 5]) {
      ctx.fillStyle = brassGrad(0, y, 0, y + 5); rr(x - 2, y, w + 4, 5, 1.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
      for (let rx = x + 4; rx < x + w - 2; rx += 12) bolt(rx, y + 2.5);
    }
    if (plate) nameplate(x + w / 2, plate.y, plate.w || w - 8, plate.lines, plate.amount, plate.sub);
  }
  function nameplate(cx, y, w, lines, amount, sub) {
    const h = 9 + lines.length * 11 + (amount ? 15 : 0) + (sub ? 10 : 0);
    ctx.fillStyle = brassGrad(0, y, 0, y + h); rr(cx - w / 2, y, w, h, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
    rr(cx - w / 2 + 2.5, y + 2.5, w - 5, h - 5, 1.5); ctx.strokeStyle = 'rgba(60,40,10,.45)'; ctx.lineWidth = 0.6; ctx.stroke();
    for (const [sx, sy] of [[cx - w / 2 + 3, y + 3], [cx + w / 2 - 3, y + 3], [cx - w / 2 + 3, y + h - 3], [cx + w / 2 - 3, y + h - 3]]) dot(sx, sy, 0.9, '#5A4112', 'rgba(246,227,172,.5)');
    let yy = y + 11;
    for (const line of lines) { text(line, cx, yy, 8.5, '#2E2108', { serif: true, weight: 700, space: 0.9 }); yy += 11; }
    if (amount) { text(amount, cx, yy + 3, 12.5, '#1E1605', { weight: 800 }); yy += 15; }
    if (sub) text(sub, cx, yy + 1, 7.5, '#4A3710', { weight: 600 });
    return y + h;
  }
  const label = (s, x, y, size, color = C.brass, align = 'center') => text(s, x, y, size, color, { serif: true, weight: 700, space: 1.4, align });
  const figure = (s, x, y, size, align = 'center', color = C.ivory) => text(s, x, y, size, color, { weight: 800, align });
  const note = (s, x, y, align = 'center', size = 8.5) => text(s, x, y, size, C.mute, { weight: 600, align });

  /* ---------- the picture ---------- */
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(BACK, 0, 0, W, H);
    const d = D(), many = scope === 'company', won = finished && aca, paying = act === 'armed' || act === 'payout' || (act === 'done' && aca);
    const flow = flowing() ? 1 : 0, poured = act === 'idle' ? 0 : clamp(t / POUR, 0, 1);
    const hr = HEADER.r + (HEADER.rOn - HEADER.r) * engage;
    const share = (v) => v / S.total;
    const headline = () => {
      rr(92, 25, 376, 21, 3); ctx.fillStyle = '#0B1427'; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(207,168,79,.5)'; ctx.stroke();
      if (won) label('+' + money(S.delta.company) + ' BACK TO THE COMPANY  ·  +' + money(S.delta.bank) + (many ? ' TO EMPLOYEES' : ' TO THE EMPLOYEE'), 280, 36, 10, C.brassHi);
      else if (paying) label('TRIGGERED  ·  WELLNESS REWARD +' + money(S.after.reward) + ' FROM THE PLAN', 280, 36, 10, '#8FC2FF');
      else if (lastSent && act === 'drop') label('SECTION 125 FULL  ·  THE GEARS OPEN THE REWARD VALVE', 280, 36, 10, C.brassHi);
      else if (finished) label('NOW SWITCH THE PLAN ON', 280, 36, 10, C.ivory);
      else label(many ? 'COMPANY PAYROLL  ·  ' + S.employees + ' EMPLOYEES' : 'ONE PAYCHECK  ·  ONE MONTH', 280, 36, 10, C.mute);
    };

    /* --- the return line and the Company's vessel (ACA on) --- */
    if (engage > 0.02) {
      ctx.globalAlpha = engage;
      const v = VESSEL.company, f = VESSEL.fee, returning = aca && act !== 'idle' && t > streamOn() + 0.3 && t < streamOff() + 0.9;
      pipe(HEADER.l, HEADER.y, RET.x, HEADER.y, 8); joint(RET.x, HEADER.y, 8);
      pipe(RET.x, HEADER.y, RET.x, v.top + 14, 8); joint(RET.x, v.top + 14, 8); pipe(RET.x, v.top + 14, v.x, v.top + 14, 8, 'b');
      pipe(RET.x, HEADER.y, RET.x, f.top + 14, 8); joint(RET.x, f.top + 14, 8); pipe(RET.x, f.top + 14, f.x, f.top + 14, 8, 'b');
      clip(RET.x, 90, 8, true); clip(RET.x, 250, 8, true); clip(RET.x, 420, 8, true);
      sightGlass(RET.x, 110, 150, 8, returning ? 1 : 0, C.gold); sightGlass(RET.x, 300, 340, 8, returning ? 1 : 0, C.gold);
      valveH(64, HEADER.y, 8, valveOpen, 7);
      bucket(v.x, v.w, v.top, v.bottom, levelOf('company'), C.gold, returning ? 0.6 : 0.1);
      bucket(f.x, f.w, f.top, f.bottom, levelOf('fee'), C.gold, returning ? 0.6 : 0.1);
      label('BACK TO', 80, 62, 8, C.brass, 'left'); label('THE COMPANY', 80, 74, 8, C.brass, 'left');
      figure('+' + money(shownDollars('company')), 80, 94, 15, 'left'); note('after the admin fee', 80, 106, 'left');
      label('ADMIN FEE', 80, 490, 8, C.brass, 'left'); figure(money(shownDollars('fee')), 80, 508, 13, 'left'); note('from company savings', 80, 520, 'left');
      note('saved tax', 64, HEADER.y - 17, 'center', 8);
      ctx.globalAlpha = 1;
    }

    /* --- the inlet and the main run --- */
    pipe(MAIN.x, 20, MAIN.x, HEADER.y, MAIN.bore, 'a');
    clip(MAIN.x, 52, MAIN.bore, true);
    sightGlass(MAIN.x, MAIN.glass[0], MAIN.glass[1], MAIN.bore, flow, C.pay);
    valve(MAIN.x, MAIN.valveY, MAIN.bore, valveOpen, 15);
    joint(MAIN.x, HEADER.y, HEADER.bore + 8);
    pipe(MAIN.x, HEADER.y, MAIN.x, MAIN.end, 20, 'b');
    clip(MAIN.x, 236, 20, true); clip(MAIN.x, 400, 20, true);
    sightGlass(MAIN.x, 300, 346, 20, flow, C.pay);
    pipe(HEADER.l, HEADER.y, hr, HEADER.y, HEADER.bore);
    clip(146, HEADER.y, HEADER.bore, false); clip(326, HEADER.y, HEADER.bore, false);
    cap(hr + 3, HEADER.y, HEADER.bore, false);
    label('COMPANY PAYROLL', MAIN.x + 24, 128, 10.5, C.brass, 'left');
    figure(money(act === 'idle' ? S.total : S.total * poured), MAIN.x + 24, 146, 15, 'left');
    note(many ? 'comes in at the top · ' + S.employees + ' employees' : 'comes in at the top', MAIN.x + 24, 158, 'left');
    note('MAIN VALVE', MAIN.x - 46, MAIN.valveY + 3, 'right', 7.5);
    headline();

    const poolLvl = Math.min(POOL.bottom - POOL.top - 3, levelOf('bank')), poolSurface = POOL.bottom - 1.5 - poolLvl;
    let acaSurface = ROW.bottom - 1.5;
    for (const key of ['taxes', 'health', 'fsa', 'k401', 'aca']) {
      const b = BR[key], isAca = key === 'aca';
      if (isAca && engage < 0.02) continue;
      ctx.save(); if (isAca) { ctx.globalAlpha = engage; ctx.translate((1 - engage) * 60, 0); }
      const amount = d[key], throttled = key === 'taxes' && aca ? d.taxes / S.dollars.off.taxes : 1;
      joint(b.x, HEADER.y, HEADER.bore + 4);
      pipe(b.x, HEADER.y, b.x, PIPE_END, b.bore, 'b');
      sightGlass(b.x, GLASS[0], GLASS[1], b.bore, flow, C.pay);
      valve(b.x, VALVE_Y, b.bore, valveOpen * throttled, 9);
      const lvl = Math.min(ROW.bottom - ROW.top - 3, levelOf(key)), surface = ROW.bottom - 1.5 - lvl, w = 2 + 18 * share(amount);
      const r = run(streamOn() + 0.25, streamOff(), PIPE_END + 3, surface), stir = r && r[1] >= surface - 1 ? 1 : 0.1;
      if (isAca) {
        acaSurface = surface;
        const planH = Math.min(lvl, hOf(d.aca * planShare() * fillBucket() * (1 - pay()), b.bw)), planTop = ROW.bottom - 1.5 - planH;
        bucket(b.bx, b.bw, ROW.top, ROW.bottom, lvl, C.pay, stir, { y: ROW.top + 10, w: 66, lines: [...b.name, money(S.level) + ' TIER'], amount: money(shownDollars(key)) }, () => {
          water(b.bx + 1.5, b.bw - 3, surface, planTop, C.pay, stir);
          water(b.bx + 1.5, b.bw - 3, planTop, ROW.bottom - 1.5, C.plan, 0.1, 0.9);
          const my = ROW.bottom - 1.5 - hOf(d.aca * planShare(), b.bw);
          ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(b.bx + 2, my); ctx.lineTo(b.bx + b.bw - 2, my); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(244,238,221,.7)'; ctx.stroke(); ctx.setLineDash([]);
          text('PLAN $', b.bx + 6, my - 2, 6.5, C.ivory, { serif: true, weight: 700, align: 'left', space: 0.6 });
          const gx = b.bx + 14, gy = ROW.bottom - 4;
          rr(gx, gy - 3, 26, 3.5, 1); ctx.fillStyle = C.nickelMid; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.5; ctx.stroke();
          ctx.beginPath(); for (let i = 3; i < 26; i += 4) { ctx.moveTo(gx + i, gy - 2.5); ctx.lineTo(gx + i, gy - 0.5); } ctx.lineWidth = 0.8; ctx.strokeStyle = '#0D1427'; ctx.stroke();
          if (pay() > 0 && pay() < 1) { ctx.beginPath(); ctx.ellipse(gx + 13, gy - 6, 9 - 2 * Math.sin(clock * 9), 2.4, 0, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); }
        });
        note('drains to the plan', b.bx + 27, ROW.bottom + 13, 'center', 7);
      } else {
        bucket(b.bx, b.bw, ROW.top, ROW.bottom, lvl, C.pay, stir, { y: ROW.top + 10, lines: b.name, amount: money(shownDollars(key)) });
        if (key === 'fsa') { note('existing', b.bx + b.bw / 2, ROW.bottom + 13, 'center', 7); note('Section 125', b.bx + b.bw / 2, ROW.bottom + 22, 'center', 7); }
      }
      if (r) { stream(b.x, w, r[0], r[1]); if (r[1] >= surface - 1) hit(b.x, surface, w); }
      if (key === 'taxes' && engage > 0.02) {
        const y = ROW.bottom - 1.5 - Math.min(96, hOf(S.dollars.off.taxes, b.bw));
        ctx.globalAlpha = engage; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(b.bx + 3, y); ctx.lineTo(b.bx + b.bw - 3, y); ctx.lineWidth = 1; ctx.strokeStyle = C.ivory; ctx.stroke(); ctx.setLineDash([]);
        note('without the plan', b.bx + b.bw / 2, y - 3, 'center', 7.5);
        if (finished) figure('▼ ' + money(S.delta.taxes) + ' less', b.bx + b.bw / 2, ROW.bottom + 18, 11, 'center', '#E8C66A');
        ctx.globalAlpha = 1;
      }
      if (isAca) {
        const p = VESSEL.plan, drainOn = pay() > 0 && pay() < 1, px = p.x + p.w / 2;
        pipe(px, ROW.bottom, px, p.top, 6, 'b');
        sightGlass(px, 378, 392, 6, drainOn ? 1 : 0, C.plan);
        bucket(p.x, p.w, p.top, p.bottom, levelOf('plan'), C.plan, drainOn ? 0.5 : 0.1);
        label('PLAN DOLLARS', 430, 414, 8, C.brass, 'right'); figure(money(shownDollars('plan')), 430, 430, 13, 'right'); note("the employee's withholding", 430, 441, 'right', 7.5); note('toward the benefits', 430, 450, 'right', 7.5);
      }
      ctx.restore();
    }
    {
      const y = 412, xr = BR.health.bx + BR.health.bw;
      ctx.beginPath(); ctx.moveTo(BR.taxes.bx, y - 5); ctx.lineTo(BR.taxes.bx, y); ctx.lineTo(xr, y); ctx.lineTo(xr, y - 5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(207,168,79,.6)'; ctx.stroke();
      label('PRE-TAX BUCKETS', (BR.taxes.bx + xr) / 2, y + 12, 7.5, C.brass);
    }

    /* --- the post-tax bucket --- */
    const fallW = 3 + 18 * share(d.bank), fr = run(streamOn() + 0.5, streamOff() + 0.2, MAIN.end + 3, poolSurface);
    const payLvl = Math.min(poolLvl, hOf(d.bank * fillPool(), POOL.w)), rewardLvl = poolLvl - payLvl;
    bucket(POOL.x, POOL.w, POOL.top, POOL.bottom, poolLvl, C.pay, 0.1, null, () => {
      water(POOL.x + 1.5, POOL.w - 3, POOL.bottom - 1.5 - payLvl, POOL.bottom - 1.5, C.pay, fr && fr[1] >= poolSurface - 1 ? 1 : 0.12, 0.7);
      if (rewardLvl > 0.5) water(POOL.x + 1.5, POOL.w - 3, poolSurface, POOL.bottom - 1.5 - payLvl, C.reward, rewardOpen > 0.5 && pay() < 1 ? 1 : 0.12, 0.9);
    });
    if (fr) { stream(MAIN.x, fallW, fr[0], fr[1]); if (fr[1] >= poolSurface - 1) hit(MAIN.x, poolSurface, fallW); }
    if (rewardLvl > 7) { const ty = Math.max(poolSurface + 3, POOL.top + 62); rr(POOL.x + 60, ty, 100, 12, 2); ctx.fillStyle = 'rgba(8,14,30,.8)'; ctx.fill(); note('Wellness Reward · post-tax', POOL.x + 110, ty + 9, 'center', 7.5); }
    nameplate(280, POOL.top + 10, 180, [many ? "EMPLOYEES' TAKE-HOME" : "EMPLOYEE'S TAKE-HOME"], money(shownDollars('bank')), won ? 'POST-TAX  ·  +' + money(S.delta.bank) + ' a month with the plan' : 'POST-TAX BUCKET');

    /* --- the Trigger gear train and the ACA indemnity supply (ACA on) --- */
    if (engage > 0.02) {
      ctx.globalAlpha = engage;
      const lit = paying || lastSent, b = BR.aca;
      const rise = ROW.bottom - 1.5 - acaSurface, travel = rise * 0.25 + 6 * snap;
      const fx = b.bx + b.bw - 6, fy = Math.min(acaSurface - 4, ROW.bottom - 8);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, RACK.top - travel + 4); ctx.lineTo(RACK.x, RACK.top - travel + 4); ctx.lineWidth = 2; ctx.strokeStyle = C.nickel; ctx.stroke();
      const fg = ctx.createRadialGradient(fx - 2, fy - 2, 0.5, fx, fy, 5.5); fg.addColorStop(0, C.brassHi); fg.addColorStop(1, C.brassLo);
      ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0, TAU); ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = nickelGrad(fx - 4, 0, fx + 4, 0); rr(fx - 4, ROW.top - 1, 8, 7, 1.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
      const ry = RACK.top - travel;
      ctx.fillStyle = nickelGrad(RACK.x - 2, 0, RACK.x + 2, 0); ctx.fillRect(RACK.x - 2, ry, 4, RACK.bottom - RACK.top); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.6; ctx.strokeRect(RACK.x - 2, ry, 4, RACK.bottom - RACK.top);
      ctx.beginPath(); for (let yy = ry + 2; yy < ry + RACK.bottom - RACK.top; yy += 4.6) { ctx.moveTo(RACK.x + 2, yy); ctx.lineTo(RACK.x + 4.5, yy + 1.2); ctx.lineTo(RACK.x + 2, yy + 2.4); } ctx.fillStyle = C.nickel; ctx.fill();
      for (const gy of [272, 332]) { ctx.fillStyle = brassGrad(RACK.x - 5, 0, RACK.x + 5, 0); rr(RACK.x - 5, gy, 10, 6, 1); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6; ctx.stroke(); screw(RACK.x - 8, gy + 3); }
      const a1 = travel / GEARS[0].r;
      const angles = [a1, -a1 * (GEARS[0].r / GEARS[1].r), a1 * (GEARS[0].r / GEARS[2].r)];
      ctx.fillStyle = nickelGrad(GEARS[2].x - 2.5, 0, GEARS[2].x + 2.5, 0); ctx.fillRect(GEARS[2].x - 2.5, GEARS[2].y, 5, SUPPLY.y - GEARS[2].y); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.6; ctx.strokeRect(GEARS[2].x - 2.5, GEARS[2].y, 5, SUPPLY.y - GEARS[2].y);
      for (const by of [380, 430]) { ctx.fillStyle = brassGrad(GEARS[2].x - 6, 0, GEARS[2].x + 6, 0); rr(GEARS[2].x - 6, by, 12, 7, 1.5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke(); screw(GEARS[2].x - 9, by + 3.5); screw(GEARS[2].x + 9, by + 3.5); }
      GEARS.forEach((g, i) => gear(g.x, g.y, g.r, g.n, angles[i], lit && i === 2));
      nameplate(GEARS[0].x, 212, 46, ['TRIGGER'], null, null);
      if (lit && !paying && Math.floor(clock * 6) % 2 === 0) dot(GEARS[0].x - 29, 221, 2.2, AMBER);
      pipe(POOL.x + POOL.w, SUPPLY.y, SUPPLY.edge, SUPPLY.y, 10, 'b');
      clip(470, SUPPLY.y, 10, false);
      sightGlass(SUPPLY.y, SUPPLY.glass[0], SUPPLY.glass[1], 10, rewardOpen > 0.5 && pay() < 1 ? 1 : 0, C.reward, true);
      sightGlass(SUPPLY.y, 524, 534, 10, rewardOpen > 0.5 && pay() < 1 ? 1 : 0, C.reward, true, 1);
      valveH(SUPPLY.valveX, SUPPLY.y, 10, rewardOpen, 12, rewardOpen > 0.3 && pay() < 1);
      if (rewardOpen > 0.05 && pay() < 1) {
        const w = (3 + 18 * share(S.after.reward)) * (1 - pay() * pay()), x0 = POOL.x + POOL.w - 2;
        ctx.fillStyle = rgba(C.reward, 0.9); ctx.beginPath();
        ctx.moveTo(x0, SUPPLY.y - 4); ctx.quadraticCurveTo(x0 - 26, SUPPLY.y - 2, x0 - 34, poolSurface); ctx.lineTo(x0 - 34 - w, poolSurface); ctx.quadraticCurveTo(x0 - 24, SUPPLY.y + 4 + w, x0, SUPPLY.y + 4); ctx.fill();
        hit(x0 - 34 - w / 2, poolSurface, w);
      }
      label('FIXED INDEMNITY', 470, SUPPLY.y + 24, 7.5, '#8FC2FF'); note('supplies the Wellness Reward, post-tax', 470, SUPPLY.y + 35, 'center', 7.5); note("its own line, not the company's", 470, SUPPLY.y + 45, 'center', 7.5);
      note('from the plan →', SUPPLY.edge - 2, SUPPLY.y - 15, 'right', 7.5);
      if (paying && clock - armedAt < 0.35) { ctx.fillStyle = 'rgba(255,244,199,' + 0.18 * (1 - (clock - armedAt) / 0.35) + ')'; ctx.fillRect(20, 20, W - 40, H - 40); }
      ctx.globalAlpha = 1;
    }

    for (const p of drops) { ctx.globalAlpha = Math.max(0, p.a); ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, TAU); ctx.fillStyle = 'rgba(225,240,255,.9)'; ctx.fill(); }
    ctx.globalAlpha = 1;

    const drop = (c, x, y) => { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + 5, y, x, y + 3.5); ctx.quadraticCurveTo(x - 5, y, x, y - 6); ctx.fillStyle = rgba(c, 0.95); ctx.fill(); };
    drop(C.pay, 40, 616); note('payroll', 50, 620, 'left');
    if (engage > 0.5) { drop(C.gold, 104, 616); note('back to the company', 114, 620, 'left'); drop(C.plan, 222, 616); note('Plan Dollars', 232, 620, 'left'); drop(C.reward, 312, 616); note('Wellness Reward, from the plan', 322, 620, 'left'); }
    note('Water is money: one scale for every bucket and vessel', 280, 636, 'center', 8);
    label('SECTION 125 WELLNESS ILLUSTRATION TOOL', 280, 652, 7, 'rgba(207,168,79,.7)');
  }

  let seen = true;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt); draw();
    const busy = running || engage !== (aca ? 1 : 0) || drops.length || Math.abs(valveOpen - (act !== 'idle' && t < POUR ? 1 : 0)) > 0.01 || (aca && seen && !still.matches);
    if (busy) raf = requestAnimationFrame(frame); else { raf = 0; last = 0; }
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const settle = () => { if (still.matches) engage = aca ? 1 : 0; emit(); draw(); kick(); };
  new IntersectionObserver((e) => { seen = e[e.length - 1].isIntersecting; if (seen) kick(); }).observe(cv);

  const api = {
    sfx: null,
    on(fn) { listeners.push(fn); },
    // The live water levels, 0..1 of each vessel's height, for a companion figure.
    levels: () => ({ taxes: levelOf('taxes') / 98, health: levelOf('health') / 98, fsa: levelOf('fsa') / 98, k401: levelOf('k401') / 98, aca: levelOf('aca') / 98, bank: levelOf('bank') / 128, company: levelOf('company') / 72, fee: levelOf('fee') / 68, plan: levelOf('plan') / 44, reward: aca ? (levelOf('bank') - hOf(D().bank * fillPool(), POOL.w)) / 128 : 0, flow: flowing() ? 1 : 0, pay: pay(), poured: act === 'idle' ? 0 : clamp(t / POUR, 0, 1) }),
    state: () => ({ aca, scope, running, finished, act, lastOut: aca && act === 'drop' && lastSent, scenario: S }),
    setAca(v) { aca = !!v; reset(); sfx(aca ? 'engage' : 'disengage'); settle(); },
    setScenario(s, which) { S = s; scope = which; reset(); settle(); },
    start() { reset(); act = 'drop'; running = true; sfx('start'); emit(); if (still.matches) api.finish(); else kick(); },
    finish(seconds = 100) { if (act === 'idle') act = 'drop'; running = true; engage = aca ? 1 : 0; quiet = true; for (let i = 0; i < seconds * 60 && running; i++) step(1 / 60); quiet = false; drops = []; draw(); kick(); },
  };
  window.FOUNTAIN = api;
  reset(); draw();
})();
