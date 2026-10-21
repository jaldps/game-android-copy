import { setOrientation, onBack, onPauseResume, goHome, params, vibrate as hostVibrate } from '../../shared/platform.js';
import { TAU, clamp, lerp, mulberry, makeCanvas } from './util.js';
import { Fighter, drawArrow } from './rig.js';
import { HEROES, BOWS, TOWER, heroById, bowById, ARROW_TYPES, arrowTypeById, OUTFITS, outfitById } from './data.js';
import { store } from './store.js';
import * as A from './audio.js';

setOrientation('landscape');

const $ = id => document.getElementById(id);
const canvas = $('c');
const ctx = canvas.getContext('2d');
let W = 0, Hh = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; Hh = window.innerHeight;
  canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(Hh * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = Hh + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const Q = {
  autoplay: params.get('autoplay') === '1',
  scene: params.get('scene'),
  seed: parseInt(params.get('seed') || '0', 10) || (Date.now() % 100000),
  fixed: params.get('fixedstep') === '1',
  warp: parseFloat(params.get('warp') || '0') || 0,
};
const rng = mulberry(Q.seed);
A.initAudio();

// game state
const G = {
  mode: 'menu', // menu, play, over, shop
  paused: false,
  time: 0,
  modeType: 'quick', // quick, tower, 2p
  floor: 0,
  turn: 0, // 0 player, 1 enemy/other
  playerSide: 0, // index into fighters
  fighters: [],
  arrow: null,
  aim: { active: false, px: 0, py: 0, sx: 0, sy: 0, power: 0.6, ang: 0.6 },
  wind: 0,
  hp: [100, 100],
  dmgDealt: [0, 0], hits: [0, 0], heads: [0, 0],
  coinsEarned: 0,
  starCount: 0,
  autoRestart: 3,
  paused2: false,
};
window.__game = G;
window.__fps = 0;

// fighters setup
function makeFighter(heroId, bowId, side, hp = 100) {
  const outfit = outfitById(store.outfit);
  const hpBonus = outfit.hpBonus || 0;
  const f = new Fighter(heroById(heroId), bowById(bowId), side < 0 ? -1 : 1, { hp: hp + hpBonus, scale: 1.1, outfit: store.outfit });
  f.x = side < 0 ? W * 0.15 : W * 0.85;
  f.y = surfaceY(f.x);
  f.maxHp = hp + hpBonus; f.hp = hp + hpBonus; f.hpShown = hp + hpBonus;
  f.outfit = store.outfit;
  f.outfitColor = outfit.color || null;
  f.drawSpeed = outfit.drawSpeed || 1;
  const Aa = ARENA_LIGHT();
  f.setLight(Aa);
  return f;
}
// ---------- Terrain system (procedural, destructible) ----------
let terrainH = null; // array indexed by x (px), surface y
function genTerrain() {
  terrainH = new Float32Array(W + 1);
  const base = Hh * (0.74 + Math.random() * 0.06);
  const n = mulberry(Q.seed + (G.floor || 0) * 7 + Math.floor(rng() * 9999));
  // base rolling ground with more harmonics
  for (let x = 0; x <= W; x++) {
    const t = x / W;
    let h = base + Math.sin(t * Math.PI * 2.3) * 22 + Math.sin(t * Math.PI * 5.7 + 1.2) * 11 + Math.sin(t * Math.PI * 9.1 + 0.7) * 6;
    terrainH[x] = h;
  }
  // random mountains/hills/valleys
  const features = 5 + Math.floor(n() * 6);
  for (let m = 0; m < features; m++) {
    const cx = W * (0.15 + n() * 0.7);
    const mw = 50 + n() * 110;
    const mh = (n() * 2 - 0.3) * 120; // can be negative (valley)
    for (let x = 0; x <= W; x++) {
      const d = Math.abs(x - cx);
      if (d < mw) {
        const k = 1 - d / mw;
        const bump = mh * (k * k * (3 - 2 * k));
        terrainH[x] -= bump; // raise if positive
      }
    }
  }
  // plateaus
  const plats = Math.floor(n() * 3);
  for (let p = 0; p < plats; p++) {
    const cx = W * (0.2 + n() * 0.6);
    const pw = 80 + n() * 120;
    const py = base - 20 - n() * 60;
    for (let x = Math.max(0, cx - pw); x <= Math.min(W, cx + pw); x++) {
      terrainH[x] = Math.min(terrainH[x], py);
    }
  }
  // flatten platforms under fighters (will be set after positions? approximate)
  const flats = [W * 0.15, W * 0.85];
  for (const fx of flats) {
    for (let x = fx - 80; x <= fx + 80; x++) {
      if (x < 0 || x > W) continue;
      terrainH[x] = Math.max(terrainH[x], base - 4);
    }
  }
  // smooth
  for (let pass = 0; pass < 3; pass++) {
    for (let x = 1; x < W; x++) {
      terrainH[x] = (terrainH[x - 1] + terrainH[x] + terrainH[x + 1]) / 3;
    }
  }
  // clamp
  for (let x = 0; x <= W; x++) {
    terrainH[x] = clamp(terrainH[x], Hh * 0.4, Hh * 0.88);
  }
}
function surfaceY(x) {
  if (!terrainH) return groundY();
  const xi = clamp(Math.round(x), 0, W);
  return terrainH[xi];
}
function terrainHit(x, y) {
  return y >= surfaceY(x);
}
function carveCrater(cx, cy, r) {
  if (!terrainH) return;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W, Math.ceil(cx + r));
  for (let x = x0; x <= x1; x++) {
    const d = Math.abs(x - cx);
    if (d <= r) {
      const depth = Math.sqrt(r * r - d * d);
      // lower surface (raise y) by depth*0.8
      terrainH[x] = Math.min(Hh * 0.92, terrainH[x] + depth * 0.75);
    }
  }
  // smooth
  for (let pass = 0; pass < 1; pass++) {
    for (let x = x0 + 1; x < x1; x++) terrainH[x] = (terrainH[x - 1] + terrainH[x] + terrainH[x + 1]) / 3;
  }
}
function groundY() { return Hh * 0.78; }
function ARENA_LIGHT() { return { L: { x: 0.5, y: -0.8 }, amb: '#ffd9c0', ambAmt: 0.22, shadow: '#5b2a6e', shadowAmt: 0.42, rim: '#ffc27a', rimAmt: 0.75, outline: '#2a1430' }; }

