// WebAudio engine: context lifecycle (created on first user gesture), buses, mute persistence, pause/resume.
// Sound RECIPES live in audio/sfx.js and the music loop in audio/music.js (Arrows/VFX/Audio specialist).
import { SFX } from '../audio/sfx.js';
import { createMusic } from '../audio/music.js';
import { createAmbience } from '../audio/ambience.js';
import { store } from './store.js';

export const audio = {
  ac: null, master: null, sfx: null, music: null, noise: null, muted: store.get('muted', false),
  track: null, wantTrack: null, amb: null, ambId: null, wantAmb: null, paused: false, _last: new Map(),
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended' && !this.paused) this.ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ac = new AC(); } catch (e) { return; }
    const ac = this.ac;
    this.master = ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ac.destination);
    this.sfx = ac.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = ac.createGain(); this.music.gain.value = 0.32; this.music.connect(this.master);
    this.ambBus = ac.createGain(); this.ambBus.gain.value = 0.22; this.ambBus.connect(this.master);
    const len = ac.sampleRate * 1.5, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    if (this.wantTrack) this.playMusic(this.wantTrack);
    if (this.wantAmb) this.playAmbience(this.wantAmb);
  },
  /** Per-map ambience bed (audio/ambience.js); null stops it. */
  playAmbience(id) {
    this.wantAmb = id;
    if (!this.ac || this.ambId === id) return;
    this.amb?.stop(); this.amb = null; this.ambId = id;
    if (id) this.amb = createAmbience({ ac: this.ac, out: this.ambBus }, id);
  },
  /** Play a recipe from audio/sfx.js. opts are passed through (e.g. { power, pitch, gain }). Rate-limited per id. */
  has(id) { return !!SFX[id]; },
  play(id, opts = {}) {
    if (!this.ac || this.muted || this.paused) return;
    const fn = SFX[id]; if (!fn) return;
    const now = this.ac.currentTime, last = this._last.get(id) ?? -1;
    if (now - last < (opts.minGap ?? 0.03)) return;
    this._last.set(id, now);
    try { fn({ ac: this.ac, out: this.sfx, t: now, noise: this.noise }, opts); } catch (e) { console.error('[sfx ' + id + ']', e); }
  },
  playMusic(trackId) {
    this.wantTrack = trackId;
    if (!this.ac) return;
    if (this.track?.id === trackId) return;
    this.track?.stop();
    this.track = createMusic({ ac: this.ac, out: this.music, noise: this.noise }, trackId);
    if (this.track) this.track.id = trackId;
  },
  setMuted(m) {
    this.muted = m; store.set('muted', m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ac.currentTime, 0.05);
  },
  pause() { this.paused = true; this.ac?.suspend().catch(() => {}); },
  resume() { this.paused = false; this.ac?.resume().catch(() => {}); },
};
