// Per-map ambience beds (owner: Arrows/VFX/Audio specialist). createAmbience({ ac, out }, mapId) -> { stop() } | null.
// Each bed is a few filtered-noise layers with slow LFOs plus sparse scheduled one-shots (gulls, lava pops, rain
// drips), mixed low under the music. Nodes are built once per bed; the scheduler only adds short one-shot voices.
let longNoise = null;
function noiseBuf(ac) { // 4 s of pink-ish noise, shared (the 1.5 s SFX buffer loops audibly under a constant bed)
  if (longNoise && longNoise.sampleRate === ac.sampleRate) return longNoise;
  const n = ac.sampleRate * 4, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
  return (longNoise = b);
}

const BEDS = {
  // tropical sea: surf swells + soft breeze, the odd gull
  sunspire: { layers: [{ type: 'lowpass', f: 520, q: 0.7, gain: 0.5, lfo: 0.09, depth: 0.85 }, { type: 'bandpass', f: 1400, q: 0.9, gain: 0.12, lfo: 0.21, depth: 0.6, sweep: 500 }], events: 'gull' },
  // mountain snow wind: a howl that drifts in pitch + powdery hiss
  frostpeak: { layers: [{ type: 'bandpass', f: 520, q: 7, gain: 0.55, lfo: 0.07, depth: 0.7, sweep: 260 }, { type: 'highpass', f: 3800, q: 0.5, gain: 0.08, lfo: 0.13, depth: 0.6 }, { type: 'lowpass', f: 300, q: 0.7, gain: 0.25, lfo: 0.05, depth: 0.5 }] },
  // desert: dry gusts + sand skitter
  ruins: { layers: [{ type: 'bandpass', f: 800, q: 1.6, gain: 0.32, lfo: 0.11, depth: 0.8, sweep: 380 }, { type: 'highpass', f: 5200, q: 0.6, gain: 0.06, lfo: 0.17, depth: 0.9 }] },
  // lava: deep rumble + roar, bubbling pops
  emberforge: { layers: [{ type: 'lowpass', f: 140, q: 0.9, gain: 1.0, lfo: 0.06, depth: 0.4 }, { type: 'bandpass', f: 420, q: 1.2, gain: 0.18, lfo: 0.13, depth: 0.6 }], hum: [38, 0.07], events: 'bubble' },
  // city at night: electrical hum + steady rain + drips
  neon: { layers: [{ type: 'highpass', f: 2600, q: 0.4, gain: 0.16, lfo: 0.3, depth: 0.15 }, { type: 'bandpass', f: 1100, q: 0.6, gain: 0.1, lfo: 0.2, depth: 0.2 }, { type: 'lowpass', f: 220, q: 0.7, gain: 0.2, lfo: 0.04, depth: 0.3 }], hum: [60, 0.03], events: 'drip' },
};
export const hasAmbience = (id) => !!BEDS[id];

export function createAmbience(k, id) {
  const B = BEDS[id]; if (!B) return null;
  const { ac, out } = k, nb = noiseBuf(ac), t0 = ac.currentTime, nodes = [];
  const bus = ac.createGain(); bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(1, t0 + 2.5); bus.connect(out);
  for (const L of B.layers) {
    const src = ac.createBufferSource(); src.buffer = nb; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = L.type; fl.frequency.value = L.f; fl.Q.value = L.q;
    const g = ac.createGain(); g.gain.value = L.gain * (1 - L.depth * 0.5);
    const lfo = ac.createOscillator(); lfo.frequency.value = L.lfo * (0.85 + Math.random() * 0.3);
    const lg = ac.createGain(); lg.gain.value = L.gain * L.depth * 0.5; lfo.connect(lg).connect(g.gain);
    if (L.sweep) { const sg = ac.createGain(); sg.gain.value = L.sweep; lfo.connect(sg).connect(fl.frequency); }
    src.connect(fl).connect(g).connect(bus);
    src.start(t0, Math.random() * 3); lfo.start(t0);
    nodes.push(src, lfo);
  }
  if (B.hum) {
    const [f, gain] = B.hum, g = ac.createGain(); g.gain.value = gain;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * 4; g.connect(lp).connect(bus);
    for (const m of [1, 2]) { const o = ac.createOscillator(); o.type = m === 1 ? 'sine' : 'sawtooth'; o.frequency.value = f * m; const og = ac.createGain(); og.gain.value = m === 1 ? 1 : 0.25; o.connect(og).connect(g); o.start(t0); nodes.push(o); }
  }
  // sparse one-shots
  let alive = true, timer = 0, next = t0 + 1.5;
  const blip = (t, f, f2, d, gain, type = 'sine') => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(bus); o.start(t); o.stop(t + d + 0.02);
  };
  const EV = {
    gull: (t) => { const f = 1300 + Math.random() * 300, n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) blip(t + i * 0.22, f, f * 0.72, 0.18, 0.025, 'triangle'); return 5 + Math.random() * 8; },
    bubble: (t) => { for (let i = 0; i < 3; i++) blip(t + Math.random() * 0.6, 70 + Math.random() * 60, 160 + Math.random() * 120, 0.09, 0.08); return 0.8 + Math.random() * 1.6; },
    drip: (t) => { for (let i = 0; i < 4; i++) blip(t + Math.random() * 0.5, 1800 + Math.random() * 1600, 900, 0.04, 0.02); return 0.3 + Math.random() * 0.5; },
  };
  const tick = () => {
    if (!alive) return;
    if (B.events) { if (next < ac.currentTime) next = ac.currentTime + 0.05; while (next < ac.currentTime + 0.4) next += EV[B.events](next); }
    timer = setTimeout(tick, 250);
  };
  tick();
  return {
    stop() {
      alive = false; clearTimeout(timer);
      const t = ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(0.0001, t, 0.4);
      setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (e) { /* already stopped */ } } bus.disconnect(); }, 2000);
    },
  };
}
