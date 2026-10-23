// Procedural, adaptive music (owner: Arrows/VFX/Audio specialist).
// createMusic({ac, out, noise}, trackId) -> { stop() } ; trackIds used by the core: 'menu', 'battle' (+ any MapDef.music id).
// 'battle' is ADAPTIVE: it follows the current map (heard via the core 'match:start' event) and re-voices itself at the next
// bar — scale, tempo, instruments and drum feel — so each biome has its own mood without restarting the loop.
// Moods: menu · sunspire (tropical) · frostpeak (icy bells) · ruins (desert, phrygian) · emberforge (heavy forge) ·
// neon (synthwave) · battle (generic fallback). A MapDef may also name a mood id directly in `music`.
import { events } from '../core/events.js';

const MOODS = {
  menu:       { root: 57, bpm: 96,  scale: [0, 2, 4, 7, 9],          prog: [0, 3, 4, 2], lead: 'triangle', leadDec: 0.28, leadGain: 0.06, leadMask: 0x5555, bass: 'sine',     bassHits: [0, 8],          kick: [],                 snare: [],          hat: 0x4444, hatGain: 0.018, pad: 0.035, padType: 'sine' },
  battle:     { root: 52, bpm: 118, scale: [0, 3, 5, 7, 10],         prog: [0, 3, 2, 4], lead: 'triangle', leadDec: 0.2,  leadGain: 0.065, leadMask: 0x7575, bass: 'sine',    bassHits: [0, 6, 8, 14],   kick: [0, 8],             snare: [4, 12],     hat: 0x5555, hatGain: 0.03, pad: 0.02, padType: 'triangle' },
  sunspire:   { root: 53, bpm: 122, scale: [0, 2, 4, 5, 7, 9, 11],   prog: [0, 5, 3, 4], lead: 'triangle', leadDec: 0.12, leadGain: 0.08, leadMask: 0x6db6, bass: 'triangle', bassHits: [0, 3, 8, 11],   kick: [0, 8],             snare: [4, 12],     hat: 0xaaaa, hatGain: 0.025, pad: 0.02, padType: 'sine' },
  frostpeak:  { root: 50, bpm: 100, scale: [0, 2, 4, 6, 7, 9, 11],   prog: [0, 4, 5, 3], lead: 'sine',     leadDec: 0.6,  leadGain: 0.07, leadMask: 0x1111, bass: 'sine',     bassHits: [0, 10],         kick: [0],                snare: [8],         hat: 0x2222, hatGain: 0.02, pad: 0.04, padType: 'sine', octUp: 12 },
  ruins:      { root: 52, bpm: 112, scale: [0, 1, 4, 5, 7, 8, 10],   prog: [0, 0, 6, 1], lead: 'sawtooth', leadDec: 0.16, leadGain: 0.04, leadMask: 0x5b5b, bass: 'triangle', bassHits: [0, 3, 6, 10],   kick: [0, 6, 10],         snare: [4, 12],     hat: 0x4949, hatGain: 0.025, pad: 0.015, padType: 'triangle', lp: 1800 },
  emberforge: { root: 48, bpm: 128, scale: [0, 2, 3, 5, 7, 8, 11],   prog: [0, 5, 3, 4], lead: 'square',   leadDec: 0.14, leadGain: 0.035, leadMask: 0x1515, bass: 'sawtooth', bassHits: [0, 2, 8, 10, 12], kick: [0, 4, 8, 12, 14], snare: [4, 12],   hat: 0x5555, hatGain: 0.03, pad: 0.02, padType: 'sawtooth', lp: 1200 },
  neon:       { root: 45, bpm: 124, scale: [0, 2, 3, 5, 7, 9, 10],   prog: [0, 5, 2, 6], lead: 'sawtooth', leadDec: 0.1,  leadGain: 0.035, leadMask: 0xffff, bass: 'sawtooth', bassHits: [0, 2, 4, 6, 8, 10, 12, 14], kick: [0, 4, 8, 12], snare: [4, 12], hat: 0x4444, hatGain: 0.04, pad: 0.025, padType: 'sawtooth', lp: 2400, arp: true },
};
const MOTIF = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 4, 2, 3, 1];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let currentMap = null;
events.on('match:start', (m) => { currentMap = m?.cfg?.showcase ? null : m?.map?.id ?? null; listeners.forEach((fn) => fn()); });
const listeners = new Set();

function moodFor(trackId) {
  if (trackId === 'menu') return MOODS.menu;
  if (MOODS[trackId] && trackId !== 'battle') return MOODS[trackId];
  return MOODS[currentMap] ?? MOODS.battle;
}

export function createMusic(k, trackId) {
  const { ac, out } = k;
  let mood = moodFor(trackId), pending = null;
  let step = 0, next = ac.currentTime + 0.1, alive = true, timer = 0;
  const bus = ac.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(1, ac.currentTime + 1.5);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mood.lp ?? 5000; lp.Q.value = 0.7;
  lp.connect(bus); bus.connect(out);
  const onMap = () => { const m = moodFor(trackId); if (m !== mood) pending = m; };
  listeners.add(onMap);

  const deg = (d) => { const s = mood.scale, n = s.length, o = Math.floor(d / n); return mood.root + s[((d % n) + n) % n] + 12 * o; };
  function note(t, f, dur, type, gain, dest = lp) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function pad(t, f, dur, type, gain) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(lp); o.start(t); o.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.25);
  }
  function hit(t, f, q, gain, dur) {
    const s = ac.createBufferSource(); s.buffer = k.noise; const fl = ac.createBiquadFilter(); fl.type = q ? 'bandpass' : 'highpass'; fl.frequency.value = f; if (q) fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.01);
  }
  function tick() {
    if (!alive) return;
    while (next < ac.currentTime + 0.25) {
      const s16 = step % 16, bar = Math.floor(step / 16);
      if (s16 === 0 && pending) { mood = pending; pending = null; lp.frequency.setTargetAtTime(mood.lp ?? 5000, next, 0.3); }
      const M = mood, spb = 60 / M.bpm / 4, chord = M.prog[bar % M.prog.length];
      if (s16 === 0 && M.pad) for (const d of [0, 2, 4]) pad(next, mtof(deg(chord + d)), spb * 16, M.padType, M.pad);
      if (M.bassHits.includes(s16)) note(next, mtof(deg(chord) - 24), spb * (M.arp ? 1.6 : 3), M.bass, M.bass === 'sawtooth' ? 0.07 : 0.14);
      if ((M.leadMask >> s16) & 1) {
        const d = M.arp ? chord + [0, 2, 4, 7][s16 % 4] : chord + MOTIF[(s16 + bar * 5) % 16];
        if (M.arp || Math.random() < 0.85) note(next, mtof(deg(d) + 12 + (M.octUp ?? 0)), M.leadDec, M.lead, M.leadGain);
      }
      if (M.kick.includes(s16)) kick(next);
      if (M.snare.includes(s16)) { hit(next, 1800, 0.8, 0.09, 0.14); hit(next, 6000, 0, 0.03, 0.08); }
      if ((M.hat >> s16) & 1) hit(next, 7500, 0, s16 % 4 === 2 ? M.hatGain * 1.6 : M.hatGain, 0.045);
      step++; next += spb;
    }
    timer = setTimeout(tick, 90);
  }
  tick();
  return {
    stop() {
      alive = false; clearTimeout(timer); listeners.delete(onMap);
      bus.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => bus.disconnect(), 1500);
    },
  };
}
