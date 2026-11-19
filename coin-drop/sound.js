/* Sounds for the coin drop, synthesized so there are no files to load. Two voices:
   the plain machine is old school (mechanical clacks and a dull bell), and with the plan on it is bright (small bells on a
   five-note scale). Everything sits between 300 Hz and 3 kHz so a laptop's small speakers can play it, and a compressor
   keeps a busy drop from clipping. The browser only allows sound after a press, so the first press anywhere wakes it. */
(function () {
  'use strict';
  let ac = null, out = null, hiss = null, meter = null, lastPeg = 0, lastLand = 0;
  let muted = false;
  try { muted = localStorage.getItem('coinDropMuted') === '1'; } catch (e) { /* private window: stay unmuted */ }

  function ready() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const squash = ac.createDynamicsCompressor();
      squash.threshold.value = -14; squash.ratio.value = 8; squash.attack.value = 0.003; squash.release.value = 0.12;
      out = ac.createGain(); out.gain.value = 1.5;
      meter = ac.createAnalyser(); meter.fftSize = 2048;
      out.connect(squash); squash.connect(meter); meter.connect(ac.destination);
      // Half a second of noise, reused for every clack.
      hiss = ac.createBuffer(1, ac.sampleRate / 2, ac.sampleRate);
      const data = hiss.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  // One short note: a frequency, a length, a waveform and a level, with an optional delay and slide.
  function note(freq, dur, type, level, delay = 0, slide = 1) {
    const t = ac.currentTime + delay, osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(level, t + 0.005); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out); osc.start(t); osc.stop(t + dur + 0.03);
  }
  // A mechanical clack: a burst of noise through a narrow filter.
  function clack(freq, dur, level, delay = 0) {
    const t = ac.currentTime + delay, src = ac.createBufferSource(), band = ac.createBiquadFilter(), gain = ac.createGain();
    src.buffer = hiss; band.type = 'bandpass'; band.frequency.value = freq; band.Q.value = 5;
    gain.gain.setValueAtTime(level, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band).connect(gain).connect(out); src.start(t, Math.random() * 0.3, dur + 0.02);
  }
  const SCALE = [784, 880, 988, 1175, 1319, 1568]; // G major pentatonic, bright but never sour
  const any = (a) => a[Math.floor(Math.random() * a.length)];

  const VOICE = {
    peg(o, now) {
      if (now - lastPeg < 0.034) return; lastPeg = now;
      if (o.wellness) note(any(SCALE) * (o.lime ? 2 : 1), 0.07, o.lime ? 'sine' : 'triangle', 0.12);
      else clack(900 + Math.random() * 500, 0.035, 0.5);
    },
    land(o, now) {
      if (now - lastLand < 0.05) return; lastLand = now;
      if (!o.wellness) { clack(480, 0.06, 0.7); note(330, 0.07, 'triangle', 0.1, 0, 0.7); }
      else if (o.lime) { note(1319, 0.08, 'sine', 0.16); note(1976, 0.12, 'sine', 0.14, 0.06); }
      else note(1568, 0.07, 'sine', 0.1);
    },
    push(o) { if (o.wellness) note(330, 0.2, 'triangle', 0.07, 0, 2); else clack(380, 0.2, 0.5); },
    start(o) { if (o.wellness) [523, 784, 1047].forEach((f, i) => note(f, 0.1, 'square', 0.09, i * 0.07)); else { clack(700, 0.08, 0.8); note(392, 0.16, 'square', 0.1, 0.03); } },
    engage() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, 0.14, 'triangle', 0.2, i * 0.065)); note(2093, 0.5, 'sine', 0.14, 0.42); },
    disengage() { note(523, 0.16, 'square', 0.1); note(330, 0.32, 'square', 0.1, 0.14, 0.75); clack(500, 0.12, 0.6, 0.3); },
    finish(o) {
      if (o.wellness) { [784, 988, 1175, 1568].forEach((f, i) => note(f, 0.16, 'triangle', 0.2, i * 0.1)); [784, 1175, 1568].forEach((f) => note(f, 0.6, 'sine', 0.12, 0.42)); }
      else { note(660, 0.5, 'triangle', 0.18); note(1320, 0.3, 'sine', 0.05); } // one plain bell
    },
    // The Trigger trips: an electric zip and a ping. Then the reward: a run of bells climbing two octaves, with a shimmer on top.
    trigger() { note(300, 0.3, 'sawtooth', 0.14, 0, 7); note(2637, 0.18, 'square', 0.1, 0.26); note(2637, 0.18, 'square', 0.08, 0.5); },
    reward() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => note(f, 0.18, 'triangle', 0.22, i * 0.075)); [2093, 2637, 3136].forEach((f, i) => note(f, 0.8, 'sine', 0.1, 0.55 + i * 0.05)); },
    ready() { note(880, 0.09, 'square', 0.12); note(880, 0.09, 'square', 0.12, 0.16); }, // two ticks: the last coin is on its way
    button(o) { if (o.wellness) note(1175, 0.05, 'square', 0.08); else clack(1100, 0.03, 0.6); },
  };
  function play(name, o) {
    if (muted || !VOICE[name] || !ready()) return;
    VOICE[name](o || {}, ac.currentTime);
  }
  // Wake the sound on the first press, wherever it lands.
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => { if (!muted) ready(); }, { once: true, capture: true });

  window.COIN_SOUND = {
    play,
    get muted() { return muted; },
    get state() { return ac ? ac.state : 'not started'; },
    // The loudest sample leaving the page right now, 0 to 1: a way to tell a silent engine from a silent speaker.
    peak() { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; },
    setMuted(v) { muted = !!v; try { localStorage.setItem('coinDropMuted', muted ? '1' : '0'); } catch (e) { /* not saved */ } if (!muted) ready(); },
  };
  if (window.COIN_MACHINE) window.COIN_MACHINE.sfx = play;
})();