// layout constants
const GRAV = 900; // px/s^2 downward

function startTurn(who) {
  G.turn = who;
  const f = G.fighters[who];
  f.setMode('aim');
  f.drawAmt = 0;
  G.aim.active = (who === 0 || G.modeType === '2p');
  const ac = document.getElementById('aimControls');
  if (ac) {
    if (G.aim.active) ac.classList.remove('hidden'); else ac.classList.add('hidden');
  }
  // sync sliders to current aim
  const angSl = document.getElementById('angSlider');
  const powSl = document.getElementById('powSlider');
  if (angSl) { angSl.value = Math.round((G.aim.ang || 0.6) * 57.2958); }
  if (powSl) { powSl.value = Math.round((G.aim.power || 0.6) * 100); }
  $('turn').classList.remove('hidden');
  $('turn').textContent = who === 0 ? 'YOUR TURN' : (G.modeType === '2p' ? 'PLAYER 2' : 'ENEMY TURN');
  if (who !== 0 && G.modeType !== '2p') {
    setTimeout(() => aiShoot(who), 900);
  }
}
function startMatch(type, foeHero, foeBow, dist) {
  G.modeType = type;
  G.dmgDealt = [0, 0]; G.hits = [0, 0]; G.heads = [0, 0]; G.coinsEarned = 0;
  const pH = store.hero, pB = store.bow;
  const f0 = makeFighter(pH, pB, -1, 100);
  const f1 = makeFighter(foeHero || 'gobbo', foeBow || 'twig', 1, 100);
  G.fighters = [f0, f1];
  G.hp = [100, 100];
  f0.hp = 100; f1.hp = 100; f0.hpShown = 100; f1.hpShown = 100;
  G.turn = 0; // player first
  G.wind = (rng() * 2 - 1) * (type === 'tower' ? 0.6 : 0.4);
  G.arrow = null;
  G.aim.active = false;
  genTerrain();
  // positions based on distance
  const d = dist || 1000;
  const scale = W / 1200;
  const gap = clamp(d * scale * 0.5, W * 0.28, W * 0.42);
  f0.x = W * 0.5 - gap; f1.x = W * 0.5 + gap;
  f0.y = surfaceY(f0.x); f1.y = surfaceY(f1.x);
  // varying heights: possibly one higher
  if (Math.random() < 0.4) { f1.y = surfaceY(f1.x) - 30; }
  G.mode = 'play';
  $('hud').classList.remove('hidden');
  $('menu').classList.add('hidden');
  $('over').classList.add('hidden');
  updateHudNames();
  updateHpBars();
  if (Q.autoplay) {
    f0.ai = 0.9; f1.ai = 0.9;
  }
  // AI for enemy always
  G.enemyDiff = type === 'tower' ? (TOWER[G.floor]?.diff || 0.5) : (DIFFS? 0.5 : 0.5);
  const diff = store.diff; // 0 easy 1 normal 2 hard
  const diffVals = [0.25, 0.55, 0.85];
  G.enemyDiff = diffVals[diff];
  if (type === 'tower') G.enemyDiff = Math.max(G.enemyDiff, TOWER[G.floor]?.diff || 0.4);
  startTurn(0);
  if (Q.autoplay) A.startMusic();
}

const DIFFS = [{ name: 'Easy', v: 0.2 }, { name: 'Normal', v: 0.5 }, { name: 'Hard', v: 0.85 }];

