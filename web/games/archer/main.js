import { setOrientation, onBack, onPauseResume, goHome, params, vibrate as hostVibrate } from '../../shared/platform.js';
import { TAU, clamp, lerp, mulberry, makeCanvas } from './util.js';
import { Fighter, drawArrow } from './rig.js';
import { HEROES, BOWS, TOWER, heroById, bowById } from './data.js';
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
  aim: { active: false, px: 0, py: 0, sx: 0, sy: 0, power: 0, ang: 0 },
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
  const f = new Fighter(heroById(heroId), bowById(bowId), side < 0 ? -1 : 1, { hp, scale: 1.1 });
  f.x = side < 0 ? W * 0.18 : W * 0.82;
  f.y = groundY();
  f.maxHp = hp; f.hp = hp; f.hpShown = hp;
  const Aa = ARENA_LIGHT();
  f.setLight(Aa);
  return f;
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
  G.aim.active = false;
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
  // positions based on distance maybe
  const d = dist || 1000;
  const scale = W / 1200;
  f0.x = W * 0.15; f1.x = W * 0.85;
  f0.y = groundY(); f1.y = groundY();
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
  // compute ideal angle/power to hit target
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y - 40; // aim slightly high
  const dist = Math.abs(dx);
  const dir = dx > 0 ? 1 : -1;
  // power ~ dist/ (something)
  let power = clamp(dist / 900 + 0.35, 0.4, 1.0);
  power *= (shooter.bow.power || 1);
  // angle
  let ang = Math.atan2(-dy, Math.abs(dx)) + (Math.random() - 0.5) * (1 - diff) * 0.6;
  ang = clamp(ang, 0.15, 1.35);
  // wind adjust
  ang -= G.wind * 0.15 * (1 - diff * 0.5);
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
  G.arrow = { x: sx, y: sy, vx, vy, who, ang, power, trail: [], alive: true, slow: 1 };
  A.SFX.release();
  shooter.recoil = 1;
}

// trajectory hint
function trajectoryPoints(sx, sy, ang, power, who) {
  const actualDir = (G.fighters[who].x < G.fighters[1 - who].x) ? 1 : -1;
  const speed = (600 + power * 500) * (G.fighters[who].bow.power || 1);
  const vx = Math.cos(ang) * speed * actualDir;
  const vy = -Math.sin(ang) * speed;
  const pts = [];
  let x = sx, y = sy, vxv = vx, vyv = vy;
  for (let i = 0; i < 18; i++) {
    vxv += G.wind * 60 * actualDir * (1 / 60) * 0; // placeholder
    // use euler
    x += vxv * (1 / 60) * 4; y += vyv * (1 / 60) * 4;
    vyv += GRAV * (1 / 60) * 4;
    vxv += G.wind * 40 * actualDir;
    pts.push({ x, y });
    if (y > groundY() + 50) break;
  }
  return pts;
}

// pointer input
let dragging = false;
canvas.addEventListener('pointerdown', e => {
  if (G.mode !== 'play' || G.paused) return;
  if (G.arrow && G.arrow.alive) return;
  const who = G.turn;
  if (G.modeType !== '2p' && who !== 0) return;
  const f = G.fighters[who];
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left), py = (e.clientY - rect.top);
  // start drag near shooter? allow anywhere left half for p0, right for p1
  dragging = true;
  G.aim.active = true;
  G.aim.sx = f.x; G.aim.sy = f.y - 90;
  G.aim.px = px; G.aim.py = py;
  try { canvas.setPointerCapture(e.pointerId); } catch (ex) {}
  A.SFX.draw();
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  G.aim.px = e.clientX - rect.left;
  G.aim.py = e.clientY - rect.top;
});
canvas.addEventListener('pointerup', e => {
  if (!dragging) return;
  dragging = false;
  const who = G.turn;
  const f = G.fighters[who];
  const dx = G.aim.sx - G.aim.px;
  const dy = G.aim.sy - G.aim.py;
  const power = clamp(Math.hypot(dx, dy) / 180, 0.15, 1);
  const ang = Math.atan2(dy, Math.abs(dx));
  if (power > 0.18 && ang > 0.05) {
    releaseArrow(who, clamp(ang, 0.1, 1.4), power);
    G.aim.active = false;
  } else {
    G.aim.active = false;
  }
});

