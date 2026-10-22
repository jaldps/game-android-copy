// Procedural sound recipes (owner: Arrows/VFX/Audio specialist).
// Signature: SFX[id] = (k, opts) => void   with k = { ac, out, t, noise } (AudioContext, destination bus, now, 1.5s white-noise buffer).
// Ids the CORE plays: ui_click, ui_back, turn_start, timer_tick, step, land, draw_start, release, whoosh, impact_dirt,
//   impact_body, headshot, explosion, split, splash, death, victory, defeat, coin, buy, error, select.
// Arrow defs reference ids through def.sfx.{launch, impact, flight}.

function env(g, t, a, peak, d, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}
function tone(k, { f = 440, f2 = null, type = 'sine', a = 0.005, d = 0.2, gain = 0.3, delay = 0, q = 0 }) {
  const { ac, out } = k, t = k.t + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
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

export const SFX = {
  ui_click: (k) => { tone(k, { f: 880, f2: 1320, type: 'triangle', d: 0.07, gain: 0.18 }); },
  ui_back: (k) => { tone(k, { f: 660, f2: 440, type: 'triangle', d: 0.09, gain: 0.16 }); },
  select: (k) => { tone(k, { f: 740, type: 'triangle', d: 0.06, gain: 0.14 }); tone(k, { f: 1110, type: 'sine', d: 0.08, gain: 0.1, delay: 0.04 }); },
  error: (k) => { tone(k, { f: 220, f2: 180, type: 'square', d: 0.14, gain: 0.08 }); },
  turn_start: (k) => { [523, 659, 784].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.18, gain: 0.16, delay: i * 0.07 })); },
  timer_tick: (k) => { tone(k, { f: 1500, type: 'square', d: 0.03, gain: 0.05 }); },
  step: (k) => { noise(k, { f: 500, q: 0.8, d: 0.05, gain: 0.08 }); },
  land: (k) => { noise(k, { type: 'lowpass', f: 600, d: 0.14, gain: 0.25 }); tone(k, { f: 120, f2: 60, d: 0.12, gain: 0.2 }); },
  draw_start: (k) => { noise(k, { f: 2400, f2: 900, q: 3, a: 0.2, d: 0.35, gain: 0.05 }); tone(k, { f: 180, f2: 260, type: 'sawtooth', a: 0.25, d: 0.4, gain: 0.025 }); },
  release: (k, o) => {
    const p = o.power ?? 60;
    tone(k, { f: 140 + p, f2: 70, type: 'triangle', d: 0.18, gain: 0.3 });
    noise(k, { type: 'highpass', f: 3000, d: 0.08, gain: 0.12 });
    noise(k, { f: 1800, f2: 600, q: 2, a: 0.02, d: 0.35, gain: 0.07 + p * 0.0008, delay: 0.02 });
  },
  whoosh: (k) => { noise(k, { f: 900, f2: 2400, q: 4, a: 0.12, d: 0.25, gain: 0.05 }); },
  impact_dirt: (k) => { noise(k, { type: 'lowpass', f: 900, f2: 200, d: 0.22, gain: 0.4 }); tone(k, { f: 160, f2: 70, d: 0.12, gain: 0.25 }); },
  impact_body: (k) => { tone(k, { f: 260, f2: 90, type: 'triangle', d: 0.16, gain: 0.4 }); noise(k, { f: 700, q: 1.5, d: 0.12, gain: 0.25 }); },
  headshot: (k) => {
    tone(k, { f: 1400, type: 'triangle', d: 0.35, gain: 0.25 }); tone(k, { f: 2100, type: 'sine', d: 0.5, gain: 0.15, delay: 0.03 });
    tone(k, { f: 300, f2: 90, type: 'triangle', d: 0.2, gain: 0.35 });
  },
  explosion: (k) => {
    noise(k, { type: 'lowpass', f: 1400, f2: 120, a: 0.004, d: 1.1, gain: 0.85 });
    tone(k, { f: 95, f2: 32, type: 'sine', d: 0.7, gain: 0.7 });
    noise(k, { type: 'highpass', f: 2500, d: 0.15, gain: 0.2 });
  },
  split: (k) => { tone(k, { f: 900, f2: 1800, type: 'triangle', d: 0.12, gain: 0.18 }); tone(k, { f: 1350, f2: 2600, type: 'sine', d: 0.16, gain: 0.12, delay: 0.03 }); },
  splash: (k) => { noise(k, { f: 1200, f2: 300, q: 0.8, a: 0.01, d: 0.6, gain: 0.45 }); tone(k, { f: 300, f2: 120, d: 0.2, gain: 0.15 }); },
  death: (k) => { [392, 330, 262, 196].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.2, gain: 0.18, delay: i * 0.1 })); },
  victory: (k) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(k, { f, type: 'triangle', d: i === 5 ? 0.6 : 0.16, gain: 0.2, delay: i * 0.11 })); },
  defeat: (k) => { [392, 370, 349, 262].forEach((f, i) => tone(k, { f, type: 'sawtooth', d: 0.3, gain: 0.07, delay: i * 0.22 })); },
  coin: (k) => { tone(k, { f: 1320, type: 'square', d: 0.06, gain: 0.07 }); tone(k, { f: 1760, type: 'square', d: 0.16, gain: 0.07, delay: 0.06 }); },
  buy: (k) => { [784, 988, 1175, 1568].forEach((f, i) => tone(k, { f, type: 'triangle', d: 0.12, gain: 0.15, delay: i * 0.05 })); },
};
