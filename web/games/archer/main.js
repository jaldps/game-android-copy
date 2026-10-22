// Bowbrawl — boot, app wiring, main loop and testing hooks (?autoplay ?scene ?seed ?warp ?fixedstep ?map ?char).
import { setOrientation, goHome, onBack, onPauseResume } from '../../shared/platform.js';
import { P } from './core/params.js';
import { initRender, renderFrame, resize, R } from './core/render.js';
import { updateCamera, addShake, cam } from './core/camera.js';
import { FX } from './core/fx.js';
import { Match } from './core/match.js';
import { Hud } from './core/hud.js';
import { input, bindInput, createHumanController } from './core/input.js';
import { audio } from './core/audio.js';
import { store } from './core/store.js';
import { makeRng } from './core/util.js';
import { trayArrows } from './arrows/index.js';
import { MAPS, getMap } from './maps/index.js';
import { getCharacter, CHARACTERS } from './characters/index.js';
import { createMeta } from './meta/index.js';

setOrientation('landscape');
const canvas = document.getElementById('c');
let quality = P.quality || store.get('quality', 'high');
initRender(canvas, quality);
const fx = new FX(R.scene); fx.onShake = (a) => addShake(a);

let seedCounter = P.seed ?? ((Date.now() / 1000) | 0) % 1000000;
const rng = makeRng((seedCounter ^ 0x5bd1e995) >>> 0);
let match = null, paused = false, pendingEnd = null, autoplayT = -1, autoplayN = 0;
const trayIds = () => trayArrows().map((a) => a.id);

const app = {
  audio, rng,
  seed: () => seedCounter,
  newSeed: () => (seedCounter = (seedCounter * 1103515245 + 12345) % 2147483647),
  startMatch, endMatch,
  showcase(charId, outfitId) {
    if (match?.cfg.showcase) { match.restyle(0, charId, outfitId); return; }
    startMatch({ mode: 'showcase', showcase: true, mapId: P.map || 'sunspire', seed: 7, players: [{ charId, outfitId, controller: 'none', team: 0 }] });
  },
  restyle(charId, outfitId) { if (match?.cfg.showcase) match.restyle(0, charId, outfitId); },
  hud(v) { hud.show(v); },
  setPaused(v) { paused = v; if (v) audio.music?.gain.setTargetAtTime(0.12, audio.ac.currentTime, 0.2); else if (audio.ac) audio.music.gain.setTargetAtTime(0.32, audio.ac.currentTime, 0.2); },
  goHome() { goHome(); },
  quality: () => quality,
  toggleQuality() { quality = quality === 'high' ? 'low' : 'high'; store.set('quality', quality); location.reload(); },
};
const meta = createMeta(app);
const hud = new Hud(document.getElementById('hud'), { onPause: () => meta.showPause() });
bindInput(canvas, () => (meta.isPauseOpen() ? meta.hidePause() : match && !match.cfg.showcase && !P.autoplay && meta.showPause()));

function controllers(pc, slot) {
  if (pc.controller === 'human') return createHumanController(trayIds);
  if (pc.controller === 'ai') return meta.createController(pc, slot);
  return null;
}
function startMatch(cfg) {
  endMatch();
  input.left = input.right = input.fire = input.angUp = input.angDown = false; input.arrowPick = null;
  match = new Match(cfg, { scene: R.scene, fx, controllers, onEnd: (s) => (pendingEnd = s) });
  cam.menuDrift = !!cfg.showcase;
  hud.attach(match); hud.show(!cfg.showcase && P.hud);
  paused = false;
  audio.playMusic(cfg.showcase ? 'menu' : getMap(cfg.mapId).music ?? 'battle');
  return match;
}
function endMatch() { if (match) { match.dispose(); match = null; } pendingEnd = null; }

function handleEnd() {
  const s = pendingEnd; pendingEnd = null;
  if (P.autoplay) { autoplayT = 0.6; return; }
  meta.onMatchEnd(s);
}
function startAutoplay() {
  const s = app.newSeed();
  const over = { mapId: P.map || MAPS[autoplayN % MAPS.length].id, charId: P.char || undefined, outfitId: P.outfit || undefined };
  if (P.seed !== null && autoplayN === 0) seedCounter = P.seed;
  autoplayN++;
  startMatch(meta.autoplayConfig(P.seed !== null && autoplayN === 1 ? P.seed : s, over));
}