// rendering
function drawBackground() {
  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, Hh);
  g.addColorStop(0, '#2c2560'); g.addColorStop(0.5, '#b04e7c'); g.addColorStop(1, '#ff8f6b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
  // sun
  const sx = W * 0.68, sy = Hh * 0.35;
  const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
  rg.addColorStop(0, 'rgba(255,241,196,0.9)'); rg.addColorStop(1, 'rgba(255,176,112,0)');
  ctx.fillStyle = rg; ctx.fillRect(sx - 120, sy - 120, 240, 240);
  ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, TAU); ctx.fill();
  // ground
  ctx.fillStyle = '#5e2f5a';
  ctx.fillRect(0, groundY(), W, Hh - groundY());
  const gg = ctx.createLinearGradient(0, groundY(), 0, Hh);
  gg.addColorStop(0, '#b0607a'); gg.addColorStop(1, '#3a1f45');
  ctx.fillStyle = gg; ctx.fillRect(0, groundY() - 20, W, 40);
  // platforms
  for (const f of G.fighters) {
    ctx.fillStyle = '#6a3a6a';
    ctx.fillRect(f.x - 60, f.y, 120, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(f.x - 60, f.y + 12, 120, 6);
  }
}

function draw() {
  drawBackground();
  // fighters
  for (const f of G.fighters) {
    f.draw(ctx);
  }
  // aim trajectory hint
  if (G.aim.active && G.mode === 'play') {
    const f = G.fighters[G.turn];
    const dx = G.aim.sx - G.aim.px;
    const dy = G.aim.sy - G.aim.py;
    const power = clamp(Math.hypot(dx, dy) / 180, 0.15, 1);
    const ang = Math.atan2(dy, Math.abs(dx));
    const pts = trajectoryPoints(G.aim.sx, G.aim.sy, clamp(ang, 0.1, 1.4), power, G.turn);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (pts.length) { ctx.moveTo(G.aim.sx, G.aim.sy); for (const p of pts) ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    ctx.setLineDash([]);
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
  // HP bars updated in DOM
  updateHpBars();
  // wind
  $('windVal').textContent = (G.wind >= 0 ? '+' : '') + G.wind.toFixed(2);
}

// simulation
let last = performance.now();
function sim(dt) {
  G.time += dt;
  for (const f of G.fighters) f.update(dt);
  // arrow physics
  if (G.arrow && G.arrow.alive) {
    const a = G.arrow;
    a.vy += GRAV * dt;
    a.vx += G.wind * 120 * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    // slow-mo near ground/impact
    // check hit
    const target = G.fighters[1 - a.who];
    const part = target.testPoint(a.x, a.y);
    if (part) {
      // hit
      a.alive = false;
      let dmg = 25;
      if (part === 'head') { dmg = 50; G.heads[a.who]++; A.SFX.headshot(); showCallout('HEADSHOT!', a.x, a.y); }
      else { A.SFX.hit(); }
      dmg *= (G.fighters[a.who].bow.dmg || 1);
      target.hp = Math.max(0, target.hp - dmg);
      G.dmgDealt[a.who] += dmg;
      G.hits[a.who]++;
      target.hit(part, a.x < target.x ? -1 : 1, 1);
      target.addStuck && target.addStuck(part, a.x, a.y, Math.atan2(a.vy, a.vx));
      // knockback wobble
      target.leanV += (a.x < target.x ? -1 : 1) * 0.3;
      spawnImpact(a.x, a.y);
      // camera not needed
      endTurnCheck();
    } else if (a.y > groundY() + 40 || a.x < -50 || a.x > W + 50) {
      // miss
      a.alive = false;
      A.SFX.miss();
      spawnImpact(a.x, Math.min(a.y, groundY()), true);
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
  const items = tab === 'heroes' ? HEROES : BOWS;
  const owned = tab === 'heroes' ? store.heroes : store.bows;
  const selected = tab === 'heroes' ? store.hero : store.bow;
  for (const it of items) {
    const card = document.createElement('div'); card.className = 'shopcard';
    const isOwned = owned.includes(it.id);
    const isSel = selected === it.id;
    card.innerHTML = `<div class="nm">${it.name}</div><div style="font-size:11px;color:#9ff3ff">${it.title || it.desc || ''}</div><div class="pr">${isOwned ? (isSel ? 'EQUIPPED' : 'OWNED') : it.price + ' coins'}</div>`;
    const btn = document.createElement('button');
    btn.className = 'bigbtn small ' + (isOwned ? 'blue' : 'yellow');
    btn.textContent = isOwned ? (isSel ? 'SELECTED' : 'EQUIP') : 'BUY';
    btn.addEventListener('click', () => {
      if (isOwned) {
        if (tab === 'heroes') store.hero = it.id; else store.bow = it.id;
      } else {
        if (store.coins >= it.price) {
          store.coins = store.coins - it.price;
          if (tab === 'heroes') { const h = store.heroes; h.push(it.id); store.heroes = h; store.hero = it.id; }
          else { const b = store.bows; b.push(it.id); store.bows = b; store.bow = it.id; }
          A.SFX.coin();
        }
      }
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
