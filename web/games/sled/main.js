// Frostline Dash — orchestration
import * as THREE from 'three';
import { setOrientation, onBack, onPauseResume, goHome, params, vibrate as hostVibrate } from '../../shared/platform.js';
import { initRender, renderFrame, R, applyTod, followShadow, CURVE } from './render.js';
import { initMaterials, updateGlow } from './materials.js';
import { World } from './world.js';
import { Obstacles, KINDS } from './obstacles.js';
import { buildRider, buildSled, poseRider, buildYeti, poseYeti } from './character.js';
import { CHARACTERS, SLEDS, MISSIONS, LANE_W, LANES, SPEED0, SPEEDMAX, SPEED_TAU, GRAV, JUMP_V, SUPER_JUMP_V, DUCK_TIME, POWER_TIME, KITE_Y, REBASE } from './config.js';
import { makeRng } from './rng.js';
import { load, save, S, persist } from './store.js';

const Q = { autoplay: params.get('autoplay') === '1', scene: params.get('scene'), seed: parseInt(params.get('seed') || '0', 10) || (Date.now() % 100000), fixed: params.get('fixedstep') === '1', warp: parseFloat(params.get('warp') || '0') || 0, tod: params.get('tod') || 'golden' };
setOrientation('portrait');

initRender(document.getElementById('gl'), S.quality || 'high');
initMaterials();
applyTod(Q.tod); updateGlow();

const world = new World(R.scene);
const obstacles = new Obstacles(R.scene);

let charIdx = Math.max(0, CHARACTERS.findIndex(c => c.id === S.char)); if (charIdx < 0) charIdx = 0;
let sledIdx = Math.max(0, SLEDS.findIndex(s => s.id === S.sled)); if (sledIdx < 0) sledIdx = 0;
const playerRig = buildRider(CHARACTERS[charIdx]);
const playerSled = buildSled(SLEDS[sledIdx]);
const player = new THREE.Group(); player.add(playerSled, playerRig.root);
R.scene.add(player);
const yeti = buildYeti(); R.scene.add(yeti.root);

const hud = document.createElement('div');
hud.id = 'hud';
hud.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:Lilita One,sans-serif;color:#fff;text-shadow:0 2px 6px #0008;';
document.body.appendChild(hud);
const mk = (css) => { const d = document.createElement('div'); d.style.cssText = css; hud.appendChild(d); return d; };
const scoreEl = mk('position:absolute;top:12px;left:12px;font-size:28px;');
const coinEl = mk('position:absolute;top:12px;right:12px;font-size:20px;');
const multEl = mk('position:absolute;top:44px;left:12px;font-size:16px;color:#ffd23f;');
const powerEl = mk('position:absolute;bottom:90px;left:50%;transform:translateX(-50%);font-size:18px;display:flex;gap:6px;');
const menuEl = mk('position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:auto;background:rgba(5,10,30,.55);');
const overEl = mk('position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:auto;background:rgba(5,10,30,.7);');

function btn(text, cb) { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'padding:12px 22px;font-size:18px;border:none;border-radius:14px;background:#ffcf3d;color:#3a2a0a;font-family:Lilita One;cursor:pointer;'; b.onclick = cb; return b; }

const G = { mode: 'menu', time: 0, score: 0, coinsRun: 0, mult: 1, speed: SPEED0, lane: 1, x: 0, z: 0, y: 0, vy: 0, duck: 0, air: false, shield: false, magnet: 0, kite: 0, x2: 0, boots: 0, stumble: 0, crashed: false, revived: false, spawnCursor: -40, rng: makeRng(Q.seed), best: S.best || 0, autoplay: Q.autoplay };

function laneX(i) { return LANES[i]; }

let audioCtx = null;
function unlockAudio() { if (audioCtx) return; try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function beep(freq, dur, type = 'square', gain = 0.08) { if (!audioCtx || S.mute) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(audioCtx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur); o.stop(audioCtx.currentTime + dur); }
window.addEventListener('pointerdown', unlockAudio, { once: true });

let swipeStart = null;
const onPointerDown = (e) => { swipeStart = { x: e.clientX, y: e.clientY }; };
const onPointerUp = (e) => {
  if (!swipeStart) return; const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y; const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx < 25 && ady < 25) { swipeStart = null; return; }
  if (G.mode !== 'play' || G.paused) { swipeStart = null; return; }
  if (adx > ady) { if (dx < 0) moveLane(-1); else moveLane(1); }
  else { if (dy < 0) jump(); else duck(); }
  swipeStart = null;
};
window.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('keydown', (e) => {
  if (G.mode !== 'play') return;
  if (e.key === 'ArrowLeft') moveLane(-1);
  if (e.key === 'ArrowRight') moveLane(1);
  if (e.key === 'ArrowUp') jump();
  if (e.key === 'ArrowDown') duck();
  if (e.key === 'Escape') togglePause();
});

