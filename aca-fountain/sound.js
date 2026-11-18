/* Sounds for the Payroll Fountain, synthesized so there are no files to load. Quiet and refined, not an arcade:
   water that swells while the valve is open and fades as the buckets settle, a few brass ticks when a handwheel turns,
   a heavier turn-and-seat for the plan switch, clockwork while the Trigger's float rises, one clear bell when the reward
   valve opens, and a low singing-bowl tone when a plan run settles. Plan off is water and valves only.
   Everything sits between about 250 Hz and 3.5 kHz so laptop and phone speakers can play it; a compressor keeps it even.
   The browser only allows sound after a press, so the first press anywhere wakes it. */
(function () {
  'use strict';
  const F = window.FOUNTAIN;
  let ac = null, out = null, noise = null, meter = null, water = null, lastTick = 0, lastDrop = 0;
  let muted = false;
  try { muted = localStorage.getItem('fountainMuted') === '1'; } catch (e) { /* private window: stay unmuted */ }

  function ready() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const squash = ac.createDynamicsCompressor();
      squash.threshold.value = -18; squash.ratio.value = 6; squash.attack.value = 0.004; squash.release.value = 0.2;
      out = ac.createGain(); out.gain.value = 1.1;
      meter = ac.createAnalyser(); meter.fftSize = 2048;
      out.connect(squash); squash.connect(meter); meter.connect(ac.destination);
      // Two seconds of soft (brown-leaning) noise: the water bed and every click and hiss are cut from it.
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noise.getChannelData(0); let b = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.06 * w) / 1.06; d[i] = w * 0.35 + b * 2.4; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // The water bed: looping noise through two bands (a body and a splash), its level set by the poll below.
  function bed() {
    if (water) return water;
    const src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
    const body = ac.createBiquadFilter(); body.type = 'bandpass'; body.frequency.value = 520; body.Q.value = 0.9;
    const splash = ac.createBiquadFilter(); splash.type = 'bandpass'; splash.frequency.value = 2300; splash.Q.value = 0.7;
    const gBody = ac.createGain(), gSplash = ac.createGain(), level = ac.createGain();
    gBody.gain.value = 0.9; gSplash.gain.value = 0.35; level.gain.value = 0;
    src.connect(body).connect(gBody).connect(level); src.connect(splash).connect(gSplash).connect(level); level.connect(out);
    src.start();
    water = { level, splash, gSplash };
    return water;
  }

  // One short tone with an optional pitch slide; partials make a bell.
  function tone(freq, dur, level, delay = 0, type = 'sine', slide = 1) {
    const t = ac.currentTime + delay, osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out); osc.start(t); osc.stop(t + dur + 0.05);
  }
  // A metallic tick or thunk: a sliver of noise through a narrow band.
  function tick(freq, dur, level, delay = 0, q = 9) {
    const t = ac.currentTime + delay, src = ac.createBufferSource(), band = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise; band.type = 'bandpass'; band.frequency.value = freq; band.Q.value = q;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band).connect(g).connect(out); src.start(t, Math.random() * 1.5, dur + 0.03);
  }
  // A hiss: the last breath of water when the valve shuts.
  function hiss(dur, level) {
    const t = ac.currentTime, src = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 2600;
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g).connect(out); src.start(t, Math.random(), dur + 0.03);
  }
  // A struck bell: an inharmonic set of partials, the higher ones dying first.
  function bell(f, level, delay = 0) {
    [[1, 1, 2.6], [2.0, 0.45, 1.8], [2.76, 0.32, 1.2], [5.4, 0.14, 0.6]].forEach(([r, a, d]) => tone(f * r, d, level * a, delay));
  }

  const VOICE = {
    // The main valve opens: three brass ticks as the wheel turns, a soft thunk as it seats.
    start() { [3100, 2800, 2500].forEach((f, i) => tick(f, 0.035, 0.5, i * 0.07)); tick(420, 0.12, 0.6, 0.22, 4); },
    open() { VOICE.start(); },
    close() { [2500, 2800, 3100].forEach((f, i) => tick(f, 0.035, 0.45, i * 0.06)); hiss(0.35, 0.18); tick(420, 0.1, 0.5, 0.2, 4); },
    // The plan switch: a heavier wheel, five ticks that speed up, and a deep seat.
    engage() {
      [0, 0.11, 0.2, 0.27, 0.32].forEach((d, i) => tick(1700 + i * 120, 0.04, 0.55, d));
      tick(300, 0.25, 0.9, 0.38, 3); tone(262, 0.4, 0.14, 0.38, 'triangle', 0.92);
    },
    disengage() { [0, 0.09, 0.17].forEach((d, i) => tick(1900 - i * 120, 0.035, 0.45, d)); tick(340, 0.18, 0.6, 0.24, 3); },
    // The Section 125 bucket is full: the gears engage.
    ready() { tick(1500, 0.06, 0.6); tick(1100, 0.08, 0.6, 0.09); },
    // The reward valve opens: one clear bell.
    trigger() { tick(900, 0.08, 0.5); },
    reward() { bell(880, 0.17, 0.05); }, // the loudest moment, but only about twice the water
    // A plan run settles: a low singing-bowl tone, two close pitches beating slowly. Plain payroll just goes quiet.
    finish(o) { if (o.aca) { tone(440, 3.2, 0.09); tone(441.6, 3.2, 0.08); tone(880, 2.2, 0.03); } },
    // The tour's check mark.
    check() { tick(2600, 0.025, 0.35); },
  };
  function play(name, o) {
    if (muted || !VOICE[name] || !ready()) return;
    VOICE[name](o || {});
  }

  // Every tenth of a second: set the water's level from the board, add the odd drip, and tick the gears while the float rises.
  setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    const s = F.state(), L = F.levels(), live = !muted && !document.hidden && !s.paused;
    const pouring = L.flow > 0 || (L.pay > 0 && L.pay < 1);
    const w = bed(), now = ac.currentTime;
    w.level.gain.setTargetAtTime(live && pouring ? 0.2 : 0, now, live && pouring ? 0.25 : s.paused ? 0.05 : 0.6);
    w.gSplash.gain.setTargetAtTime(0.25 + Math.random() * 0.2, now, 0.08); // the surface never sits still
    if (!live) return;
    if (pouring && now - lastDrop > 0.18 + Math.random() * 0.5) { lastDrop = now; tone(900 + Math.random() * 500, 0.05, 0.035, 0, 'sine', 0.55); }
    if (s.aca && s.running && s.act === 'drop' && !s.lastOut && L.aca > 0.02 && now - lastTick > 0.13) { lastTick = now; tick(2300 + Math.random() * 200, 0.018, 0.22); }
  }, 100);

  // Wake the sound on the first press, wherever it lands.
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => { if (!muted) ready(); }, { once: true, capture: true });

  window.FOUNTAIN_SOUND = {
    play,
    get muted() { return muted; },
    get state() { return ac ? ac.state : 'not started'; },
    // The loudest sample leaving the page right now, 0 to 1: tells a silent engine from a silent speaker.
    peak() { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; },
    setMuted(v) { muted = !!v; try { localStorage.setItem('fountainMuted', muted ? '1' : '0'); } catch (e) { /* not saved */ } if (!muted) ready(); },
  };
  F.sfx = play;
})();