function updateHudNames() {
  $('nameL').textContent = G.fighters[0].def.name;
  $('nameR').textContent = G.fighters[1].def.name;
}
function updateHpBars() {
  const f0 = G.fighters[0], f1 = G.fighters[1];
  $('hpL').style.width = (f0.hpShown / f0.maxHp * 100) + '%';
  $('hpR').style.width = (f1.hpShown / f1.maxHp * 100) + '%';
}

function aiShoot(who) {
  if (G.mode !== 'play') return;
  const shooter = G.fighters[who], target = G.fighters[1 - who];
  const diff = G.enemyDiff;
  const dx = target.x - shooter.x;
  const dy = target.y - 90 - (shooter.y - 90);
  const dist = Math.abs(dx);
  const dir = dx > 0 ? 1 : -1;
  // solve projectile: try several angles, pick one that lands closest
  let best = null;
  const bowPower = shooter.bow.power || 1;
  for (let ai = 0; ai < 12; ai++) {
    const ang = 0.25 + (ai / 11) * 1.05;
    const power = clamp(dist / 850 + 0.3, 0.35, 1.0);
    const speed = (600 + power * 500) * bowPower;
    const vx = Math.cos(ang) * speed * dir;
    const vy = -Math.sin(ang) * speed;
    // simulate
    let x = shooter.x + dir * 40, y = shooter.y - 90, vxv = vx, vyv = vy;
    let t = 0;
    for (let i = 0; i < 300; i++) {
      const dt = 1 / 120;
      vyv += GRAV * dt; vxv += G.wind * 120 * dt;
      x += vxv * dt; y += vyv * dt; t += dt;
      if (y >= surfaceY(x) || x < -50 || x > W + 50) break;
    }
    const err = Math.hypot(x - target.x, y - (target.y - 90));
    if (!best || err < best.err) best = { ang, power, err };
  }
  let ang = best.ang;
  let power = best.power;
  // add inaccuracy based on difficulty
  ang += (Math.random() - 0.5) * (1 - diff) * 0.25;
  ang = clamp(ang, 0.15, 1.35);
  power = clamp(power + (Math.random() - 0.5) * (1 - diff) * 0.15, 0.3, 1.0);
  // wind adjust already in sim; small correction
  ang -= G.wind * 0.1 * (1 - diff * 0.5);
  shooter.aim = ang;
  shooter.drawAmt = power;
  for (let i = 0; i < 20; i++) shooter.update(1 / 60);
  setTimeout(() => releaseArrow(who, ang, power), 400);
}

function releaseArrow(who, ang, power) {
  if (G.mode !== 'play') return;
  const shooter = G.fighters[who];
  shooter.setMode('idle');
  const dir = who === 0 ? 1 : -1; // player shoots right, enemy shoots left
  const actualDir = (shooter.x < G.fighters[1 - who].x) ? 1 : -1;
  const bow = shooter.bow;
  const speed = (600 + power * 500) * (bow.power || 1);
  const vx = Math.cos(ang) * speed * actualDir;
  const vy = -Math.sin(ang) * speed;
  const sx = shooter.x + actualDir * 40;
  const sy = shooter.y - 90;
  G.arrow = { x: sx, y: sy, vx, vy, who, ang, power, trail: [], alive: true, slow: 1, type: (store.arrowType || 'standard'), t: 0, bounces: 0 };
  A.SFX.release();
  shooter.recoil = 1;
}

// trajectory hint — MUST use identical physics to sim() so preview matches flight.
function trajectoryPoints(sx, sy, ang, power, who) {
  const shooter = G.fighters[who];
  const target = G.fighters[1 - who];
  const actualDir = (shooter.x < target.x) ? 1 : -1;
  const bow = shooter.bow;
  const speed = (600 + power * 500) * (bow.power || 1);
  const vx0 = Math.cos(ang) * speed * actualDir;
  const vy0 = -Math.sin(ang) * speed;
  const pts = [];
  let x = sx, y = sy, vx = vx0, vy = vy0;
  const dt = 1 / 120;
  const maxSteps = 240;
  for (let i = 0; i < maxSteps; i++) {
    vy += GRAV * dt;
    vx += G.wind * 120 * dt;
    x += vx * dt;
    y += vy * dt;
    pts.push({ x, y });
    if (y > groundY() + 60 || x < -80 || x > W + 80) break;
    // stop when hitting terrain
    if (terrainHit(x, y)) break;
  }
  // downsample for drawing
  const out = [];
  for (let i = 0; i < pts.length; i += 4) out.push(pts[i]);
  if (out.length === 0 && pts.length) out.push(pts[pts.length - 1]);
  return out;
}

