import { setOrientation, vibrate as hostVibrate, goHome, onBack, onPauseResume, params } from '../../shared/platform.js';
import * as THREE from 'three';
import { BIOMES, COURSES, KITS, PAINTS, RIVALS, TUNE, POS_NAMES } from './config.js';
import { mulberry, clamp, lerp, damp } from './rng.js';
import { buildTrack, frameAt, trackY, lerpArr } from './track.js';
import { initTerrain, heightAt, makeTerrainMaterial, makeTrailMaterial, buildTerrain, buildTrail, clearOccluders } from './terrain.js';
import { foliageSet } from './foliage.js';
import { planScenery, buildScenery } from './scenery.js';
import { initRender, applyBiome, updateAtmosphere, updateSun, renderFrame, resize, R } from './render.js';
import { Racer } from './racer.js';
import { store, save } from './store.js';

setOrientation('portrait');

const Q = {
  autoplay: params.get('autoplay') === '1',
  scene: params.get('scene'),
  fixed: params.get('fixedstep') === '1',
  warp: parseFloat(params.get('warp') || '0') || 0,
  seed: params.has('seed') ? (parseInt(params.get('seed'), 10) || 0) : null,
};

const canvas = document.getElementById('cv');
const quality = store.quality || 'high';
const RR = initRender(canvas, quality);

const world = new THREE.Group();
RR.scene.add(world);

let T = null, course = COURSES[0], bio = BIOMES[course.biome];
let racers = [], player = null, race = null, camTarget = new THREE.Vector3();
let steerInput = 0, brakeInput = false, jumpBuf = 0, boostBuf = false;
let paused = false, mode = 'menu', timeAcc = 0, fpsFrames = 0, fpsT = 0, fps = 60;
let last = performance.now();

function buildWorld(c) {
  clearOccluders();
  while (world.children.length) { const ch = world.children[0]; world.remove(ch); }
  course = c; bio = BIOMES[course.biome];
  T = buildTrack(course);
  initTerrain(T, bio, course.seed);
  const S = foliageSet(course.biome, bio);
  const P = planScenery(T, bio, course.biome, course.seed);
  const terrMat = makeTerrainMaterial(bio, course.biome);
  const trailMat = makeTrailMaterial(bio, course.biome);
  // terrain meshes need occluders already populated by planScenery
  // buildTerrain/buildTrail are exported from terrain.js
  // re-import dynamic? they are exports of terrain.js already imported partially; import now:
  // (already have makeTerrainMaterial etc; buildTerrain/buildTrail not imported) -> use window? 
  // We'll import them at top? Add imports.
  buildTerrain(world, terrMat);
  buildTrail(world, trailMat);
  buildScenery(world, T, bio, course.biome, S, P, course.seed);
  applyBiome(bio, course.seed);
  // racers
  racers.forEach(r => r.dispose(RR.scene));
  racers = [];
  player = new Racer(RR.scene, T, { name: 'You', isPlayer: true, kit: KITS[store.kit], paint: PAINTS[store.paint], skill: 1, up: store.up, s: T.start, u: 0 });
  racers.push(player);
  RIVALS.forEach((rv, i) => {
    const r = new Racer(RR.scene, T, { name: rv.name, isPlayer: false, kit: rv.kit, paint: rv.paint, skill: rv.skill, idx: i + 1, s: T.start + 0.5 * i, u: (i % 2 === 0 ? 1 : -1) * 0.6 });
    racers.push(r);
  });
  race = { go: false, countdown: 3, racers, obstacles: T.obstacles, walls: true, tapeAt: null, rivalSkill: 1, finished: [] };
}

// HUD refs
const $ = id => document.getElementById(id);
const hud = $('hud'), menu = $('menu'), pause = $('pause'), over = $('over');
const speedEl = $('speed'), posEl = $('pos'), powerEl = $('power'), hpEl = $('hp'), timeEl = $('time');
const minimap = $('minimap'), mmctx = minimap.getContext('2d');

function startRace() {
  buildWorld(course);
  mode = 'play'; race.go = false; race.countdown = 3;
  racers.forEach((r, i) => { if (i === 0) r.reset(T.start, 0); else r.reset(T.start + 0.4 * i, (i % 2 === 0 ? 1 : -1) * 0.5); });
  hud.classList.remove('hidden'); menu.classList.add('hidden'); over.classList.add('hidden'); pause.classList.add('hidden');
  // countdown
  let cd = 3;
  const iv = setInterval(() => { cd--; if (cd <= 0) { race.go = true; clearInterval(iv); } }, 1000);
}