// ------------------------------------------------------------------ scenes
function boot() {
  const over = { mapId: P.map || undefined, charId: P.char || undefined, outfitId: P.outfit || undefined };
  if (P.autoplay) startAutoplay();
  else if (P.scene === 'play') { startMatch(meta.quickConfig(P.seed ?? app.newSeed(), over)); meta.setMode('play'); }
  else if (P.scene === 'shop') meta.showShop();
  else if (P.scene === 'over') {
    startMatch(meta.autoplayConfig(P.seed ?? 11, { mapId: P.map || 'sunspire', charId: P.char || 'vela' }));
    for (let t = 0; t < 6; t += 1 / 60) { match.update(1 / 60); updateCamera(1 / 60); }
    match.actors[1].damage(999, match.actors[0], {}); match.over = true; match.winnerTeam = 0; match.phase = 'end'; match._celebrate?.();
    const s = match.summary(); s.won = true; s.mode = 'quick';
    const me = s.actors[0]; me.human = true; me.damage = Math.max(me.damage, 112); me.headshots = Math.max(me.headshots, 1); me.shots = Math.max(me.shots, 5); me.hits = Math.max(me.hits, 4); me.hp = Math.max(me.hp, 71);
    s.turns = Math.max(s.turns, 9);
    meta.showResults(s, { coins: 236, xp: 168, stars: 2, levelUp: false, after: { level: 3, xp: 260, need: 440 } });
  } else meta.showMenu();
  if (P.warp > 0 && match) {
    const step = 1 / 60;
    for (let t = 0; t < P.warp; t += step) {
      match.update(step); updateCamera(step);
      if (pendingEnd) { if (P.autoplay) { pendingEnd = null; startAutoplay(); } else handleEnd(); }
    }
  }
}

// ------------------------------------------------------------------ platform
onBack(() => {
  if (P.autoplay) return false;
  return meta.back();
});
onPauseResume(() => { audio.pause(); if (match && !match.cfg.showcase && !P.autoplay && meta.mode === 'play') meta.showPause(); }, () => audio.resume());
window.addEventListener('resize', () => { resize(); });

// ------------------------------------------------------------------ hooks for the critic
window.__game = {
  get scene() { return match?.cfg.showcase ? 'menu' : meta.mode; },
  get phase() { return match?.phase; },
  get turn() { return match?.turnNo; },
  get map() { return match?.map.id; },
  get seed() { return match?.seed; },
  get wind() { return match ? { strength: match.wind.strength, angleDeg: Math.round(match.wind.angle * 180 / Math.PI) } : null; },
  get active() { return match?.active?.name; },
  get actors() { return match?.actors.map((a) => ({ name: a.name, char: a.charDef.id, outfit: a.outfitDef?.id, hp: a.hp, alive: a.alive, x: +a.x.toFixed(2), y: +a.y.toFixed(2), angle: Math.round(a.angle), lastPower: Math.round(a.lastPower), delay: Math.round(a.delay) })); },
  get match() { return match; },
};
window.__fps = 0;

// ------------------------------------------------------------------ loop
let last = performance.now(), fpsN = 0, fpsT = 0, booted = false;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000)); last = now;
  if (P.fixedstep) dt = 1 / 60;
  fpsN++; fpsT += Math.max(1e-3, (now - (frame.prev ?? now)) / 1000); frame.prev = now;
  if (fpsT >= 1) { window.__fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  if (match && !paused) match.update(dt);
  if (pendingEnd) handleEnd();
  if (autoplayT >= 0) { autoplayT -= dt; if (autoplayT < 0) startAutoplay(); }
  if (match && !match.cfg.showcase && P.hud) hud.update(dt);
  updateCamera(dt);
  renderFrame();
  if (!booted) { booted = true; document.getElementById('boot')?.classList.add('done'); }
}
document.fonts.ready.then(() => {}).catch(() => {});
boot();
requestAnimationFrame(frame);