// pointer input replaced by angle/power controls
const angSlider = document.getElementById('angSlider');
const powSlider = document.getElementById('powSlider');
const btnFire = document.getElementById('btnFire');
function syncAimFromControls() {
  if (!angSlider || !powSlider) return;
  G.aim.ang = clamp(parseInt(angSlider.value, 10) / 57.2958, 0.1, 1.4);
  G.aim.power = clamp(parseInt(powSlider.value, 10) / 100, 0.1, 1);
  const f = G.fighters[G.turn];
  if (f) { f.aim = G.aim.ang; f.drawAmt = G.aim.power; }
}
if (angSlider) angSlider.addEventListener('input', syncAimFromControls);
if (powSlider) powSlider.addEventListener('input', syncAimFromControls);
if (btnFire) btnFire.addEventListener('click', () => {
  if (G.mode !== 'play' || G.paused) return;
  if (G.arrow && G.arrow.alive) return;
  const who = G.turn;
  if (G.modeType !== '2p' && who !== 0) return;
  syncAimFromControls();
  const f = G.fighters[who];
  f.setMode('idle');
  releaseArrow(who, G.aim.ang, G.aim.power);
  G.aim.active = false;
  const ac = document.getElementById('aimControls'); if (ac) ac.classList.add('hidden');
});

// rendering
function drawBackground() {
  const gy = groundY();
  // Warm dusk sky with a broad atmospheric light falloff.
  const sky = ctx.createLinearGradient(0, 0, 0, gy + 35);
  sky.addColorStop(0, '#332653'); sky.addColorStop(0.52, '#a34f78'); sky.addColorStop(1, '#f28b70');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, Hh);
  const sx = W * 0.68, sy = Hh * 0.35;
  const rg = ctx.createRadialGradient(sx, sy, 8, sx, sy, Math.min(W * 0.34, 190));
  rg.addColorStop(0, 'rgba(255,235,178,0.38)'); rg.addColorStop(1, 'rgba(255,176,112,0)');
  ctx.fillStyle = rg; ctx.fillRect(sx - 190, sy - 190, 380, 380);
  ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, TAU); ctx.fill();

  // Distant mesas: soft silhouettes give the firing lane a clear horizon.
  const ridge = (color, base, amp, phase, step) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + step; x += step) {
      const y = base - Math.sin(x * 0.012 + phase) * amp * 0.45 - Math.sin(x * 0.027 + phase * 1.7) * amp * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  };
  ridge('rgba(91,55,104,0.42)', gy - 48, 72, 0.6, 10);
  ridge('rgba(92,48,83,0.55)', gy - 23, 48, 2.2, 8);

  // Far watchtowers and broken ramparts, kept low-contrast behind the combat lane.
  const tower = (x, base, scale, tint) => {
    ctx.fillStyle = tint;
    ctx.fillRect(x - 13 * scale, base - 58 * scale, 26 * scale, 58 * scale);
    ctx.fillRect(x - 19 * scale, base - 63 * scale, 38 * scale, 9 * scale);
    ctx.beginPath(); ctx.moveTo(x - 14 * scale, base - 63 * scale); ctx.lineTo(x, base - 82 * scale); ctx.lineTo(x + 14 * scale, base - 63 * scale); ctx.fill();
    ctx.fillStyle = 'rgba(255,208,157,0.42)';
    ctx.fillRect(x - 3 * scale, base - 43 * scale, 6 * scale, 12 * scale);
    ctx.fillRect(x - 3 * scale, base - 22 * scale, 6 * scale, 11 * scale);
  };
  const horizon = gy - 12;
  tower(W * 0.27, horizon + 6, 0.72, 'rgba(75,43,78,0.66)');
  tower(W * 0.73, horizon + 10, 0.88, 'rgba(69,39,76,0.72)');
  // Broken wall segments form a recognizable old-range landmark without cluttering the aim arc.
  ctx.fillStyle = 'rgba(83,45,78,0.7)';
  ctx.fillRect(W * 0.37, horizon - 26, W * 0.12, 27);
  ctx.fillRect(W * 0.39, horizon - 34, W * 0.035, 10);
  ctx.fillRect(W * 0.445, horizon - 39, W * 0.035, 15);
  ctx.fillRect(W * 0.48, horizon - 31, W * 0.035, 8);
  // Narrow arch openings read as stonework at phone scale.
  ctx.fillStyle = 'rgba(45,30,64,0.55)';
  for (const x of [W * 0.4, W * 0.455]) {
    ctx.beginPath(); ctx.arc(x, horizon - 1, 5, Math.PI, 0); ctx.lineTo(x + 5, horizon + 1); ctx.lineTo(x - 5, horizon + 1); ctx.fill();
  }

  // Broad, stratified arena floor: readable value bands and restrained ground texture.
  const floor = ctx.createLinearGradient(0, gy - 8, 0, Hh);
  floor.addColorStop(0, '#a95875'); floor.addColorStop(0.18, '#854766'); floor.addColorStop(1, '#452d52');
  ctx.fillStyle = floor; ctx.fillRect(0, gy, W, Hh - gy);
  ctx.fillStyle = 'rgba(255,203,151,0.24)';
  ctx.beginPath(); ctx.moveTo(0, gy + 4);
  for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, gy + 4 + Math.sin(x * 0.018) * 3 + Math.sin(x * 0.043) * 1.5);
  ctx.lineTo(W, gy + 13); ctx.lineTo(0, gy + 13); ctx.closePath(); ctx.fill();
  // Softly receding cross-lane and scattered stones add scale, not visual noise.
  ctx.strokeStyle = 'rgba(255,202,164,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = gy + 25 + i * 18;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W * 0.5, y - 6, W, y + 2); ctx.stroke();
  }
  for (let i = 0; i < Math.max(8, Math.floor(W / 36)); i++) {
    const x = (i * 83 + 31) % W, y = gy + 22 + (i * 29) % Math.max(22, Hh - gy - 26);
    ctx.fillStyle = i % 2 ? 'rgba(43,29,55,0.32)' : 'rgba(244,173,132,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y, 4 + (i % 3) * 2, 1.5 + (i % 2), -0.12, 0, TAU); ctx.fill();
  }
  // Small edge scrub and broken stakes frame the field, leaving the fighters unobscured.
  for (const x of [W * 0.045, W * 0.95]) {
    ctx.strokeStyle = 'rgba(42,35,58,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, gy + 5); ctx.lineTo(x - 2, gy - 22); ctx.moveTo(x + 8, gy + 6); ctx.lineTo(x + 12, gy - 14); ctx.stroke();
    ctx.fillStyle = 'rgba(67,105,68,0.78)';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + k * 7, gy - 10 - (k === 0 ? 5 : 0), 7, 4, k * 0.3, 0, TAU); ctx.fill(); }
  }
  // Terrain profile (procedural mountains)
  if (terrainH) {
    ctx.fillStyle = '#5a3a5a';
    ctx.beginPath();
    ctx.moveTo(0, Hh);
    for (let x = 0; x <= W; x++) ctx.lineTo(x, terrainH[x]);
    ctx.lineTo(W, Hh);
    ctx.closePath();
    ctx.fill();
    // highlight ridge
    ctx.strokeStyle = 'rgba(255,200,160,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) { if (x===0) ctx.moveTo(x, terrainH[x]); else ctx.lineTo(x, terrainH[x]); }
    ctx.stroke();
  }
  // Platforms remain the nearest, high-contrast footing under each archer.
  for (const f of G.fighters) {
    ctx.fillStyle = 'rgba(39,24,49,0.42)'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 8, 68, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#754268'; ctx.fillRect(f.x - 60, f.y, 120, 12);
    ctx.fillStyle = 'rgba(37,25,47,0.72)'; ctx.fillRect(f.x - 60, f.y + 12, 120, 6);
    ctx.fillStyle = 'rgba(255,199,157,0.38)'; ctx.fillRect(f.x - 58, f.y, 116, 2);
  }
}