function toMenu() {
  mode = 'menu'; hud.classList.add('hidden'); over.classList.add('hidden'); pause.classList.add('hidden'); menu.classList.remove('hidden');
  $('coins').textContent = store.coins; $('stars').textContent = store.stars ? Object.values(store.stars).reduce((a,b)=>a+b,0) : 0;
}

function endRace() {
  mode = 'over'; race.go = false;
  const order = racers.slice().sort((a,b) => b.s - a.s);
  const place = order.indexOf(player) + 1;
  $('resTitle').textContent = POS_NAMES[place-1] || (place + 'TH');
  $('resStats').textContent = `Time ${fmtTime(player.raceTime || (timeAcc))}\nTop speed ${Math.round(player.topSpeed)} km/h\nCrashes ${player.crashes}`;
  over.classList.remove('hidden'); hud.classList.add('hidden');
  // award
  store.coins += Math.max(50, 300 - place * 40);
  save();
}

function fmtTime(t) { const m = Math.floor(t/60); const s = t - m*60; return m + ':' + s.toFixed(2).padStart(5,'0'); }

// input
const steerZone = $('steerZone');
let dragging = false, dragStartX = 0, dragSteer = 0;
steerZone.addEventListener('pointerdown', e => { dragging = true; dragStartX = e.clientX; dragSteer = steerInput; steerZone.setPointerCapture(e.pointerId); });
steerZone.addEventListener('pointermove', e => { if (!dragging) return; const dx = (e.clientX - dragStartX) / 60; steerInput = clamp(dragSteer + dx, -1, 1); });
steerZone.addEventListener('pointerup', () => { dragging = false; steerInput *= 0.3; });
$('btnBrake').addEventListener('pointerdown', () => brakeInput = true);
$('btnBrake').addEventListener('pointerup', () => brakeInput = false);
$('btnJump').addEventListener('pointerdown', () => jumpBuf = 0.15);
$('btnBoost').addEventListener('pointerdown', () => boostBuf = true);

// buttons
$('btnPlay').addEventListener('click', () => { userGesture = true; startRace(); });
$('btnPause').addEventListener('click', () => { if (mode === 'play') { paused = true; pause.classList.remove('hidden'); } });
$('btnResume').addEventListener('click', () => { paused = false; pause.classList.add('hidden'); });
$('btnQuit').addEventListener('click', () => { paused = false; pause.classList.add('hidden'); toMenu(); });
$('btnAgain').addEventListener('click', () => startRace());
$('btnMenu').addEventListener('click', () => toMenu());

onBack(() => { if (mode === 'play' && !paused) { paused = true; pause.classList.remove('hidden'); return true; } if (paused) { paused = false; pause.classList.add('hidden'); return true; } return false; });
onPauseResume(() => { paused = true; }, () => { paused = false; });

// game state exposed
const G = { mode: () => mode, racers, race };
window.__game = G;
window.__fps = 0;

// minimap
function drawMinimap() {
  mmctx.clearRect(0,0,120,120);
  mmctx.fillStyle = 'rgba(0,0,0,.4)'; mmctx.fillRect(0,0,120,120);
  if (!T) return;
  // draw track polyline scaled
  const xs = T.X, zs = T.Z; let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;
  for (let i=0;i<T.N;i+=5){minx=Math.min(minx,xs[i]);maxx=Math.max(maxx,xs[i]);minz=Math.min(minz,zs[i]);maxz=Math.max(maxz,zs[i]);}
  const sx=110/(maxx-minx||1), sz=110/(maxz-minz||1);
  mmctx.strokeStyle='#fff8'; mmctx.beginPath();
  for (let i=0;i<T.N;i+=5){ const x=(xs[i]-minx)*sx+5, y=(zs[i]-minz)*sz+5; i===0?mmctx.moveTo(x,y):mmctx.lineTo(x,y);}
  mmctx.stroke();
  racers.forEach(r => {
    const i = clamp(Math.floor(r.s),0,T.N-1);
    const x=(T.X[i]-minx)*sx+5, y=(T.Z[i]-minz)*sz+5;
    mmctx.fillStyle = r.isPlayer ? '#ff6a1a' : '#888';
    mmctx.beginPath(); mmctx.arc(x,y,3,0,Math.PI*2); mmctx.fill();
  });
}

