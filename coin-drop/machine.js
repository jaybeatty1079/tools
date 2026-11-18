/* The payroll coin drop. A front view of an arcade coin pusher: coins leave the Company at the top, bounce down a peg field
   and land in trays. Every coin has a destination before it drops (the counts come from model.js); the pegs only decide the
   route it takes to get there, so the piles always match the numbers. One cabinet serves both machines: a single paycheck
   and a whole company's payroll differ only in the scenario they are given.

   With Pulse off the cabinet is plain: muted colors, no lights. Switching Pulse on transforms it: `engage` runs 0 to 1 and
   every color, glow and moving part reads from it. A Pulse run has three acts:
     drop    payroll falls; $1,200 lands in the Pulse Section 125 tray beside the other withholdings
     armed   the last coin into the employee's tray trips the Trigger
     payout  a hidden door pays the Wellness Reward into the employee's tray, and the Section 125 tray empties:
             most of it leaves through a side door, and the Plan $ part runs down a chute to its own box */
(function () {
  'use strict';
  const M = window.CoinModel;
  const cv = document.getElementById('machine'), ctx = cv.getContext('2d');
  const W = 560, H = 664, R = 5, DPR = 2, TAU = Math.PI * 2;
  cv.width = W * DPR; cv.height = H * DPR;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');

  // Colors: the lit palette, and a muted one made from it for the plain machine.
  const LIT = { taxes: [255, 122, 102], health: [63, 208, 192], k401: [245, 194, 75], pulse: [75, 163, 245], plan: [75, 163, 245], fee: [198, 240, 66], company: [198, 240, 66], bank: [183, 156, 255], ink: [243, 246, 250], mute: [196, 206, 222], line: [59, 71, 98] };
  const DULL = {};
  for (const k in LIT) { const [r, g, b] = LIT[k], y = 0.3 * r + 0.59 * g + 0.11 * b; DULL[k] = [r, g, b].map((v) => (v * 0.3 + y * 0.7) * 0.78); }
  DULL.ink = [230, 233, 238]; DULL.mute = [200, 205, 214]; DULL.line = [58, 62, 70];
  let P = {}; // this frame's palette, as [r, g, b]
  const rgb = (k, a = 1) => 'rgba(' + P[k][0] + ',' + P[k][1] + ',' + P[k][2] + ',' + a + ')';
  // Lettering stays readable on the plain machine: its muted color is lifted toward white, then runs to full color with Pulse on.
  const tint = (k) => 'rgb(' + [0, 1, 2].map((i) => { const d = DULL[k][i] * 0.5 + 116; return Math.round(d + (LIT[k][i] - d) * engage); }).join(',') + ')';

  // Columns are 38 apart; a coin moves half a column at every peg row. With Pulse on the peg rows close up by a pixel each
  // and the four trays ride up by UP.
  const X = (p) => 280 + 38 * p;
  const A0 = 104, ROWS_A = 14, UP = 14, TRAY_TOP = 290, TRAY_BOT = 370, B0 = 426, ROWB = 15, ROWS_B = 4, SHELF = 500, BANK_TOP = 512, BANK_BOT = 606;
  const BINS = {
    taxes: { x: 71, w: 114, cols: 12, bottom: TRAY_BOT, tray: true, name: ['PAYROLL TAXES'] },
    health: { x: 223, w: 76, cols: 7, bottom: TRAY_BOT, tray: true, name: ['HEALTH', 'INSURANCE'] },
    k401: { x: 341, w: 30, cols: 3, bottom: TRAY_BOT, tray: true, name: ['401(k)'] },
    pulse: { x: 402, w: 90, cols: 9, bottom: TRAY_BOT, tray: true, rise: 5.4, name: ['SECTION 125', 'WELLNESS'] },
    bank: { x: 150, w: 260, cols: 26, bottom: BANK_BOT, fromRight: true },
    plan: { x: 444, w: 72, cols: 6, bottom: 592 },
    fee: { x: 52, w: 72, cols: 6, bottom: 586 },
    backL: { x: 50, w: 92, cols: 8, bottom: 93 },
    backR: { x: 418, w: 92, cols: 8, bottom: 93 },
  };
  const COLS = { taxes: [-5, -4, -3], health: [-1, 0], k401: [2], pulse: [4, 5] };
  const LIFT = { L: 21, R: 539 }, OPEN = 380; // the two return lifts; where the shelf ends and the opening begins
  const DOOR = { x: 421, y: 470, w: 17, h: 26 }; // the hidden reward door, in the wall beside the opening
  const CUP = { col: 1, x: 318, top: 428, bottom: 452, seat: 445 }; // the Trigger: a catch cup under the pre-tax row, in the gap between two trays

  let S = M.single(), scope = 'employee';
  let pulse = false, engage = 0, running = false, finished = false, finishedAt = 0, clock = 0, coins = [], released = 0, raf = 0, last = 0, quiet = false;
  let reserved = {}, landed = {}, resting = {}, hit = {}, flashes = [], face = 146, prevFace = 146, pushing = false;
  let lastCoin = null, lastOut = false, sweepT = 0, act = 'idle', through = 0, firedAt = -9, trigHit = -9, paidIn = 0, sideDoor = 0, rewardDoor = 0;
  const listeners = [];
  const emit = () => listeners.forEach((fn) => fn(api.state()));
  const sfx = (name, lime) => { if (!quiet && api.sfx) api.sfx(name, { pulse, lime }); };
  const mode = () => (pulse ? 'on' : 'off');
  const rowA = () => (pulse ? 12 : 13), lifted = () => (pulse ? UP : 0);

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const hops = (n, rights) => shuffle(Array.from({ length: n }, (_, i) => (i < rights ? 0.5 : -0.5)));
  function slotOf(key, n) {
    const b = BINS[key], pitch = b.w / b.cols, row = Math.floor(n / b.cols), at = n % b.cols, col = b.fromRight ? b.cols - 1 - at : at;
    return { x: b.x + pitch * (col + 0.5) + (row % 2 ? 1.5 : -1.5), y: b.bottom - (b.tray ? lifted() : 0) - R - 1 - row * (b.rise || 6) };
  }

  // The route of one payroll coin, as a queue of moves.
  function plan(c, i) {
    const q = [], row = rowA(), endA = A0 + ROWS_A * row;
    const side = i % 2 ? 'R' : 'L';
    const j = c.last ? CUP.col : c.dest === 'company' ? (side === 'L' ? -6 : 6) : c.dest === 'fee' ? -6 : pick(c.dest === 'bank' ? (pulse ? [-2, 3] : [-2, 1, 3, 4, 5]) : COLS[c.dest]);
    let p = 0, r = 0;
    for (const s of hops(ROWS_A, 7 + j)) { p += s; r++; q.push({ x: X(p), y: A0 + r * row, dur: 0.12 + Math.random() * 0.05, kind: 'hop', peg: r < ROWS_A }); }
    if (c.last) {
      // The last coin drops alone into the Trigger cup, sits a moment, then tips out toward the employee's tray.
      q.push({ x: CUP.x, y: CUP.seat, dur: 0.34, kind: 'fall' }, { gate: true }, { x: CUP.x, y: CUP.seat + 0.5, dur: 0.24, kind: 'line' },
        { x: 372, y: SHELF - R, dur: 0.32, kind: 'fall' }, { x: OPEN + 8, y: SHELF - R + 1, dur: 0.1, kind: 'line' }, { reserve: 'bank' });
    } else if (c.dest === 'bank') {
      q.push({ x: X(j), y: B0, dur: 0.3, kind: 'fall' });
      const j1 = pick([-3, -2, -1, 0, 1, 2, 3].filter((e) => Math.abs(e - j) <= 2));
      let pb = j, n = 0;
      for (const s of hops(ROWS_B, 2 + (j1 - j))) { pb += s; n++; q.push({ x: X(pb), y: B0 + n * ROWB, dur: 0.13 + Math.random() * 0.05, kind: 'hop', peg: true }); }
      q.push({ x: X(j1) + (Math.random() - 0.5) * 12, y: SHELF - R - Math.random() * 6, dur: 0.12, kind: 'fall' }, { shelf: true }, { reserve: 'bank' });
    } else if (c.dest === 'company') {
      // Into the cup at the edge of the field, up the lift on that side, into the Company's wing.
      const cx = LIFT[side], dir = side === 'L' ? 1 : -1;
      q.push({ x: X(j), y: endA + 18, dur: 0.16, kind: 'fall' }, { x: cx, y: endA + 28, dur: 0.14, kind: 'line' }, { x: cx, y: 58, dur: 1.0, kind: 'line' },
        { x: cx + dir * 22, y: 54, dur: 0.12, kind: 'line' }, { reserve: side === 'L' ? 'backL' : 'backR' });
    } else if (c.dest === 'fee') {
      // Into the left cup, then down the fee chute to the Pulse admin fee box.
      q.push({ x: X(j), y: endA + 18, dur: 0.16, kind: 'fall' }, { x: LIFT.L, y: endA + 30, dur: 0.14, kind: 'line' }, { x: LIFT.L, y: 526, dur: 0.8, kind: 'line' },
        { x: 46, y: 540, dur: 0.12, kind: 'line' }, { reserve: 'fee' });
    } else q.push({ reserve: c.dest });
    return q;
  }

  function reset() {
    coins = []; released = 0; finished = false; running = false; flashes = []; face = prevFace = 146; pushing = false;
    lastCoin = null; lastOut = false; sweepT = 0; act = 'idle'; through = 0; firedAt = -9; trigHit = -9; paidIn = 0; sideDoor = 0; rewardDoor = 0;
    for (const k in BINS) { reserved[k] = 0; landed[k] = 0; resting[k] = []; hit[k] = -9; }
  }
  function load() {
    reset();
    const counts = S.coins[mode()];
    for (const key of M.KEYS) for (let i = 0; i < counts[key]; i++) coins.push({ dest: key, lime: pulse && (key === 'company' || key === 'fee') });
    shuffle(coins);
    // With Pulse on, one coin headed for the employee is held back until everything else has landed. It then drops alone
    // into the Trigger cup.
    lastCoin = null; lastOut = false;
    if (pulse) for (let i = coins.length - 1; i >= 0; i--) if (coins[i].dest === 'bank') { lastCoin = coins[i]; lastCoin.last = true; break; }
    let back = 0;
    coins.forEach((c, i) => {
      c.wait = c.last ? 1e9 : i * 0.012; c.state = 'wait'; c.x = 280; c.y = A0 - 6;
      c.q = plan(c, c.dest === 'company' ? back++ : i);
      c.spin = Math.random() * TAU; c.rate = 7 + Math.random() * 8; c.ahead = Math.random() * 14;
    });
    act = 'drop';
  }
  // The payout: the Wellness Reward comes out of the hidden door, and the Section 125 tray empties.
  function payout() {
    act = 'payout'; sfx('reward');
    for (let i = 0; i < S.after.rewardCoins; i++) {
      coins.push({ dest: 'bank', reward: true, state: 'wait', wait: 0.5 + i * 0.014, x: DOOR.x + 6, y: DOOR.y + 14, spin: Math.random() * TAU, rate: 9 + Math.random() * 8,
        q: [{ x: 393 + Math.random() * 14, y: SHELF + 1, dur: 0.16, kind: 'hop' }, { reserve: 'bank' }] });
    }
    // Top of the tray first. The last few, the Plan $ part, leave by the same door and run down the chute.
    const pile = resting.pulse.filter(Boolean).sort((a, b) => b.n - a.n), keep = S.after.planCoins, doorY = TRAY_BOT - UP - 20;
    pile.forEach((c, k) => {
      const toPlan = k >= pile.length - keep;
      c.leaving = true; c.state = 'wait'; c.wait = 0.2 + k * 0.012;
      c.q = toPlan
        ? [{ x: 498, y: doorY, dur: 0.16, kind: 'line' }, { x: 508, y: doorY + 12, dur: 0.1, kind: 'line' }, { x: 508, y: 548, dur: 0.75, kind: 'line' }, { reserve: 'plan' }]
        : [{ x: 498, y: doorY, dur: 0.16, kind: 'line' }, { x: 516, y: doorY + 3, dur: 0.22, kind: 'line', fade: true }, { gone: true }];
    });
  }

  function next(c) {
    const step = c.q.shift();
    if (!step) return;
    if (step.shelf) { c.state = 'shelf'; return; }
    if (step.gone) { c.state = 'gone'; return; }
    if (step.gate) { act = 'armed'; firedAt = clock; sfx('trigger'); return next(c); } // the coin lands in the cup: the Trigger trips
    if (step.reserve) {
      const key = step.reserve, n = reserved[key]++, s = slotOf(key, n);
      c.n = n;
      c.seg = { x0: c.x, y0: c.y, x: s.x, y: s.y, dur: Math.max(0.16, Math.sqrt(Math.abs(s.y - c.y)) * 0.03) * (0.8 + Math.random() * 0.6), kind: 'fall', land: key };
      if (key === 'bank' && !c.reward) through++;
    } else {
      // A hop starts by glancing off the peg right under the coin: light that peg.
      if (step.peg) { if (flashes.length < 500) flashes.push({ x: c.x, y: step.y + 6.5, t: clock, lime: c.lime }); sfx('peg', c.lime); }
      c.seg = { x0: c.x, y0: c.y, x: step.x, y: step.y, dur: step.dur, kind: step.kind, fade: step.fade };
    }
    c.u = 0; c.state = 'move';
  }
  function place(c) {
    const s = c.seg, u = Math.min(1, c.u);
    c.x = s.x0 + (s.x - s.x0) * (s.kind === 'fall' ? Math.min(1, u * 1.6) : u);
    if (s.kind === 'hop') c.y = s.y0 + (s.y - s.y0) * (u * u * 0.55 + u * 0.45) - 5 * Math.sin(Math.PI * u) * (1 - u);
    else if (s.kind === 'fall') c.y = s.y0 + (s.y - s.y0) * u * u;
    else c.y = s.y0 + (s.y - s.y0) * u;
  }
  // The pusher: one blade that sweeps left to right along the shelf, lifts, and returns.
  function sweep(dt) {
    sweepT += dt;
    const u = (sweepT % 1.9) / 1.9, was = pushing, on = running && act === 'drop' && !lastOut;
    prevFace = face; pushing = on && u < 0.72;
    if (pushing) { const e = u / 0.72; face = 146 + 244 * e * e * (3 - 2 * e); } else face = on ? 390 - 244 * ((u - 0.72) / 0.28) : 146;
    if (pushing && !was) sfx('push');
  }
  function step(dt) {
    clock += dt;
    engage += ((pulse ? 1 : 0) - engage) * Math.min(1, dt / 0.4);
    if (Math.abs((pulse ? 1 : 0) - engage) < 0.004) engage = pulse ? 1 : 0;
    while (flashes.length && clock - flashes[0].t > 0.42) flashes.shift();
    sweep(dt);
    const opening = act === 'payout' ? 1 : 0;
    sideDoor += (opening - sideDoor) * Math.min(1, dt / 0.12); rewardDoor += (opening - rewardDoor) * Math.min(1, dt / 0.12);
    if (!running) return;
    if (act === 'armed' && clock - firedAt > 0.18) payout(); // the door answers at once
    let done = 0;
    for (const c of coins) {
      if (c.state === 'rest' || c.state === 'gone') { done++; continue; }
      if (c.state === 'wait') {
        c.wait -= dt;
        if (c.wait <= 0) {
          if (c.leaving) { resting.pulse[c.n] = undefined; landed.pulse--; c.leaving = false; } else if (!c.reward) released++;
          next(c);
        }
        continue;
      }
      if (c.state === 'shelf') {
        if (pushing && c.x < face + R + c.ahead && c.x > prevFace - 4) c.x = face + R + c.ahead;
        if (c.x >= OPEN + 4) next(c);
        continue;
      }
      c.u += dt / c.seg.dur;
      place(c);
      if (c.u >= 1) {
        if (c.seg.land) {
          const key = c.seg.land; c.state = 'rest'; landed[key]++; resting[key][c.n] = c; hit[key] = clock; done++;
          if (c.reward) paidIn++;
          sfx('land', c.lime || c.reward);
        } else next(c);
      }
    }
    if (lastCoin && !lastOut && act === 'drop' && done === coins.length - 1) { lastOut = true; lastCoin.wait = 0.55; sfx('ready'); } // everything else is home: send the last coin
    if (done === coins.length && (act === 'payout' || (act === 'drop' && !pulse))) { running = false; finished = true; finishedAt = clock; act = 'done'; sfx('finish'); emit(); }
  }

  /* ---------- sprites and the two static cabinets, drawn once ---------- */
  function layer(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w * DPR; c.height = h * DPR;
    const g = c.getContext('2d'); g.scale(DPR, DPR); paint(g); return c;
  }
  const SPR = 16; // sprite box for a coin of radius R
  function coinSprite(light, mid, dark, rim, shine) {
    return layer(SPR, SPR, (g) => {
      const c = SPR / 2, grad = g.createRadialGradient(c - 1.6, c - 1.8, 0.4, c, c, R);
      grad.addColorStop(0, light); grad.addColorStop(0.55, mid); grad.addColorStop(1, dark);
      g.beginPath(); g.arc(c, c, R, 0, TAU); g.fillStyle = grad; g.fill(); g.lineWidth = 0.9; g.strokeStyle = rim; g.stroke();
      g.beginPath(); g.arc(c, c, R - 1.7, 0, TAU); g.lineWidth = 0.6; g.strokeStyle = 'rgba(255,255,255,' + 0.28 * shine + ')'; g.stroke();
      g.beginPath(); g.arc(c - 1.5, c - 1.6, 1.2, 0, TAU); g.fillStyle = 'rgba(255,255,255,' + 0.75 * shine + ')'; g.fill();
    });
  }
  const GOLD = coinSprite('#FFF1BF', '#EBC562', '#B98A2A', '#8A6418', 1), LIME = coinSprite('#F6FFB8', '#C6F042', '#8DAE1C', '#5F7A10', 1);
  const BLUE = coinSprite('#D9EEFF', '#5BB0FA', '#2A74C4', '#1B4F8C', 1); // the Wellness Reward, paid by Pulse
  const WORN = coinSprite('#CFC7AE', '#A39A7E', '#6E6752', '#494435', 0.35); // the plain machine's coins
  const halo = (r, g, b) => layer(32, 32, (c) => {
    const grad = c.createRadialGradient(16, 16, 2, 16, 16, 15); grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',.55)'); grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    c.fillStyle = grad; c.fillRect(0, 0, 32, 32);
  });
  const GLOW = halo(198, 240, 66), BGLOW = halo(75, 163, 245), WGLOW = halo(255, 226, 130);
  const rrOn = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function cabinet(lit) {
    return layer(W, H, (g) => {
      let grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, lit ? '#1b2436' : '#1b1d22'); grad.addColorStop(1, lit ? '#0d131f' : '#131418');
      rrOn(g, 1, 1, W - 2, H - 2, 18); g.fillStyle = grad; g.fill(); g.lineWidth = 2; g.strokeStyle = lit ? '#34405a' : '#2e3138'; g.stroke();
      rrOn(g, 5, 5, W - 10, H - 10, 14); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.05)'; g.stroke();
      for (const [x, y] of [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]]) {
        g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fillStyle = lit ? '#3a4660' : '#35383f'; g.fill();
        g.beginPath(); g.moveTo(x - 1.8, y - 1.8); g.lineTo(x + 1.8, y + 1.8); g.lineWidth = 0.8; g.strokeStyle = '#141b29'; g.stroke();
      }
      // The glass. Lit: a deep panel with a pool of light. Plain: a flat dark board.
      rrOn(g, 38, 36, 484, 576, 9);
      if (lit) {
        grad = g.createLinearGradient(0, 36, 0, 612); grad.addColorStop(0, '#0a101b'); grad.addColorStop(0.5, '#0f1826'); grad.addColorStop(1, '#0a101b');
        g.fillStyle = grad; g.fill();
        grad = g.createRadialGradient(280, 230, 20, 280, 260, 330); grad.addColorStop(0, 'rgba(120,150,210,.11)'); grad.addColorStop(1, 'rgba(120,150,210,0)');
        g.fillStyle = grad; g.fill();
      } else { g.fillStyle = '#0e0f12'; g.fill(); }
      g.lineWidth = 3; g.strokeStyle = '#05080e'; g.stroke(); rrOn(g, 36.5, 34.5, 487, 579, 10); g.lineWidth = 1; g.strokeStyle = lit ? '#3b4762' : '#2e3138'; g.stroke();
      rrOn(g, 38, 5, 484, 26, 8); g.fillStyle = '#070a10'; g.fill();
    });
  }
  const PLAIN = cabinet(false), LITUP = cabinet(true);

  /* ---------- drawing ---------- */
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function text(s, x, y, size, color, weight = 800, align = 'center') {
    s = String(s).toUpperCase(); weight = Math.max(+weight, 800); // Jay, 2026-11-18: every letter capitalized and bold
    ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  }
  const glow = (k, blur) => { ctx.shadowColor = rgb(k); ctx.shadowBlur = blur * engage; };
  const noGlow = () => { ctx.shadowBlur = 0; };
  const sprite = (c) => (c.reward ? BLUE : c.lime ? LIME : engage > 0.5 ? GOLD : WORN);
  const coin = (c) => ctx.drawImage(sprite(c), c.x - SPR / 2, c.y - SPR / 2, SPR, SPR);
  const blink = (rate, phase = 0) => engage > 0.5 && Math.floor(clock * rate + phase) % 2 === 0;
  // The dollars a tray shows: it counts up as coins land and settles on the exact figure.
  function shownDollars(key) {
    const d = S.dollars[mode()], n = S.coins[mode()];
    if (key === 'company') return finished ? d.company : Math.min(d.company, (landed.backL + landed.backR) * S.coin);
    if (key === 'plan') return finished ? S.after.plan : Math.min(S.after.plan, landed.plan * S.coin);
    if (key === 'pulse') return act === 'payout' || act === 'done' ? (landed.pulse ? landed.pulse * S.coin : 0) : landed.pulse >= n.pulse ? d.pulse : landed.pulse * S.coin;
    if (key === 'bank') {
      const pay = landed.bank - paidIn >= n.bank ? d.bank : Math.min(d.bank, (landed.bank - paidIn) * S.coin);
      return pay + (finished && pulse ? S.after.reward : paidIn * S.coin);
    }
    return finished ? d[key] : Math.min(d[key], landed[key] * S.coin);
  }
  const justHit = (key) => Math.max(0, 1 - (clock - hit[key]) / 0.35); // a tray brightens for a moment when a coin lands
  function pegs(y0, row, rows) {
    const lit = engage > 0.5;
    for (let r = 1; r <= rows; r++) {
      const whole = r % 2 === 1; // a peg sits right under every place a coin can be on the row above
      for (let m = -6; m <= 6; m++) {
        const x = X(m + (whole ? 0 : 0.5)), y = y0 + r * row + 6.5;
        if (x < 46 || x > 514) continue;
        if (lit && y0 === B0 && r === 1 && (x === X(0) || x === X(1))) continue; // the Trigger cup and its plate sit here
        // With Pulse on, two bands of light sweep the posts: one blue running down to the right, one lime running back.
        const blue = lit && Math.sin(clock * 2.6 - x * 0.021 - y * 0.034) > 0.93, lime = lit && !blue && Math.sin(clock * 1.9 + x * 0.027 - y * 0.02 + 2) > 0.965;
        if (blue || lime) ctx.drawImage(blue ? BGLOW : GLOW, x - 9, y - 9, 18, 18);
        ctx.beginPath(); ctx.arc(x, y, blue || lime ? 2.9 : 2.4, 0, TAU); ctx.fillStyle = blue ? '#a9d6ff' : lime ? '#e6ff8a' : lit ? '#5d6b84' : '#4a4d55'; ctx.fill();
        if (lit && !blue && !lime) { ctx.beginPath(); ctx.arc(x - 0.7, y - 0.7, 0.9, 0, TAU); ctx.fillStyle = '#aab6cc'; ctx.fill(); }
      }
    }
  }
  function tray(key, up) {
    const b = BINS[key], isPulse = key === 'pulse', dx = isPulse ? (1 - engage) * 150 : 0, alpha = isPulse ? engage : 1, top = TRAY_TOP - up, bot = TRAY_BOT - up;
    if (alpha < 0.02) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(dx, 0);
    const grad = ctx.createLinearGradient(0, top, 0, bot); grad.addColorStop(0, rgb(key, 0.05)); grad.addColorStop(1, rgb(key, 0.1 + 0.12 * engage));
    rr(b.x, top, b.w, bot - top + 2, 5); ctx.fillStyle = grad; ctx.fill();
    resting[key].forEach((c) => c && coin(c));
    glow(key, (isPulse ? 12 : 3) + 12 * justHit(key));
    rr(b.x, top, b.w, bot - top + 2, 5); ctx.lineWidth = 2; ctx.strokeStyle = rgb(key); ctx.stroke(); noGlow();
    ctx.beginPath(); ctx.moveTo(b.x + 5, top + 3.5); ctx.lineTo(b.x + b.w - 5, top + 3.5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,' + 0.2 * engage + ')'; ctx.stroke();
    if (isPulse) {
      for (let i = 0; i < 9; i++) { // a strip of lights chasing along the new tray
        ctx.beginPath(); ctx.arc(b.x + 6 + i * 9.8, top - 5, 1.6, 0, TAU);
        ctx.fillStyle = (Math.floor(clock * 8) + i) % 3 === 0 ? rgb('company') : rgb('pulse', 0.35); ctx.fill();
      }
      // The side door, low on the right wall: shut during the drop, swung open for the payout.
      ctx.save(); ctx.translate(b.x + b.w, bot - 36); ctx.rotate(-1.2 * sideDoor);
      rr(-2, 0, 4, 32, 2); ctx.fillStyle = sideDoor > 0.1 ? rgb('ink') : rgb('pulse'); ctx.fill(); ctx.restore();
    }
    const cx = b.x + b.w / 2;
    b.name.forEach((line, i) => text(line, cx, bot + 17 + i * 15, 14, tint(key)));
    text(money(shownDollars(key)), cx, bot + 17 + b.name.length * 15 + 3, 16, rgb('ink'));
    ctx.restore();
  }
  // One return lift with its cup at the edge of the peg field and the Company wing it feeds.
  function lift(side, up) {
    const cx = LIFT[side], dir = side === 'L' ? 1 : -1, cupX = side === 'L' ? 40 : 496, name = side === 'L' ? 'backL' : 'backR', bin = BINS[name], cupY = 292 - up;
    ctx.globalAlpha = 0.28 + 0.72 * engage;
    glow('company', 8);
    rr(cx - 9, 44, 18, cupY - 12, 9); ctx.fillStyle = rgb('company', 0.05 * engage); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = engage > 0.5 ? rgb('company') : rgb('line'); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + dir * 9, 52); ctx.lineTo(cx + dir * 25, 52); ctx.stroke();
    rr(cupX, cupY, 24, 20, 4); ctx.stroke(); noGlow(); // the cup that catches coins at the edge of the field
    if (engage > 0.5) {
      for (let y = cupY + 14 - ((clock * 60) % 30); y > 56; y -= 30) { ctx.beginPath(); ctx.moveTo(cx - 5, y + 5); ctx.lineTo(cx, y); ctx.lineTo(cx + 5, y + 5); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cupX + 12, cupY - 6, 2.2, 0, TAU); ctx.fillStyle = blink(3, side === 'L' ? 0 : 1) ? rgb('company') : rgb('company', 0.25); ctx.fill();
    } else { rr(cupX - 1, cupY - 2, 26, 4, 2); ctx.fillStyle = rgb('line'); ctx.fill(); } // lid shut on the plain machine
    // The wing: shuttered when plain, open and lit with Pulse on.
    rr(bin.x, 66, bin.w, 29, 4); ctx.fillStyle = rgb('company', 0.04 + 0.08 * engage); ctx.fill();
    glow('company', 6 + 12 * justHit(name) + (finished && pulse ? 8 : 0)); ctx.stroke(); noGlow();
    if (engage < 0.98) { ctx.globalAlpha = (1 - engage) * 0.9; ctx.beginPath(); for (let x = bin.x + 8; x < bin.x + bin.w; x += 8) { ctx.moveTo(x, 69); ctx.lineTo(x, 92); } ctx.lineWidth = 1; ctx.strokeStyle = rgb('line'); ctx.stroke(); }
    ctx.globalAlpha = 1;
    resting[name].forEach((c) => c && coin(c));
  }
  // A chute down one side into a small box at the bottom. Left, in the Company's color: the Pulse admin fee, paid out of the
  // company's savings. Right, in Pulse blue: Plan $, the part of the Section 125 withholding that funds the benefits.
  function sideBox(key, tubeX, tubeTop, label) {
    const b = BINS[key], cx = b.x + b.w / 2, top = b.bottom - 38;
    ctx.globalAlpha = 0.25 + 0.75 * engage;
    glow(key, 8);
    rr(tubeX - 9, tubeTop, 18, 534 - tubeTop, 9); ctx.fillStyle = rgb(key, 0.05 * engage); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = engage > 0.5 ? rgb(key) : rgb('line'); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(label.from[0], label.from[1]); ctx.lineTo(label.to[0], label.to[1]); ctx.stroke();
    rr(b.x, top, b.w, 40, 5); ctx.fillStyle = rgb(key, 0.04 + 0.1 * engage); ctx.fill();
    glow(key, 6 + 12 * justHit(key)); ctx.stroke(); noGlow();
    if (engage > 0.5) for (let y = tubeTop + 12 + ((clock * 60) % 30); y < 522; y += 30) { ctx.beginPath(); ctx.moveTo(tubeX - 5, y - 5); ctx.lineTo(tubeX, y); ctx.lineTo(tubeX + 5, y - 5); ctx.stroke(); }
    ctx.globalAlpha = engage;
    label.draw(top);
    const at = label.amount || [cx, b.bottom + 18, 'center'];
    text(money(shownDollars(key)), at[0], at[1], 14, rgb('ink'), 800, at[2]);
    ctx.globalAlpha = 1;
    resting[key].forEach((c) => c && coin(c));
  }

  function draw() {
    for (const k in LIT) P[k] = LIT[k].map((v, i) => Math.round(DULL[k][i] + (v - DULL[k][i]) * engage));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(PLAIN, 0, 0, W, H);
    if (engage > 0.01) { ctx.globalAlpha = engage; ctx.drawImage(LITUP, 0, 0, W, H); ctx.globalAlpha = 1; }
    const many = scope === 'company', won = finished && pulse, up = UP * engage, paying = act === 'armed' || act === 'payout';
    // With Pulse on the lights come up: a wash of blue over the right of the glass.
    if (engage > 0.01) {
      const wash = ctx.createRadialGradient(451, 320, 10, 451, 320, 300); wash.addColorStop(0, 'rgba(75,163,245,' + 0.13 * engage + ')'); wash.addColorStop(1, 'rgba(75,163,245,0)');
      rr(38, 36, 484, 576, 9); ctx.fillStyle = wash; ctx.fill();
    }
    // Marquee: the title, then what to do next, then the result. Its bulbs only run with Pulse on.
    rr(38, 5, 484, 26, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = rgb(pulse ? 'pulse' : 'line'); glow('pulse', 10); ctx.stroke(); noGlow();
    if (won) text('+' + money(S.delta.company) + ' BACK TO THE COMPANY  ·  +' + money(S.delta.bank) + (many ? ' TO EMPLOYEES' : ' TO THE EMPLOYEE'), 280, 22.5, 12, rgb('company'));
    else if (paying) text('TRIGGERED!   WELLNESS REWARD  +' + money(S.after.reward), 280, 23, 13, '#8fcbff');
    else if (lastOut) { if (Math.floor(clock * 5) % 2 === 0) text('L A S T   C O I N  →  T R I G G E R', 280, 23, 12.5, '#FFE9A6'); }
    else if (finished) text('NOW SWITCH THE PLAN ON', 280, 23, 13.5, rgb('ink'));
    else text(many ? 'C O M P A N Y   P A Y R O L L' : 'P A Y R O L L', 280, 23, 14, rgb('ink'));
    for (let i = 0; i < 24; i++) {
      const lit = engage > 0.5 && (Math.floor(clock * (won || paying ? 12 : 6)) + i) % 4 === 0;
      for (const y of [8.2, 27.8]) {
        ctx.beginPath(); ctx.arc(49 + i * 19.7, y, 1.7, 0, TAU);
        if (lit) { ctx.shadowColor = rgb('company'); ctx.shadowBlur = 6; }
        ctx.fillStyle = lit ? rgb('company') : '#22252c'; ctx.fill(); noGlow();
      }
    }

    // The Company: the hopper that pays out, and a wing each side where the lifts bring money back.
    lift('L', up); lift('R', up);
    sideBox('fee', LIFT.L, 330 - up, { from: [30, 528], to: [44, 540], draw: (top) => {
      text('PLAN', 88, top - 31, 12.5, tint('fee')); text('ADMIN FEE', 88, top - 18, 12.5, tint('fee')); text('from company savings', 92, top - 6, 7.5, rgb('mute'), 600); // sized so the capitals stop short of the bank box
    } });
    sideBox('plan', 508, 362 - up, { from: [508, 534], to: [508, 554], amount: [496, 547, 'right'], draw: (top) => text('PLAN $', 476, top + 54, 11, tint('plan')) });
    ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(410, 40); ctx.lineTo(410, 86); ctx.lineTo(298, 100); ctx.lineTo(262, 100); ctx.lineTo(150, 86); ctx.closePath();
    const hop = ctx.createLinearGradient(0, 40, 0, 100); hop.addColorStop(0, rgb('company', 0.1 + 0.1 * engage)); hop.addColorStop(1, rgb('company', 0.04));
    ctx.fillStyle = hop; ctx.fill(); glow('company', (running ? 10 : 5) + (blink(2) ? 3 : 0)); ctx.lineWidth = 2; ctx.strokeStyle = rgb('company'); ctx.stroke(); noGlow();
    text('COMPANY BANK ACCOUNT', 280, 58, 17, tint('company'));
    text(money(finished ? S.total : released * S.coin), 280, 74, 15, rgb('ink'));
    text(many ? 'payroll out · ' + S.employees + ' employees' : 'payroll out · 1 employee', 280, 84, 9, rgb('mute'), 600);
    ctx.globalAlpha = engage;
    text('BACK TO THE', 96, 50, 9.5, rgb('company')); text('COMPANY', 96, 61, 9.5, rgb('company'));
    text('+' + money(shownDollars('company')), 464, 60, 14, rgb('ink'));
    ctx.globalAlpha = 1;

    // The peg fields. The upper one closes up a little as the trays ride up.
    pegs(A0, 13 - engage, ROWS_A - 1); pegs(B0, ROWB, ROWS_B);
    if (engage > 0.5) for (const f of flashes) { // posts that were just struck flare and fade; the plain machine's do not light
      const a = 1 - (clock - f.t) / 0.42;
      ctx.globalAlpha = a; ctx.drawImage(f.lime ? GLOW : WGLOW, f.x - 12, f.y - 12, 24, 24);
      ctx.beginPath(); ctx.arc(f.x, f.y, 2.8 + 1.6 * a, 0, TAU); ctx.fillStyle = f.lime ? '#e6ff8a' : '#FFF3C4'; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // First level of trays: everything withheld from the paycheck.
    for (const key of ['taxes', 'health', 'k401', 'pulse']) tray(key, up);
    if (engage > 0.02) { // where the tax pile stood without Pulse, and how much less it holds
      const rows = Math.ceil(S.coins.off.taxes / BINS.taxes.cols), y = TRAY_BOT - up - rows * 6 - 5;
      ctx.globalAlpha = engage;
      ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(73, y); ctx.lineTo(183, y); ctx.strokeStyle = rgb('ink'); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      rr(77, y + 3, 102, 14, 3); ctx.fillStyle = 'rgba(8,12,19,.85)'; ctx.fill();
      text('without the plan', 128, y + 13, 8.5, rgb('ink'), 600);
      if (finished) text('▼ ' + money(S.delta.taxes) + ' less', 128, TRAY_BOT - up + 50, 12, rgb('company'));
      ctx.globalAlpha = 1;
    }

    // The caption under the row: these trays are filled before take-home pay is figured. The bracket grows to take in
    // the Section 125 tray when Pulse is on.
    {
      const y = 430 - up, xr = 371 + 121 * engage, mid = (71 + xr) / 2;
      ctx.beginPath(); ctx.moveTo(71, y - 5); ctx.lineTo(71, y); ctx.lineTo(xr, y); ctx.lineTo(xr, y - 5); ctx.lineWidth = 1.2; ctx.strokeStyle = rgb('mute'); ctx.stroke();
      rr(mid - 66, y - 7, 132, 14, 3); ctx.fillStyle = engage > 0.5 ? '#0c1422' : '#0e0f12'; ctx.fill();
      text('PRE-TAX WITHHOLDINGS', mid, y + 3.5, 9.5, rgb('ink'));
    }

    // The shelf, its single pusher, the framed opening, and the bank account at the very bottom.
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgb('line');
    ctx.beginPath(); ctx.moveTo(44, 430); ctx.lineTo(142, SHELF - 14); ctx.lineTo(142, SHELF); ctx.moveTo(516, 430); ctx.lineTo(418, SHELF - 14); ctx.lineTo(418, BANK_TOP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, SHELF - 19); ctx.lineTo(OPEN, SHELF - 19); ctx.lineWidth = 1; ctx.stroke(); // the pusher's rail
    ctx.lineWidth = 2.5; ctx.strokeStyle = rgb('bank'); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(142, SHELF); ctx.lineTo(OPEN, SHELF); ctx.stroke(); ctx.lineCap = 'butt';
    glow('bank', 8);
    ctx.beginPath(); ctx.moveTo(OPEN, SHELF - 3); ctx.lineTo(OPEN, SHELF + 9); ctx.moveTo(418, SHELF - 3); ctx.lineTo(418, SHELF + 9); ctx.lineWidth = 3; ctx.stroke(); noGlow();
    const raised = running && act === 'drop' && !lastOut && !pushing ? 8 : 0, bx = face - 10;
    ctx.beginPath(); ctx.moveTo(bx + 5, SHELF - 19); ctx.lineTo(bx + 5, SHELF - 14 - raised); ctx.lineWidth = 2; ctx.strokeStyle = rgb('mute'); ctx.stroke();
    const blade = ctx.createLinearGradient(0, SHELF - 14, 0, SHELF - 1); blade.addColorStop(0, rgb('ink')); blade.addColorStop(1, rgb('bank'));
    rr(bx - 2, SHELF - 16 - raised, 12, 15, 3); ctx.fillStyle = blade; glow('bank', 8); ctx.fill(); noGlow();
    const bg = ctx.createLinearGradient(0, BANK_TOP, 0, BANK_BOT); bg.addColorStop(0, rgb('bank', 0.05)); bg.addColorStop(1, rgb('bank', 0.1 + 0.12 * engage));
    rr(BINS.bank.x, BANK_TOP, BINS.bank.w, BANK_BOT - BANK_TOP + 2, 6); ctx.fillStyle = bg; ctx.fill();
    resting.bank.forEach((c) => c && coin(c));
    glow('bank', 3 + 12 * justHit('bank'));
    rr(BINS.bank.x, BANK_TOP, BINS.bank.w, BANK_BOT - BANK_TOP + 2, 6); ctx.lineWidth = 2; ctx.strokeStyle = rgb('bank'); ctx.stroke(); noGlow();
    if (paidIn > 12) { // the blue layer on top is the reward, paid in after tax
      const cols = BINS.bank.cols, payRows = Math.ceil((landed.bank - paidIn) / cols), rows = Math.ceil(landed.bank / cols), y = BANK_BOT - 6 - ((payRows + rows) / 2) * 6;
      rr(206, y - 8, 148, 15, 3); ctx.fillStyle = 'rgba(8,12,19,.86)'; ctx.fill();
      text('Wellness Reward · post-tax', 280, y + 3.5, 10.5, '#bfe0ff', 700);
    }

    // The arrow at the opening into the employee's tray.
    ctx.beginPath(); ctx.moveTo(392, SHELF - 1); ctx.lineTo(399, SHELF + 6); ctx.lineTo(406, SHELF - 1); ctx.lineWidth = 2; ctx.strokeStyle = rgb('bank'); ctx.stroke();
    // The Trigger: a catch cup under the pre-tax row with its name on a plate, wired to the hidden door in the wall.
    // When everything else has landed, the last coin drops into the cup. The cup flashes, the wire lights and the door opens.
    if (engage > 0.02) {
      const tripped = paying || won, since = clock - firedAt, amber = '#F5C24B', hot = '#FFF4C7', waiting = lastOut && !tripped;
      const wire = [[CUP.x, CUP.bottom], [CUP.x, 455], [425, 455], [425, DOOR.y]];
      ctx.globalAlpha = engage;
      ctx.beginPath(); ctx.moveTo(wire[0][0], wire[0][1]); for (const [x, y] of wire.slice(1)) ctx.lineTo(x, y);
      ctx.lineWidth = tripped ? 2 : 1.5; ctx.strokeStyle = tripped ? amber : rgb('line'); ctx.shadowColor = amber; ctx.shadowBlur = tripped ? 10 : 0; ctx.stroke(); noGlow();
      if (tripped && since < 0.2) { // one spark down the wire
        const d = (since / 0.2) * (107 + 15), sx = d < 107 ? CUP.x + d : 425, sy = d < 107 ? 455 : 455 + (d - 107);
        ctx.drawImage(WGLOW, sx - 14, sy - 14, 28, 28); ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, TAU); ctx.fillStyle = hot; ctx.fill();
      }
      // The plate.
      rr(232, 433, 60, 18, 4); ctx.fillStyle = 'rgba(8,12,19,.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = tripped || waiting ? hot : amber; ctx.shadowColor = amber; ctx.shadowBlur = tripped ? 12 : waiting && blink(6) ? 10 : 3; ctx.stroke(); noGlow();
      text('TRIGGER', 262, 446, 11, tripped || (waiting && blink(6)) ? hot : amber);
      ctx.beginPath(); ctx.moveTo(292, 442); ctx.lineTo(302, 442); ctx.lineWidth = 1.5; ctx.strokeStyle = amber; ctx.stroke();
      // The cup, open at the top.
      if (tripped || waiting) ctx.drawImage(WGLOW, CUP.x - 30, CUP.top - 18, 60, 60);
      ctx.beginPath(); ctx.moveTo(CUP.x - 21, CUP.top); ctx.lineTo(CUP.x - 12, CUP.bottom); ctx.lineTo(CUP.x + 12, CUP.bottom); ctx.lineTo(CUP.x + 21, CUP.top);
      ctx.fillStyle = 'rgba(245,194,75,' + (tripped ? 0.4 : 0.14) + ')'; ctx.fill();
      ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = tripped ? hot : amber; ctx.shadowColor = amber; ctx.shadowBlur = tripped ? 16 : 6; ctx.stroke(); noGlow(); ctx.lineJoin = 'miter';
      if (tripped && since < 0.7) for (const k of [0, 0.18]) { // rings of light off the cup
        const t = since - k; if (t <= 0) continue;
        ctx.beginPath(); ctx.ellipse(CUP.x, 440, 20 + t * 90, 10 + t * 45, 0, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,244,199,' + Math.max(0, 1 - t / 0.5) + ')'; ctx.stroke();
      }
      // The door: only a seam until it opens, then a lit mouth.
      const d = DOOR, open = rewardDoor;
      rr(d.x, d.y, d.w, d.h, 3); ctx.fillStyle = 'rgba(75,163,245,' + 0.55 * open + ')'; ctx.shadowColor = '#4BA3F5'; ctx.shadowBlur = 18 * open; ctx.fill(); noGlow();
      ctx.lineWidth = 1; ctx.strokeStyle = open > 0.05 ? '#8fcbff' : 'rgba(120,135,160,.28)'; ctx.stroke();
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(-1.35 * open); rr(0, -2, d.w, 4, 2); ctx.fillStyle = open > 0.05 ? '#8fcbff' : 'rgba(120,135,160,.0)'; ctx.fill(); ctx.restore();
      if (open > 0.05) { ctx.globalAlpha = open; text('REWARD', d.x + d.w + 5, d.y + 14, 9.5, '#8fcbff', 800, 'left'); text('post-tax', d.x + d.w + 5, d.y + 25, 9, rgb('ink'), 700, 'left'); }
      ctx.globalAlpha = 1;
      if (tripped && since < 0.3) { rr(38, 36, 484, 576, 9); ctx.fillStyle = 'rgba(255,244,199,' + 0.2 * (1 - since / 0.3) + ')'; ctx.fill(); } // the whole glass flashes
    }

    // The apron: the employee's total, and the key to the coins.
    text(many ? "EMPLOYEES' BANK ACCOUNTS" : "EMPLOYEE'S BANK ACCOUNT", 280, 631, 17, tint('bank'));
    const gain = won ? '   +' + money(S.delta.bank) + ' A MONTH' : '', amount = money(shownDollars('bank')); // short, so the capitals clear the coin key on both sides
    ctx.font = '800 16px ' + FONT; const w1 = ctx.measureText(amount).width;
    ctx.font = '800 12.5px ' + FONT; const w2 = gain ? ctx.measureText(gain).width : 0, x0 = 280 - (w1 + w2) / 2;
    text(amount, x0, 651, 16, rgb('ink'), 800, 'left');
    if (gain) text(gain, x0 + w1, 651, 12.5, rgb('company'), 800, 'left');
    ctx.drawImage(engage > 0.5 ? GOLD : WORN, 22, 620, SPR, SPR); text('= ' + money(S.coin), 41, 632.5, 11, rgb('mute'), 600, 'left');
    if (engage > 0.5) {
      ctx.drawImage(LIME, 22, 637, SPR, SPR); text('company savings', 41, 649.5, 10, rgb('mute'), 600, 'left');
      ctx.drawImage(BLUE, 421, 628, SPR, SPR); text('Wellness Reward', 440, 633, 9.5, rgb('mute'), 600, 'left'); text('post-tax,', 440, 644, 9.5, rgb('mute'), 600, 'left'); text('from the plan', 440, 655, 9.5, rgb('mute'), 600, 'left');
    }

    // Coins in the air tumble; the ones on the shelf, in the lifts and in the chutes lie flat. Lime and blue coins carry a glow.
    for (const c of coins) {
      if (c.state !== 'move' && c.state !== 'shelf') continue;
      if (c.seg && c.seg.fade) ctx.globalAlpha = Math.max(0, 1 - c.u);
      if (c.lime || c.reward) ctx.drawImage(c.reward ? BGLOW : GLOW, c.x - 13, c.y - 13, 26, 26);
      if (c.last) ctx.drawImage(WGLOW, c.x - 24, c.y - 24, 48, 48);
      const flat = c.state === 'shelf' || c.seg.kind === 'line', sx = flat ? 1 : 0.3 + 0.7 * Math.abs(Math.cos(c.spin + clock * c.rate));
      ctx.setTransform(DPR * sx, 0, 0, DPR, c.x * DPR, c.y * DPR);
      ctx.drawImage(sprite(c), -SPR / 2, -SPR / 2, SPR, SPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
    }
    // Reflections on the glass come with the lights.
    if (engage > 0.01) {
      ctx.save(); rr(38, 36, 484, 576, 9); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.028 * engage + ')';
      ctx.beginPath(); ctx.moveTo(120, 36); ctx.lineTo(210, 36); ctx.lineTo(60, 612); ctx.lineTo(38, 612); ctx.lineTo(38, 420); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(250, 36); ctx.lineTo(282, 36); ctx.lineTo(132, 612); ctx.lineTo(100, 612); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  let seen = true;
  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt); draw();
    // The lit machine never sits still; the plain one stops as soon as nothing is moving.
    const busy = running || engage !== (pulse ? 1 : 0) || flashes.length || (pulse && seen && !still.matches);
    if (busy) raf = requestAnimationFrame(frame); else { raf = 0; last = 0; }
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const settle = () => { if (still.matches) engage = pulse ? 1 : 0; emit(); draw(); kick(); };
  new IntersectionObserver((e) => { seen = e[e.length - 1].isIntersecting; if (seen) kick(); }).observe(cv);

  const api = {
    sfx: null, // set by sound.js
    on(fn) { listeners.push(fn); },
    state: () => ({ pulse, scope, running, finished, act, lastOut, landed: { ...landed, company: landed.backL + landed.backR, reward: paidIn }, total: coins.length, scenario: S }),
    // How full each tray and box is, 0..1 of its final count, for a companion figure; plus what is moving.
    levels() {
      const n = S.coins, f = (a, b) => (b ? Math.max(0, Math.min(1, a / b)) : 0);
      return { taxes: f(landed.taxes, n.off.taxes), health: f(landed.health, n.off.health), k401: f(landed.k401, n.off.k401), s125: f(landed.pulse, n.on.pulse),
        bank: f(landed.bank - paidIn, n.off.bank), reward: f(paidIn, S.after.rewardCoins), company: f(landed.backL + landed.backR, n.on.company), fee: f(landed.fee, n.on.fee), plan: f(landed.plan, S.after.planCoins),
        belt: running && act === 'drop' ? 1 : 0, tripped: pulse && (act === 'armed' || act === 'payout' || act === 'done') ? 1 : 0, pulse };
    },
    setPulse(v) { pulse = !!v; reset(); sfx(pulse ? 'engage' : 'disengage'); settle(); },
    // Which payroll the cabinet runs: 'employee' (one paycheck) or 'company' (everyone).
    setScenario(s, which) { S = s; scope = which; reset(); settle(); },
    start() { load(); running = true; sfx('start'); emit(); if (still.matches) api.finish(); else kick(); },
    // Runs the drop forward at once and silently: to the end for reduced motion and tests, or a few seconds for a mid-drop picture.
    finish(seconds = 100) { if (!coins.length) load(); running = true; engage = pulse ? 1 : 0; quiet = true; for (let i = 0; i < seconds * 60 && running; i++) step(1 / 60); quiet = false; draw(); kick(); },
  };
  window.COIN_MACHINE = api;
  reset(); draw();
})();
