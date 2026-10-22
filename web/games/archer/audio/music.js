// Procedural music loops (owner: Arrows/VFX/Audio specialist).
// createMusic({ac, out, noise}, trackId) -> { stop() } ; trackIds used by the core: 'menu', 'battle'.
// Maps may name a track in def.music (falls back to 'battle').
const SCALES = { menu: [0, 2, 4, 7, 9], battle: [0, 3, 5, 7, 10] };
const ROOT = { menu: 57, battle: 52 };
const BPM = { menu: 96, battle: 118 };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createMusic(k, trackId) {
  const { ac, out } = k, id = SCALES[trackId] ? trackId : 'battle';
  const scale = SCALES[id], root = ROOT[id], spb = 60 / BPM[id] / 2; // eighth notes
  let step = 0, next = ac.currentTime + 0.1, alive = true, timer = 0;
  const bus = ac.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(1, ac.currentTime + 1.5); bus.connect(out);
  const pat = [0, 2, 4, 2, 3, 1, 4, 2, 0, 2, 4, 3, 1, 2, 3, 4];
  const bass = [0, 0, 3, 3, 4, 4, 2, 2];
  function note(t, f, dur, type, gain) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function hat(t, gain) {
    const s = ac.createBufferSource(); s.buffer = k.noise; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ac.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + 0.06);
  }
  function tick() {
    if (!alive) return;
    while (next < ac.currentTime + 0.25) {
      const bar = Math.floor(step / 16), s16 = step % 16;
      const deg = pat[(s16 + bar * 3) % 16], oct = s16 % 8 === 7 ? 12 : 0;
      if (s16 % 2 === 0 || Math.random() < 0.35) note(next, mtof(root + 12 + scale[deg % scale.length] + oct), 0.22, 'triangle', 0.07);
      if (s16 % 4 === 0) note(next, mtof(root - 12 + scale[bass[(s16 / 2 + bar * 2) % 8] % scale.length]), 0.4, 'sine', 0.14);
      if (id === 'battle' || s16 % 2 === 0) hat(next, s16 % 4 === 2 ? 0.05 : 0.025);
      step++; next += spb;
    }
    timer = setTimeout(tick, 90);
  }
  tick();
  return { stop() { alive = false; clearTimeout(timer); bus.gain.setTargetAtTime(0, ac.currentTime, 0.3); setTimeout(() => bus.disconnect(), 1500); } };
}