function moveLane(dir) { if (G.crashed) return; const nl = G.lane + dir; if (nl < 0 || nl > 2) return; G.lane = nl; beep(440, 0.06, 'square', 0.05); }
function jump() { if (G.crashed || G.air) return; const v = G.boots > 0 ? SUPER_JUMP_V : JUMP_V; G.vy = v; G.air = true; beep(660, 0.08, 'sine', 0.07); }
function duck() { if (G.crashed) return; G.duck = DUCK_TIME; beep(330, 0.06, 'square', 0.05); }
function togglePause() { if (G.mode !== 'play') return; G.paused = !G.paused; }
onBack(() => { if (G.mode === 'play') { togglePause(); return true; } return false; });

if (!S.missions) { S.missions = {}; for (const m of MISSIONS) S.missions[m.k] = { i: 0, v: 0 }; persist(); }

function resetRun() {
  G.mode = 'play'; G.time = 0; G.score = 0; G.coinsRun = 0; G.mult = 1; G.speed = SPEED0; G.lane = 1; G.x = 0; G.z = 0; G.y = 0; G.vy = 0; G.duck = 0; G.air = false; G.shield = false; G.magnet = 0; G.kite = 0; G.x2 = 0; G.boots = 0; G.stumble = 0; G.crashed = false; G.revived = false; G.spawnCursor = -40;
  G.rng = makeRng(Q.seed + (S.runs || 0));
  world.reset(Q.seed + (S.runs || 0));
  obstacles.reset();
  player.position.set(0, 0, 0);
  yeti.root.position.set(-2.1, 0, 2.5);
  applyTod(Q.tod); updateGlow();
  S.runs = (S.runs || 0) + 1; persist();
}

function spawnPattern(z) {
  const r = G.rng;
  const type = r();
  if (type < 0.25) {
    const lane = r.int(0, 2);
    const kind = r.pick(['low', 'log', 'snowman', 'ice']);
    obstacles.add(kind, lane, z);
    if (r.chance(0.5)) obstacles.coinLine((lane + 1) % 3, z - 2, 5);
  } else if (type < 0.45) {
    const safe = r.int(0, 2);
    for (let l = 0; l < 3; l++) if (l !== safe) obstacles.add(r.pick(['low', 'high']), l, z);
    obstacles.coinLine(safe, z - 1, 6);
  } else if (type < 0.6) {
    for (let l = 0; l < 3; l++) obstacles.add('high', l, z);
    obstacles.coinArc(1, z - 2, 5, 0.9, 2.4);
  } else if (type < 0.75) {
    const lane = r.int(0, 2);
    obstacles.add('cart', lane, z);
    obstacles.add('ramp', (lane + 1) % 3, z - 2);
    obstacles.coinLine((lane + 2) % 3, z - 1, 4);
  } else if (type < 0.88) {
    const lane = r.int(0, 2);
    const o = obstacles.add('loco', lane, z);
    o.moving = true; o.active = false; o.vz = -(6 + G.speed * 0.2); o.actDist = 40; o.zm = z;
    obstacles.coinLine((lane + 1) % 3, z - 1, 5);
  } else {
    const kind = r.pick(KINDS);
    const lane = r.int(0, 2);
    obstacles.power(kind, lane, z - 1, 1.3);
    obstacles.coinArc(lane, z - 3, 6);
  }
  if (r.chance(0.4)) obstacles.coinLine(r.int(0, 2), z - 6, 4);
  if (r.chance(0.12)) obstacles.power(r.pick(KINDS), r.int(0, 2), z - 8, 1.3);
}

function spawnAhead() {
  while (G.spawnCursor > G.z - 180) {
    spawnPattern(G.spawnCursor);
    G.spawnCursor -= 12 + G.rng.range(0, 8);
  }
}