function draw() {
  drawBackground();
  // fighters
  for (const f of G.fighters) {
    f.draw(ctx);
  }
// aim indicator (short)
  if (G.aim.active && G.mode === 'play') {
    const f = G.fighters[G.turn];
    const sx = f.x, sy = f.y - 90;
    const dir = (f.x < G.fighters[1 - G.turn].x) ? 1 : -1;
    const ang = G.aim.ang || 0.6;
    const len = 50;
    const ex = sx + Math.cos(ang) * len * dir;
    const ey = sy - Math.sin(ang) * len;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,224,122,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#fff0b2'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // arrow
  if (G.arrow && G.arrow.alive) {
    const a = G.arrow;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(a.vy, a.vx));
    drawArrow(ctx, 28, { x: 0, y: 0 }, { x: 1, y: 0 }, 1);
    ctx.restore();
    // trail
    a.trail.push({ x: a.x, y: a.y });
    if (a.trail.length > 12) a.trail.shift();
    ctx.strokeStyle = 'rgba(255,220,120,0.5)';
    ctx.beginPath();
    a.trail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
  }
  // extra arrows (multi)
  if (G.extraArrows) {
    for (const a of G.extraArrows) {
      if (!a.alive) continue;
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(a.vy, a.vx));
      // draw simple arrow
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-20,0); ctx.stroke();
      ctx.restore();
    }
  }
  // HP bars updated in DOM
  updateHpBars();
  // wind
  $('windVal').textContent = (G.wind >= 0 ? '+' : '') + G.wind.toFixed(2);
}

