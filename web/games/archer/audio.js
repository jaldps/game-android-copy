// WebAudio procedural SFX + music for Bowbrawl.
let ctx = null, master = null, musicGain = null, muted = false, musicOn = true;
let musicTimer = null, musicStep = 0;
const SFX_VOL = 0.35;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
  } catch (e) { ctx = null; }
}
export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

export function setMuted(v) { muted = !!v; if (master) master.gain.value = muted ? 0 : 0.9; }
export function setMusic(v) { musicOn = !!v; if (musicGain) musicGain.gain.value = musicOn ? 0.18 : 0; }
export function isMuted() { return muted; }

function env(g, a, d, s, r, peak = 1) {
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  return t + a + d + r;
}
function tone(freq, dur, type = 'sine', vol = 0.25, slide = 0) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
  o.connect(g); g.connect(master);
  const end = env(g, 0.005, dur * 0.3, dur * 0.5, 0.08, vol * SFX_VOL);
  o.start(); o.stop(end + 0.05);
}
function noise(dur, vol = 0.2, hp = 400) {
  if (!ctx || muted) return;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.value = vol * SFX_VOL;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(); src.stop(ctx.currentTime + dur);
}

export const SFX = {
  draw() { tone(220, 0.08, 'triangle', 0.15, 60); },
  release() { tone(520, 0.12, 'sawtooth', 0.2, -120); noise(0.08, 0.12, 800); },
  fly() {},
  hit() { tone(300, 0.12, 'square', 0.25, -180); noise(0.12, 0.18, 600); },
  headshot() { tone(660, 0.1, 'square', 0.3, 0); setTimeout(() => tone(990, 0.15, 'square', 0.3, 0), 80); noise(0.15, 0.2, 1000); },
  miss() { tone(180, 0.2, 'sine', 0.15, -60); },
  ui() { tone(440, 0.06, 'triangle', 0.12, 80); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22, 0), i * 120)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.2, 0), i * 150)); },
  coin() { tone(880, 0.08, 'triangle', 0.18, 220); },
};

export function startMusic() {
  if (!ctx) return;
  if (musicTimer) return;
  const scale = [262, 294, 330, 392, 440, 523, 587, 659];
  musicTimer = setInterval(() => {
    if (muted || !musicOn || !ctx) return;
    const f = scale[Math.floor(Math.random() * scale.length)];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o.connect(g); g.connect(musicGain);
    const end = env(g, 0.01, 0.12, 0.3, 0.2, 0.5);
    o.start(); o.stop(end + 0.05);
  }, 320);
}
export function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
export function pauseAudio() { if (ctx) ctx.suspend(); }
export function resumeAudio2() { if (ctx) ctx.resume(); }