function handleCollisions() {
  const px = G.x, pz = G.z, py = G.y;
  for (const o of obstacles.list) {
    if (Math.abs(o.x - px) > 1.0) continue;
    const cz = o.z - o.len / 2;
    if (Math.abs(cz - pz) > o.len / 2 + 0.7) continue;
    let hit = false;
    if (o.pass === 'jump') { if (!G.air && !(G.duck > 0)) hit = true; }
    else if (o.pass === 'duck') { if (!(G.duck > 0) && py < o.under) hit = true; }
    else if (o.pass === 'none') { if (py < o.h - 0.2) hit = true; }
    else if (o.pass === 'top') { if (G.air && py > o.top - 0.5 && py < o.top + 1) { G.y = o.top + 0.05; G.vy = 0; } else if (py < o.h - 0.2) hit = true; }
    else if (o.pass === 'ramp') { if (py < 0.5) { G.vy = 12; G.air = true; } }
    if (hit) {
      if (G.shield) { G.shield = false; beep(220, 0.2, 'sawtooth', 0.1); }
      else crash();
      return;
    }
  }
  for (const c of obstacles.coins) {
    if (c.taken) continue;
    if (Math.hypot(c.x - px, c.y - (py + 0.9), c.z - pz) < 1.1) {
      c.taken = true; G.coinsRun++; G.score += 10 * G.mult; beep(880, 0.05, 'sine', 0.06);
    }
  }
  for (const p of obstacles.powers) {
    if (p.taken) continue;
    if (Math.hypot(p.x - px, p.y - (py + 0.9), p.z - pz) < 1.3) {
      p.taken = true; p.mesh.visible = false;
      if (p.kind === 'magnet') G.magnet = POWER_TIME.magnet;
      if (p.kind === 'kite') { G.kite = POWER_TIME.kite; G.y = KITE_Y; G.vy = 0; G.air = true; }
      if (p.kind === 'x2') { G.x2 = POWER_TIME.x2; G.mult = 2; }
      if (p.kind === 'shield') { G.shield = true; }
      if (p.kind === 'boots') { G.boots = POWER_TIME.boots; }
      G.score += 50; beep(520, 0.12, 'triangle', 0.08);
    }
  }
}

function crash() {
  if (G.crashed) return;
  G.crashed = true; G.stumble++;
  beep(150, 0.3, 'sawtooth', 0.15);
  if (G.stumble >= 2) {
    setTimeout(() => { if (G.crashed) gameOver(); }, 900);
  } else {
    setTimeout(() => { G.crashed = false; }, 600);
  }
}
function gameOver() {
  G.mode = 'over';
  S.coins = (S.coins || 0) + G.coinsRun;
  S.best = Math.max(S.best || 0, G.score);
  persist();
  overEl.style.display = 'flex';
  overEl.innerHTML = `<h1 style="font-size:34px;margin:0">Crash!</h1><p>Score ${Math.floor(G.score)}</p><p>Coins ${G.coinsRun}</p>`;
  const reviveBtn = btn('Revive (50 coins)', () => {
    if ((S.coins || 0) < 50) return;
    S.coins -= 50; persist();
    G.crashed = false; G.revived = true; G.stumble = 0; G.mode = 'play';
    overEl.style.display = 'none';
  });
  const menuBtn = btn('Menu', () => { overEl.style.display = 'none'; showMenu(); });
  overEl.appendChild(reviveBtn); overEl.appendChild(menuBtn);
}

function showMenu() {
  G.mode = 'menu';
  menuEl.style.display = 'flex';
  menuEl.innerHTML = `<h1 style="font-size:40px;margin:0">Frostline Dash</h1>`;
  menuEl.appendChild(btn('Play', () => { menuEl.style.display = 'none'; resetRun(); }));
}