function applyHit(arrow, part) {
  arrow.alive = false;
  const shooter = G.fighters[arrow.who];
  const target = G.fighters[1 - arrow.who];
  let dmg = (part === 'head') ? 50 : 25;
  if (part === 'head') { G.heads[arrow.who]++; A.SFX.headshot(); showCallout('HEADSHOT!', arrow.x, arrow.y); }
  else { A.SFX.hit(); }
  dmg *= (shooter.bow.dmg || 1);
  // outfit perk armor
  const armor = (outfitById(store.outfit).perk === 'armor') ? 0.7 : 1.0;
  dmg = Math.round(dmg * armor);
  target.hp = Math.max(0, target.hp - dmg);
    G.dmgDealt[arrow.who] += dmg;
    G.hits[arrow.who]++;
    target.hit(part, arrow.x < target.x ? -1 : 1, 1);
    // knockback: push target backward
    const kbDir = arrow.x < target.x ? 1 : -1;
    target.knockV = (target.knockV || 0) + kbDir * (part === 'head' ? 420 : 260);
    target.leanV += (arrow.x < target.x ? -1 : 1) * 0.3;
target.addStuck && target.addStuck(part, arrow.x, arrow.y, Math.atan2(arrow.vy, arrow.vx));
  spawnImpact(arrow.x, arrow.y);
  endTurnCheck();
}
// simulation
let last = performance.now();
function sim(dt) {
  G.time += dt;
  for (const f of G.fighters) {
    f.update(dt);
    // settle onto terrain after knockback / impacts
    if (f.mode !== 'dead') {
      const targetY = surfaceY(f.x);
      f.y = lerp(f.y, targetY, 1 - Math.exp(-10 * dt));
      f.x = clamp(f.x, 40, W - 40);
    }
  }
  // arrow physics
  if (G.arrow && G.arrow.alive) {
    const a = G.arrow;
    a.vy += GRAV * dt;
    a.vx += G.wind * 120 * dt;
    // bounce arrow: reflect off terrain
    if (a.type === 'bounce') {
      const sy = surfaceY(a.x);
      if (a.y >= sy && a.vy > 0) {
        a.y = sy - 1;
        a.vy = -a.vy * 0.7;
        a.vx *= 0.85;
        a.bounces = (a.bounces || 0) + 1;
        if (a.bounces > 3) { a.alive = false; A.SFX.miss(); spawnImpact(a.x, a.y, true); endTurnCheck(); return; }
      }
    }
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    // multi arrow split
    if (a.type === 'multi' && !a.split && a.t > 0.25) {
      a.split = true;
      // spawn two extra arrows
      for (let k = -1; k <= 1; k += 2) {
        const sp = { x: a.x, y: a.y, vx: a.vx + k * 120, vy: a.vy + k * 40, who: a.who, ang: a.ang, power: a.power, trail: [], alive: true, type: 'standard', split: true };
        G.extraArrows = G.extraArrows || [];
        G.extraArrows.push(sp);
      }
    }
    // process extra arrows
    if (G.extraArrows) {
      for (const ea of G.extraArrows) {
        if (!ea.alive) continue;
        ea.vy += GRAV * dt; ea.vx += G.wind * 120 * dt; ea.x += ea.vx * dt; ea.y += ea.vy * dt;
        const t = G.fighters[1 - ea.who];
        const part = t.testPoint(ea.x, ea.y);
        if (part) { ea.alive = false; applyHit(ea, part); }
        else if (ea.y >= surfaceY(ea.x) || ea.x < -50 || ea.x > W + 50) { ea.alive = false; carveCrater(ea.x, Math.min(ea.y, surfaceY(ea.x)), 18); A.SFX.miss(); }
      }
      G.extraArrows = G.extraArrows.filter(e => e.alive);
    }
    // check hit
    const target = G.fighters[1 - a.who];
    const part = target.testPoint(a.x, a.y);
    if (part) {
      a.alive = false;
      applyHit(a, part);
    } else if (a.y >= surfaceY(a.x) || a.x < -50 || a.x > W + 50) {
      // miss / terrain
      a.alive = false;
      A.SFX.miss();
      const cr = a.type === 'explosive' ? 46 : 22;
      carveCrater(a.x, Math.min(a.y, surfaceY(a.x)), cr);
      spawnImpact(a.x, Math.min(a.y, surfaceY(a.x)), true);
      // explosive AoE damage
      if (a.type === 'explosive') {
        const t = G.fighters[1 - a.who];
        const dist2 = Math.hypot(t.x - a.x, (t.y - 90) - a.y);
        if (dist2 < 120) {
          const dmg = Math.round((25 * (G.fighters[a.who].bow.dmg || 1)) * (1 - dist2 / 120));
          t.hp = Math.max(0, t.hp - dmg);
          G.dmgDealt[a.who] += dmg;
          t.hit('torso', a.x < t.x ? -1 : 1, 1);
          spawnImpact(t.x, t.y - 90);
        }
      }
      endTurnCheck();
    }
  }
}

function endTurnCheck() {
  const f0 = G.fighters[0], f1 = G.fighters[1];
  if (f0.hp <= 0 || f1.hp <= 0) {
    endMatch(f0.hp <= 0 ? 1 : 0);
    return;
  }
  const next = 1 - G.turn;
  setTimeout(() => startTurn(next), 700);
}