function updateHUD(dt) {
  if (!player) return;
  speedEl.textContent = Math.round(player.speedKmh);
  const order = racers.slice().sort((a,b)=>b.s-a.s);
  posEl.textContent = POS_NAMES[order.indexOf(player)] || '';
  powerEl.style.width = (player.power / 5 * 100) + '%';
  hpEl.style.width = player.hp + '%';
  const t = player.raceTime || timeAcc;
  timeEl.textContent = fmtTime(t);
  drawMinimap();
}

// sim step
function sim(dt) {
  dt = Math.min(dt, 1/30);
  if (paused) return;
  if (mode !== 'play') {
    // menu backdrop: gentle player AI
    return;
  }
  timeAcc += dt;
  if (player && !player.finished) player.raceTime = timeAcc;
  // countdown
  if (!race.go) { /* wait */ } 
  const inputFor = (r) => {
    if (r.isPlayer) {
      if (Q.autoplay) return r.think(dt, race, player);
      const inp = { steer: steerInput, brake: brakeInput, jump: jumpBuf > 0, boost: boostBuf };
      if (jumpBuf > 0) jumpBuf = 0;
      if (boostBuf) boostBuf = false;
      return inp;
    }
    return r.think(dt, race, player);
  };
  for (const r of racers) {
    const inp = inputFor(r);
    if (r.isPlayer && inp && inp.jump) jumpBuf = 0;
    r.step(dt, inp, race);
    r.pose(dt, timeAcc);
    // collect events
    while (r.events && r.events.length) {
      const e = r.events.shift();
      if (e.t === 'crash') { if (r.isPlayer) { vibrate(30); R.fx.flash = 0.6; } }
      if (e.t === 'boost') { R.fx.flash = 0.3; }
    }
    if (r.s >= T.finish && !r.finished) { r.finished = true; r.finishTime = timeAcc; race.finished.push(r); if (r === player) endRace(); }
  }
  // camera
  if (player) {
    frameAt(T, player.s, { x:0,z:0,y:0,th:0,k:0,bank:0,w:0 });
  }
  // update atmos
  updateAtmosphere(RR.camera, timeAcc);
  // sun follow player
  if (player) {
    const fr = { x:0,z:0 }; // not used
    updateSun(player.world || new THREE.Vector3());
  }
  // fx decay
  R.fx.flash = Math.max(0, R.fx.flash - dt * 2);
  R.fx.speed = clamp((player ? player.v / 20 : 0), 0, 1);
}

// camera update in render
function updateCamera() {
  if (!player) return;
  const p = player.world;
  const phi = (player.posePhi != null) ? player.posePhi : 0;
  // approximate heading
  frameAt(T, player.s, _f);
  const th = _f.th + player.psi;
  const back = new THREE.Vector3(Math.sin(th), 0, Math.cos(th)).multiplyScalar(-7);
  const camPos = p.clone().add(back).add(new THREE.Vector3(0, 3.2, 0));
  RR.camera.position.lerp(camPos, 0.15);
  RR.camera.lookAt(p.x, p.y + 1.2, p.z);
}

const _f = { x:0,z:0,y:0,th:0,k:0,bank:0,w:0 };

// main loop
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000; last = now;
  if (Q.fixed) dt = 1/60;
  dt = Math.min(dt, 1/30);
  fpsFrames++; fpsT += dt; if (fpsT >= 1) { fps = fpsFrames / fpsT; fpsFrames = 0; fpsT = 0; window.__fps = fps; }
  if (!paused) {
    if (Q.warp > 0 && !window.__warped) {
      let rem = Q.warp; while (rem > 0) { const s = Math.min(rem, 1/30); sim(s); rem -= s; } window.__warped = true;
    }
    sim(dt);
  }
  updateCamera();
  updateHUD(dt);
  renderFrame(timeAcc);
  resizeIfNeeded();
}
let resized = false;
function resizeIfNeeded() { if (!resized) { resize(); resized = true; } }
window.addEventListener('resize', resize);

// boot
// handle scene param
if (Q.scene === 'menu') toMenu();
else if (Q.scene === 'play') { toMenu(); startRace(); }
else if (Q.scene === 'over') { toMenu(); /* show over with fake */ }
else toMenu();

// if autoplay, start race
if (Q.autoplay) { setTimeout(() => startRace(), 200); }

requestAnimationFrame(loop);