function botControl() {
  if (!Q.autoplay) return;
  let danger = null, minD = 1e9;
  for (const o of obstacles.list) {
    const cz = o.z - o.len / 2;
    const d = G.z - cz;
    if (d < -5) continue;
    if (d < minD) { minD = d; danger = o; }
  }
  if (danger && minD < 14) {
    if (danger.pass === 'jump') jump();
    else if (danger.pass === 'duck') duck();
    else if (danger.pass === 'none' || danger.pass === 'top') {
      if (G.lane === danger.lane) moveLane(danger.lane > 1 ? -1 : 1);
    }
  }
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  if (Q.fixed) dt = 1 / 60;
  dt = Math.min(dt, 1 / 30);
  if (Q.warp > 0) { let w = Q.warp; Q.warp = 0; while (w > 0) { const s = Math.min(w, 0.1); update(s, false); w -= s; } }
  update(dt, true);
}
function update(dt, fx) {
  if (G.mode === 'menu') {
    R.camera.position.set(0, 4.4, 6.4); R.camera.lookAt(0, 0.9, -7);
    renderFrame(dt); return;
  }
  if (G.paused) { renderFrame(0); return; }
  if (G.mode === 'over') { renderFrame(dt); return; }

  if (Q.autoplay) botControl();

  if (G.magnet > 0) G.magnet -= dt;
  if (G.kite > 0) G.kite -= dt;
  if (G.x2 > 0) { G.x2 -= dt; if (G.x2 <= 0) { G.mult = 1; } }
  if (G.boots > 0) G.boots -= dt;
  if (G.duck > 0) G.duck = Math.max(0, G.duck - dt);

  G.time += dt;
  G.speed = SPEED0 + (SPEEDMAX - SPEED0) * (1 - Math.exp(-G.time / SPEED_TAU));

  const targetX = laneX(G.lane);
  G.x += (targetX - G.x) * Math.min(1, dt * 12);
  if (G.kite > 0) {
    G.y = KITE_Y + Math.sin(G.time * 2) * 0.4;
    G.vy = 0; G.air = true;
  } else {
    G.vy -= GRAV * dt;
    G.y += G.vy * dt;
    if (G.y <= 0) { G.y = 0; G.vy = 0; G.air = false; }
  }
  if (!G.crashed) G.z -= G.speed * dt;

  spawnAhead();
  world.update(G.z);
  obstacles.cull(G.z);
  obstacles.update(dt, G.time, { x: G.x, y: G.y, z: G.z }, G.magnet > 0);
  handleCollisions();

  G.score += G.speed * dt * 0.5 * G.mult;
  if (G.kite > 0) G.score += dt * 20;

  const st = { t: G.time, lean: (G.x - targetX) * -0.6, air: G.air, vy: G.vy, duck: G.duck / DUCK_TIME, speed: G.speed, idle: false, kite: G.kite > 0, stumble: G.crashed, crash: G.crashed };
  poseRider(playerRig, st, dt);

  const yetiZ = G.z + (G.crashed ? 1.5 : 3.5);
  yeti.root.position.set(G.x * 0.3 - 2.1, 0, yetiZ);
  poseYeti(yeti, { t: G.time, run: G.crashed ? 1.6 : 1.0 }, dt);

  player.position.set(G.x, G.y, G.z);

  const cam = R.camera;
  const camZ = G.z + 6.4;
  const camY = 4.4 + (G.air ? 0.6 : 0);
  cam.position.x += (G.x * 0.35 - cam.position.x) * Math.min(1, dt * 6);
  cam.position.y += (camY - cam.position.y) * Math.min(1, dt * 6);
  cam.position.z += (camZ - cam.position.z) * Math.min(1, dt * 6);
  cam.lookAt(G.x * 0.5, G.y + 0.9, G.z - 7);
  followShadow(G.x, G.z);

  if (fx) {
    scoreEl.textContent = Math.floor(G.score);
    coinEl.textContent = '🪙 ' + (S.coins + G.coinsRun);
    multEl.textContent = 'x' + G.mult + (G.x2 > 0 ? ' (2X)' : '');
    powerEl.textContent = [G.magnet > 0 ? '🧲' : '', G.kite > 0 ? '🪁' : '', G.shield ? '🛡️' : '', G.boots > 0 ? '👢' : ''].join(' ');
  }
  renderFrame(dt);

  window.__game = { mode: G.mode, score: G.score, z: G.z, lane: G.lane, speed: G.speed };
}

if (Q.scene === 'menu') showMenu();
else if (Q.scene === 'over') { G.mode = 'over'; showMenu(); }
else { showMenu(); }

async function doWarp() {
  if (Q.warp > 0) {
    let w = Q.warp; Q.warp = 0;
    while (w > 0) {
      const s = Math.min(w, 0.25);
      update(s, false);
      w -= s;
      await new Promise(r => setTimeout(r, 0));
    }
  }
  requestAnimationFrame(frame);
}
if (Q.autoplay) { menuEl.style.display = 'none'; resetRun(); }
doWarp().catch(()=>{ requestAnimationFrame(frame); });
if (!Q.autoplay) requestAnimationFrame(frame);
window.__fps = 60;