// Procedural sound recipes (owner: Arrows/VFX/Audio specialist).
// Signature: SFX[id] = (k, opts) => void   with k = { ac, out, t, noise } (AudioContext, destination bus, now, 1.5s white-noise buffer).
// Ids the CORE/META play: ui_click, ui_back, select, error, turn_start, timer_tick, step, land, draw_start, release, whoosh,
//   impact_dirt, impact_body, headshot, explosion, split, splash, death, victory, defeat, coin, buy.
// Arrow defs reference ids through def.sfx.{launch, impact, body, flight}; hooks call api.sfx(id).
// Map falls (MapDef.fallSfx): lava_plunge, street_impact, sand_plume.
// Event-driven sounds the core does not play itself (whoosh in flight, crumble, grunt, death, fall, wind) are wired in
// ./bindings.js, which subscribes to core events.
import './bindings.js';

function env(g, t, a, peak, d, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}
function tone(k, { f = 440, f2 = null, type = 'sine', a = 0.005, d = 0.2, gain = 0.3, delay = 0, vib = 0, vibF = 6 }) {
  const { ac, out } = k, t = k.t + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vibF; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + a + d + 0.05); }
  env(g, t, a, gain, d);
  o.connect(g).connect(out); o.start(t); o.stop(t + a + d + 0.05);
}
function noise(k, { a = 0.005, d = 0.2, gain = 0.3, type = 'bandpass', f = 1200, f2 = null, q = 1, delay = 0 }) {
  const { ac, out } = k, t = k.t + delay;
  const s = ac.createBufferSource(); s.buffer = k.noise; s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + a + d);
  const g = ac.createGain(); env(g, t, a, gain, d);
  s.connect(fl).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + a + d + 0.05);
}
/** Rapid random-pitch blips (crackle, debris patter, sizzle). */
function patter(k, { n = 8, span = 0.3, f = [600, 1800], d = 0.03, gain = 0.06, type = 'square', delay = 0 }) {
  for (let i = 0; i < n; i++) tone(k, { f: f[0] + Math.random() * (f[1] - f[0]), type, d, gain: gain * (0.5 + Math.random() * 0.5), delay: delay + Math.random() * span });
}
function bassDrop(k, f0, f1, d, gain, delay = 0) { tone(k, { f: f0, f2: f1, type: 'sine', d, gain, delay }); }