function endMatch(winner) {
  G.mode = 'over';
  $('hud').classList.add('hidden');
  $('over').classList.remove('hidden');
  const playerWon = winner === 0;
  $('overTitle').textContent = playerWon ? 'VICTORY' : 'DEFEAT';
  $('overTitle').style.color = playerWon ? '#7be36b' : '#ff6a6a';
  // stars
  const stars = playerWon ? (G.heads[0] >= 2 ? 3 : G.hits[0] >= 3 ? 2 : 1) : 0;
  G.starCount = stars;
  const sEl = $('stars'); sEl.innerHTML = '';
  for (let i = 0; i < 3; i++) { const sp = document.createElement('span'); sp.textContent = i < stars ? '★' : '☆'; sEl.appendChild(sp); }
  $('rsDmg').textContent = Math.round(G.dmgDealt[0]);
  $('rsHits').textContent = G.hits[0];
  $('rsHead').textContent = G.heads[0];
  const coins = playerWon ? (50 + stars * 25 + G.heads[0] * 10) : 10;
  G.coinsEarned = coins;
  store.coins = store.coins + coins;
  $('rsCoins').textContent = coins;
  if (playerWon) A.SFX.win(); else A.SFX.lose();
  // tower progression
  if (G.modeType === 'tower' && playerWon) {
    store.floor = Math.max(store.floor, G.floor + 1);
    store.best = Math.max(store.best, store.floor);
    const starsObj = store.stars; starsObj[G.floor] = Math.max(starsObj[G.floor] || 0, stars); store.stars = starsObj;
    $('towerInfo').classList.remove('hidden');
    $('towerInfo').textContent = `Floor ${G.floor + 1} cleared!`;
    if (G.floor >= TOWER.length - 1) $('towerInfo').textContent = 'Tower conquered!';
  } else {
    $('towerInfo').classList.add('hidden');
  }
  if (Q.autoplay) {
    G.autoRestart = 3;
  }
}

// callout
function showCallout(text, x, y) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `position:fixed;left:${x}px;top:${y}px;transform:translate(-50%,-50%);font-family:'Lilita One';font-size:28px;color:#ffe27a;text-shadow:0 3px 0 #000;pointer-events:none;z-index:5;`;
  document.body.appendChild(el);
  let t = 0;
  const iv = setInterval(() => { t += 0.016; el.style.top = (y - t * 60) + 'px'; el.style.opacity = 1 - t * 2; if (t > 0.6) { clearInterval(iv); el.remove(); } }, 16);
}
function spawnImpact(x, y, miss = false) {
  // simple: draw dust via temporary? We'll skip persistent; draw in next frames maybe. Use callout small.
}

// menu actions
function showMenu() {
  G.mode = 'menu';
  $('hud').classList.add('hidden');
    $('menu').classList.remove('hidden');
    const ac = document.getElementById('aimControls'); if (ac) ac.classList.add('hidden');
  $('over').classList.add('hidden');
  $('shop').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('coins').textContent = store.coins;
  A.startMusic();
}
function openShop() {
  G.mode = 'shop';
  $('menu').classList.add('hidden');
  $('shop').classList.remove('hidden');
  $('coins2').textContent = store.coins;
  renderShop('heroes');
}
function renderShop(tab) {
  const list = $('shopList'); list.innerHTML = '';
  let items, owned, selected, isListOwned;
  if (tab === 'heroes') { items = HEROES; owned = store.heroes; selected = store.hero; isListOwned = true; }
  else if (tab === 'bows') { items = BOWS; owned = store.bows; selected = store.bow; isListOwned = true; }
  else if (tab === 'arrows') { items = ARROW_TYPES; owned = [store.arrowType]; selected = store.arrowType; isListOwned = false; }
  else if (tab === 'outfits') { items = OUTFITS; owned = store.outfits; selected = store.outfit; isListOwned = true; }
  for (const it of items) {
    const card = document.createElement('div'); card.className = 'shopcard';
    const isOwned = isListOwned ? owned.includes(it.id) : true;
    const isSel = selected === it.id;
    const genderTxt = it.gender ? ` (${it.gender})` : '';
    card.innerHTML = `<div class="nm">${it.name}${genderTxt}</div><div style="font-size:11px;color:#9ff3ff">${it.title || it.desc || ''}</div><div class="pr">${isSel ? 'EQUIPPED' : (isListOwned ? (isOwned ? 'OWNED' : it.price + ' coins') : it.price + ' coins')}</div>`;
    const btn = document.createElement('button');
    btn.className = 'bigbtn small ' + (isSel ? 'blue' : 'yellow');
    btn.textContent = isSel ? 'SELECTED' : (isListOwned && !isOwned ? 'BUY' : 'EQUIP');
    btn.addEventListener('click', () => {
      if (isListOwned && !owned.includes(it.id)) {
        if (store.coins >= it.price) {
          store.coins = store.coins - it.price;
          if (tab === 'heroes') { const h = store.heroes; h.push(it.id); store.heroes = h; }
          else if (tab === 'bows') { const b = store.bows; b.push(it.id); store.bows = b; }
          else if (tab === 'outfits') { const o = store.outfits; if (!o.includes(it.id)) o.push(it.id); store.outfits = o; }
          A.SFX.coin();
        } else { renderShop(tab); return; }
      }
      if (tab === 'heroes') store.hero = it.id;
      else if (tab === 'bows') store.bow = it.id;
      else if (tab === 'arrows') store.arrowType = it.id;
      else if (tab === 'outfits') store.outfit = it.id;
      $('coins2').textContent = store.coins;
      $('coins').textContent = store.coins;
      renderShop(tab);
    });
    card.appendChild(btn);
    list.appendChild(card);
  }
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  renderShop(t.dataset.tab);
}));