export const SFX = {
  // ---- UI
  ui_click: (k) => { tone(k, { f: 880, f2: 1320, type: 'triangle', d: 0.07, gain: 0.18 }); },
  ui_back: (k) => { tone(k, { f: 660, f2: 440, type: 'triangle', d: 0.09, gain: 0.16 }); },
  select: (k) => { tone(k, { f: 740, type: 'triangle', d: 0.06, gain: 0.14 }); tone(k, { f: 1110, type: 'sine', d: 0.08, gain: 0.1, delay: 0.04 }); },
  error: (k) => { tone(k, { f: 220, f2: 180, type: 'square', d: 0.14, gain: 0.08 }); },
  coin: (k) => { tone(k, { f: 1320, type: 'square', d: 0.06, gain: 0.07 }); tone(k, { f: 1760, type: 'square', d: 0.16, gain: 0.07, delay: 0.06 }); },
  buy: (k) => { [784, 988, 1175, 1568].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.12, gain: 0.15, delay: i * 0.05 })); },

  // ---- turn flow
  turn_start: (k) => { [523, 659, 784].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.18, gain: 0.16, delay: i * 0.07 })); tone(k, { f: 1568, type: 'sine', d: 0.3, gain: 0.05, delay: 0.21 }); },
  timer_tick: (k) => { tone(k, { f: 1500, type: 'square', d: 0.03, gain: 0.05 }); },
  wind_change: (k, o) => {
    const s = Math.min(1, (o.s ?? 6) / 12);
    if (s < 0.05) return;
    noise(k, { f: 380, f2: 900 + s * 900, q: 2.5, a: 0.35, d: 0.6 + s * 0.5, gain: 0.04 + s * 0.08 });
    noise(k, { f: 1600, f2: 700, q: 6, a: 0.25, d: 0.5, gain: 0.02 + s * 0.03, delay: 0.2 });
  },

  // ---- hero
  step: (k) => { noise(k, { f: 500, q: 0.8, d: 0.05, gain: 0.08 }); },
  land: (k) => { noise(k, { type: 'lowpass', f: 600, d: 0.14, gain: 0.25 }); tone(k, { f: 120, f2: 60, d: 0.12, gain: 0.2 }); },
  grunt: (k, o) => { // short vocal "hup" made of two formant-filtered saws
    const base = (o.female ? 290 : 150) * (0.92 + Math.random() * 0.16), big = Math.min(1, (o.n ?? 20) / 40);
    const { ac, out } = k, t = k.t + 0.03, dur = 0.16 + big * 0.12;
    const src = ac.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(base * 1.25, t); src.frequency.exponentialRampToValueAtTime(base * 0.8, t + dur);
    const g = ac.createGain(); env(g, t, 0.015, 0.22 + big * 0.12, dur);
    for (const [ff, q, gg] of [[o.female ? 850 : 650, 6, 1], [o.female ? 1500 : 1100, 8, 0.6]]) {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q;
      const fg = ac.createGain(); fg.gain.value = gg; src.connect(bp).connect(fg).connect(g);
    }
    g.connect(out); src.start(t); src.stop(t + dur + 0.05);
    noise(k, { f: 1800, q: 1, d: 0.08, gain: 0.05, delay: 0.03 });
  },
  death: (k) => { [392, 330, 262, 196].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.2, gain: 0.18, delay: i * 0.1 })); noise(k, { type: 'lowpass', f: 500, d: 0.3, gain: 0.2, delay: 0.35 }); },
  fall: (k) => { // cartoon slide-whistle down
    tone(k, { f: 1400, f2: 180, type: 'sine', a: 0.02, d: 1.0, gain: 0.16, vib: 18, vibF: 7 });
    tone(k, { f: 2100, f2: 270, type: 'triangle', a: 0.02, d: 1.0, gain: 0.04 });
  },
  draw_start: (k) => { noise(k, { f: 2400, f2: 900, q: 3, a: 0.2, d: 0.35, gain: 0.05 }); tone(k, { f: 180, f2: 260, type: 'sawtooth', a: 0.25, d: 0.4, gain: 0.025 }); patter(k, { n: 4, span: 0.4, f: [180, 260], d: 0.02, gain: 0.03, type: 'triangle' }); },
  release: (k, o) => {
    const p = o.power ?? 60;
    tone(k, { f: 140 + p, f2: 70, type: 'triangle', d: 0.18, gain: 0.3 });
    noise(k, { type: 'highpass', f: 3000, d: 0.08, gain: 0.12 });
    noise(k, { f: 1800, f2: 600, q: 2, a: 0.02, d: 0.35, gain: 0.07 + p * 0.0008, delay: 0.02 });
  },
  release_heavy: (k, o) => {
    const p = o.power ?? 60;
    tone(k, { f: 90 + p * 0.6, f2: 45, type: 'triangle', d: 0.26, gain: 0.38 });
    noise(k, { type: 'lowpass', f: 900, f2: 200, d: 0.2, gain: 0.2 });
    noise(k, { f: 1200, f2: 400, q: 2, a: 0.03, d: 0.4, gain: 0.1, delay: 0.02 });
  },

  // ---- flight
  whoosh: (k) => { noise(k, { f: 900, f2: 2400, q: 4, a: 0.12, d: 0.25, gain: 0.06 }); noise(k, { f: 2400, f2: 700, q: 4, a: 0.08, d: 0.45, gain: 0.04, delay: 0.3 }); },
  whoosh_heavy: (k) => { noise(k, { f: 400, f2: 1200, q: 3, a: 0.15, d: 0.4, gain: 0.08 }); tone(k, { f: 70, f2: 110, type: 'sine', a: 0.2, d: 0.4, gain: 0.08 }); },
  whoosh_magic: (k) => { noise(k, { f: 1200, f2: 3000, q: 5, a: 0.12, d: 0.3, gain: 0.05 }); [1568, 2093, 2637].forEach((f, i) => tone(k, { f, type: 'sine', d: 0.25, gain: 0.04, delay: 0.05 + i * 0.06 })); },
  fuse: (k) => { noise(k, { type: 'highpass', f: 4000, a: 0.05, d: 0.9, gain: 0.05 }); patter(k, { n: 12, span: 0.9, f: [2500, 5000], d: 0.015, gain: 0.035 }); noise(k, { f: 700, f2: 1800, q: 3, a: 0.1, d: 0.35, gain: 0.05 }); },
  crackle: (k) => { patter(k, { n: 14, span: 0.8, f: [900, 4000], d: 0.012, gain: 0.05, type: 'sawtooth' }); tone(k, { f: 120, type: 'sawtooth', a: 0.05, d: 0.6, gain: 0.03, vib: 30, vibF: 23 }); },

  // ---- impacts
  impact_dirt: (k) => { noise(k, { type: 'lowpass', f: 900, f2: 200, d: 0.22, gain: 0.4 }); tone(k, { f: 160, f2: 70, d: 0.12, gain: 0.25 }); noise(k, { type: 'highpass', f: 3500, d: 0.03, gain: 0.12 }); },
  impact_shard: (k) => { noise(k, { type: 'lowpass', f: 1100, f2: 250, d: 0.16, gain: 0.3 }); tone(k, { f: 2400, f2: 1800, type: 'triangle', d: 0.12, gain: 0.06 }); },
  impact_body: (k) => { tone(k, { f: 260, f2: 90, type: 'triangle', d: 0.16, gain: 0.4 }); noise(k, { f: 700, q: 1.5, d: 0.12, gain: 0.25 }); noise(k, { type: 'highpass', f: 3000, d: 0.04, gain: 0.15 }); },
  headshot: (k) => {
    tone(k, { f: 1400, type: 'triangle', d: 0.35, gain: 0.25 }); tone(k, { f: 2100, type: 'sine', d: 0.5, gain: 0.15, delay: 0.03 });
    tone(k, { f: 300, f2: 90, type: 'triangle', d: 0.2, gain: 0.35 });
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(k, { f, type: 'square', d: 0.1, gain: 0.05, delay: 0.12 + i * 0.05 })); // sting
  },
  explosion: (k) => {
    noise(k, { type: 'lowpass', f: 1600, f2: 110, a: 0.004, d: 1.2, gain: 0.9 });
    bassDrop(k, 110, 30, 0.8, 0.75);
    noise(k, { type: 'highpass', f: 2500, d: 0.15, gain: 0.22 });
    patter(k, { n: 10, span: 0.9, f: [200, 700], d: 0.04, gain: 0.05, type: 'triangle', delay: 0.25 }); // falling debris
  },
  explosion_small: (k) => {
    noise(k, { type: 'lowpass', f: 2200, f2: 180, a: 0.003, d: 0.6, gain: 0.7 });
    bassDrop(k, 160, 50, 0.4, 0.5);
    tone(k, { f: 600, f2: 1400, type: 'triangle', d: 0.1, gain: 0.08 });
  },
  explosion_deep: (k) => { // muffled underground thump + rumble
    noise(k, { type: 'lowpass', f: 500, f2: 60, a: 0.01, d: 1.4, gain: 1.0 });
    bassDrop(k, 80, 24, 1.1, 0.85);
    patter(k, { n: 14, span: 1.2, f: [150, 500], d: 0.05, gain: 0.06, type: 'triangle', delay: 0.15 });
  },
  crumble: (k, o) => { // terrain crater collapse; scaled by crater radius
    const r = Math.min(1, (o.r ?? 1) / 3);
    noise(k, { type: 'lowpass', f: 700 + r * 300, f2: 150, a: 0.04, d: 0.35 + r * 0.5, gain: 0.08 + r * 0.22, delay: 0.06 });
    patter(k, { n: 3 + Math.round(r * 9), span: 0.3 + r * 0.6, f: [180, 520], d: 0.035, gain: 0.03 + r * 0.04, type: 'triangle', delay: 0.08 });
  },
  bounce: (k, o) => { const n = o.n ?? 1, f = 300 * Math.pow(1.26, n); tone(k, { f, f2: f * 2.2, type: 'sine', d: 0.14, gain: 0.32 }); tone(k, { f: f * 0.5, f2: f * 0.3, type: 'triangle', d: 0.1, gain: 0.25 }); noise(k, { type: 'lowpass', f: 700, d: 0.08, gain: 0.15 }); },
  drill: (k) => {
    tone(k, { f: 90, f2: 140, type: 'sawtooth', a: 0.02, d: 0.55, gain: 0.12, vib: 25, vibF: 31 });
    noise(k, { f: 1400, f2: 500, q: 2, a: 0.02, d: 0.5, gain: 0.18 });
    noise(k, { type: 'lowpass', f: 400, d: 0.3, gain: 0.25 });
  },
  drill_tick: (k) => { noise(k, { f: 800 + Math.random() * 600, q: 3, d: 0.06, gain: 0.08 }); tone(k, { f: 110, type: 'sawtooth', d: 0.06, gain: 0.04 }); },
  frost: (k, o) => {
    const g = o.soft ? 0.4 : 1;
    noise(k, { type: 'highpass', f: 5000, f2: 2500, a: 0.004, d: 0.5, gain: 0.25 * g });
    [2637, 3136, 3951, 4699].forEach((f, i) => tone(k, { f, type: 'sine', d: 0.4, gain: 0.06 * g, delay: i * 0.035 }));
    if (!o.soft) { noise(k, { type: 'lowpass', f: 900, f2: 200, d: 0.25, gain: 0.35 }); patter(k, { n: 8, span: 0.35, f: [3000, 6000], d: 0.02, gain: 0.05, type: 'sine', delay: 0.05 }); }
  },
  zap: (k) => { noise(k, { type: 'highpass', f: 2500, d: 0.12, gain: 0.25 }); tone(k, { f: 1800, f2: 200, type: 'sawtooth', d: 0.14, gain: 0.12 }); },
  thunder: (k) => {
    noise(k, { type: 'highpass', f: 3000, a: 0.002, d: 0.12, gain: 0.5 }); // crack
    tone(k, { f: 2400, f2: 120, type: 'sawtooth', d: 0.1, gain: 0.16 });
    noise(k, { type: 'lowpass', f: 900, f2: 80, a: 0.04, d: 1.6, gain: 0.85, delay: 0.05 }); // rumble
    bassDrop(k, 70, 28, 1.2, 0.6, 0.04);
  },
  warp: (k) => {
    tone(k, { f: 200, f2: 1600, type: 'sine', a: 0.01, d: 0.35, gain: 0.22, vib: 40, vibF: 18 });
    tone(k, { f: 300, f2: 2400, type: 'triangle', a: 0.01, d: 0.35, gain: 0.08, delay: 0.04 });
    [1319, 1760, 2637].forEach((f, i) => tone(k, { f, type: 'sine', d: 0.3, gain: 0.07, delay: 0.3 + i * 0.05 }));
  },
  split: (k) => { tone(k, { f: 900, f2: 1800, type: 'triangle', d: 0.12, gain: 0.18 }); tone(k, { f: 1350, f2: 2600, type: 'sine', d: 0.16, gain: 0.12, delay: 0.03 }); tone(k, { f: 600, f2: 1200, type: 'sine', d: 0.14, gain: 0.1, delay: 0.06 }); },

  // ---- falling off the map (per-map MapDef.fallSfx)
  splash: (k) => { noise(k, { f: 1200, f2: 300, q: 0.8, a: 0.01, d: 0.6, gain: 0.45 }); tone(k, { f: 300, f2: 120, d: 0.2, gain: 0.15 }); patter(k, { n: 6, span: 0.5, f: [800, 1600], d: 0.03, gain: 0.04, type: 'sine', delay: 0.15 }); },
  lava_plunge: (k) => {
    tone(k, { f: 140, f2: 45, type: 'sine', a: 0.01, d: 0.5, gain: 0.5 });           // heavy glop
    noise(k, { type: 'lowpass', f: 600, f2: 120, a: 0.01, d: 0.45, gain: 0.45 });
    noise(k, { type: 'highpass', f: 3500, a: 0.08, d: 1.2, gain: 0.18, delay: 0.1 }); // sizzle
    patter(k, { n: 16, span: 1.1, f: [2500, 6000], d: 0.012, gain: 0.04, delay: 0.1 });
    tone(k, { f: 90, f2: 60, type: 'sine', d: 0.25, gain: 0.25, delay: 0.3 });       // late bubble
  },
  street_impact: (k) => {
    noise(k, { type: 'lowpass', f: 500, f2: 120, a: 0.003, d: 0.3, gain: 0.7 });
    tone(k, { f: 110, f2: 45, type: 'sine', d: 0.25, gain: 0.55 });
    patter(k, { n: 6, span: 0.4, f: [300, 900], d: 0.03, gain: 0.05, type: 'triangle', delay: 0.06 });
  },
  sand_plume: (k) => {
    noise(k, { type: 'lowpass', f: 700, f2: 160, a: 0.02, d: 0.6, gain: 0.55 });
    tone(k, { f: 90, f2: 50, type: 'sine', a: 0.01, d: 0.3, gain: 0.35 });
    noise(k, { f: 2500, f2: 1200, q: 0.7, a: 0.1, d: 0.9, gain: 0.08, delay: 0.1 });
  },

  // ---- stings
  victory: (k) => {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(k, { f, type: 'triangle', d: i === 5 ? 0.6 : 0.16, gain: 0.2, delay: i * 0.11 }));
    [262, 330, 392].forEach((f) => tone(k, { f, type: 'sine', a: 0.02, d: 0.9, gain: 0.08, delay: 0.55 }));
  },
  defeat: (k) => { [392, 370, 349, 262].forEach((f, i) => tone(k, { f, type: 'sawtooth', d: 0.3, gain: 0.07, delay: i * 0.22 })); tone(k, { f: 131, type: 'sine', a: 0.05, d: 0.9, gain: 0.12, delay: 0.66 }); },
};