// event wiring
$('btnQuick').addEventListener('click', () => { A.resumeAudio(); startMatch('quick'); });
$('btnTower').addEventListener('click', () => { A.resumeAudio(); const f = TOWER[store.floor] || TOWER[0]; startMatch('tower', f.foe, 'twig', f.dist); G.floor = store.floor; });
$('btn2P').addEventListener('click', () => { A.resumeAudio(); startMatch('2p', 'brun', 'twig'); });
$('btnShop').addEventListener('click', openShop);
$('btnShopBack').addEventListener('click', showMenu);
$('btnSettings').addEventListener('click', () => { /* placeholder */ });
$('btnHome').addEventListener('click', goHome);
$('btnPause').addEventListener('click', openPause);
function openPause() {
  if (G.mode !== 'play') return;
  G.paused = true;
  $('pause').classList.remove('hidden');
  A.pauseAudio();
}
$('btnResume').addEventListener('click', () => { G.paused = false; $('pause').classList.add('hidden'); A.resumeAudio(); });
$('btnSound').addEventListener('click', () => { store.muted = !store.muted; A.setMuted(store.muted); $('btnSound').textContent = 'SOUND: ' + (store.muted ? 'OFF' : 'ON'); });
$('btnMusic').addEventListener('click', () => { store.music = !store.music; A.setMusic(store.music); $('btnMusic').textContent = 'MUSIC: ' + (store.music ? 'ON' : 'OFF'); });
$('btnQuality').addEventListener('click', () => { store.quality = store.quality === 'high' ? 'low' : 'high'; $('btnQuality').textContent = 'QUALITY: ' + store.quality.toUpperCase(); });
$('btnQuit').addEventListener('click', () => { G.paused = false; $('pause').classList.add('hidden'); showMenu(); });
$('btnMenu2').addEventListener('click', showMenu);
$('btnAgain').addEventListener('click', () => {
  if (G.modeType === 'tower') {
    const f = TOWER[store.floor] || TOWER[0];
    startMatch('tower', f.foe, 'twig', f.dist);
  } else if (G.modeType === '2p') {
    startMatch('2p', 'brun', 'twig');
  } else {
    startMatch('quick');
  }
});

onBack(() => {
  if (!$('pause').classList.contains('hidden')) { $('btnResume').click(); return true; }
  if (!$('shop').classList.contains('hidden')) { showMenu(); return true; }
  if (G.mode === 'play') { openPause(); return true; }
  if (G.mode === 'over') { showMenu(); return true; }
  return false;
});
onPauseResume(() => { if (G.mode === 'play' && !G.paused) openPause(); A.pauseAudio(); }, () => { A.resumeAudio(); });

// boot
async function boot() {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  A.setMuted(store.muted); A.setMusic(store.music);
  $('btnSound').textContent = 'SOUND: ' + (store.muted ? 'OFF' : 'ON');
  $('btnMusic').textContent = 'MUSIC: ' + (store.music ? 'ON' : 'OFF');
  $('btnQuality').textContent = 'QUALITY: ' + store.quality.toUpperCase();
  $('coins').textContent = store.coins;
  if (Q.scene === 'play' || Q.autoplay) {
    startMatch('quick');
  } else if (Q.scene === 'over') {
    startMatch('quick'); G.fighters[1].hp = 0; endMatch(0);
  } else {
    showMenu();
  }
  if (Q.warp > 0) { const st = 1 / 30; for (let t = 0; t < Q.warp; t += st) sim(st); }
  if (G.fighters.length) { /* camera none */ }
  last = performance.now();
  requestAnimationFrame(frame);
  if (Q.autoplay) { A.startMusic(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.max(0, (now - last) / 1000); last = now;
  const dt = Q.fixed ? 1 / 60 : Math.min(raw, 1 / 30);
  window.__fps = raw > 0 ? Math.round(1 / raw) : window.__fps;
  if (!G.paused && G.mode === 'play') sim(dt);
  else for (const f of G.fighters) if (f) f.update(dt);
  draw();
  if (G.mode === 'over' && Q.autoplay) { G.autoRestart -= dt; if (G.autoRestart <= 0) { G.autoRestart = 3; startMatch('quick'); } }
}
// remove double update: actually sim already updates fighters; but if not play, still animate idle
// We'll update fighters in draw loop when not sim
boot();
