import * as THREE from '../../lib/three.module.js';
import { EffectComposer } from '../../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../lib/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 250);

const amb = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(amb);
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3f8f4a, 0.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8e7, 1.4);
sun.position.set(60,80,40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 300;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 60);
camera.lookAt(0, 5, 0);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
composer.addPass(bloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Ground
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.85 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Simple rolling hills
const tGeo = new THREE.PlaneGeometry(200, 200, 60, 60);
tGeo.rotateX(-Math.PI / 2);
const tPos = tGeo.attributes.position;
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i), z = tPos.getZ(i);
  const h = Math.sin(x*0.05)*3 + Math.cos(z*0.07)*2 + Math.sin((x+z)*0.03)*4;
  tPos.setY(i, h);
}
tGeo.computeVertexNormals();
const tMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.85 });
const terrain = new THREE.Mesh(tGeo, tMat);
terrain.receiveShadow = true;
scene.add(terrain);

function surfaceY(x, z) {
  return Math.sin(x*0.05)*3 + Math.cos(z*0.07)*2 + Math.sin((x+z)*0.03)*4;
}

// Platforms
const platGeo = new THREE.BoxGeometry(6, 1, 6);
const p1 = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
p1.position.set(-60, surfaceY(-60,0)+0.5, 0);
p1.castShadow = true; p1.receiveShadow = true;
scene.add(p1);
const p2 = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
p2.position.set(60, surfaceY(60,0)+0.5, 0);
p2.castShadow = true; p2.receiveShadow = true;
scene.add(p2);

// Characters - simple but nice
function makeArcher(isFemale, color) {
  const g = new THREE.Group();
  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.5, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);
  // Head
  const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.85;
  head.castShadow = true;
  g.add(head);
  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.12, 1.9, 0.3);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.12, 1.9, 0.3);
  g.add(eyeR);
  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
  const armMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.5, 1.0, 0);
  armL.rotation.z = 0.5;
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.5, 1.0, 0);
  armR.rotation.z = -0.5;
  armR.castShadow = true;
  g.add(armR);
  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 1.0, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.2, -0.5, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.2, -0.5, 0);
  legR.castShadow = true;
  g.add(legR);
  // Bow
  const bowGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 16, Math.PI);
  const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
  const bow = new THREE.Mesh(bowGeo, bowMat);
  bow.position.set(0.6, 1.0, 0);
  bow.rotation.z = Math.PI / 2;
  g.add(bow);
  return g;
}

const archerL = makeArcher(false, 0xcc2222);
archerL.position.set(-60, surfaceY(-60,0)+1.0, 0);
scene.add(archerL);

const archerR = makeArcher(true, 0x2222cc);
archerR.position.set(60, surfaceY(60,0)+1.0, 0);
archerR.rotation.y = Math.PI;
scene.add(archerR);

// Game state
const G = {
  turn: 0,
  hp: [100, 100],
  wind: (Math.random() - 0.5) * 6,
  angle: 45,
  power: 60,
  arrows: [],
  flying: false,
  gameOver: false,
};

// UI elements
const hpL = document.getElementById('hpL');
const hpR = document.getElementById('hpR');
const windEl = document.getElementById('wind');
const turnEl = document.getElementById('turn');
const angleSlider = document.getElementById('angle');
const powerSlider = document.getElementById('power');
const angleVal = document.getElementById('angleVal');
const powerVal = document.getElementById('powerVal');
const fireBtn = document.getElementById('fireBtn');
const msg = document.getElementById('msg');

if (angleSlider) angleSlider.addEventListener('input', () => { G.angle = +angleSlider.value; if (angleVal) angleVal.textContent = G.angle; });
if (powerSlider) powerSlider.addEventListener('input', () => { G.power = +powerSlider.value; if (powerVal) powerVal.textContent = G.power; });

function updateHUD() {
  if (hpL) hpL.style.width = G.hp[0] + '%';
  if (hpR) hpR.style.width = G.hp[1] + '%';
  if (windEl) windEl.textContent = 'Wind: ' + G.wind.toFixed(1);
  if (turnEl) turnEl.textContent = 'Turn: ' + (G.turn === 0 ? 'Left' : 'Right');
}

function fire() {
  if (G.flying || G.gameOver) return;
  const fromLeft = G.turn === 0;
  const startX = fromLeft ? -60 : 60;
  const startY = surfaceY(startX, 0) + 2;
  const dir = fromLeft ? 1 : -1;
  const a = G.angle * Math.PI / 180;
  const speed = G.power * 0.6;
  const vx = Math.cos(a) * speed * dir;
  const vy = Math.sin(a) * speed;
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x444400 }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
  tip.position.y = 0.7;
  arrow.add(tip);
  arrow.position.set(startX, startY, 0);
  scene.add(arrow);
  G.arrows.push({ mesh: arrow, vx, vy, vz: 0, alive: true, fromLeft });
  G.flying = true;
  // Simple beep
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch(e) {}
}

if (fireBtn) fireBtn.addEventListener('click', fire);

const aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffff00 }));
scene.add(aimLine);

function updateAimIndicator() {
  const fromLeft = G.turn === 0;
  const sx = fromLeft ? -60 : 60;
  const sy = surfaceY(sx, 0) + 2;
  const a = G.angle * Math.PI / 180;
  const dir = fromLeft ? 1 : -1;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const t = i * 0.15;
    const x = sx + Math.cos(a) * t * 20 * dir;
    const y = sy + Math.sin(a) * t * 20 - 0.5 * 9.8 * t * t * 0.5;
    pts.push(new THREE.Vector3(x, y, 0));
    if (y < surfaceY(x, 0)) break;
  }
  aimLine.geometry.setFromPoints(pts);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.max(0, Math.min(dt, 1 / 30));

  for (const ar of G.arrows) {
    if (!ar.alive) continue;
    ar.vy -= 9.8 * dt;
    ar.vx += G.wind * 0.3 * dt;
    ar.mesh.position.x += ar.vx * dt;
    ar.mesh.position.y += ar.vy * dt;
    const v = new THREE.Vector3(ar.vx, ar.vy, ar.vz);
    if (v.length() > 0.01) {
      ar.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    }
    const ySurf = surfaceY(ar.mesh.position.x, ar.mesh.position.z);
    if (ar.mesh.position.y <= ySurf) {
      ar.alive = false;
      scene.remove(ar.mesh);
      const target = ar.fromLeft ? archerR : archerL;
      const d = target.position.distanceTo(ar.mesh.position);
      if (d < 3.0) {
        const dmg = 20 + Math.round((Math.abs(ar.vx) + Math.abs(ar.vy)) * 0.5);
        const idx = ar.fromLeft ? 1 : 0;
        G.hp[idx] = Math.max(0, G.hp[idx] - dmg);
        // Beep
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 220;
          gain.gain.value = 0.15;
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        } catch (e) {}
        target.position.x += ar.fromLeft ? 2 : -2;
        if (G.hp[idx] <= 0) {
          G.gameOver = true;
          if (msg) msg.textContent = (ar.fromLeft ? 'Left' : 'Right') + ' wins!';
        }
      } else {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 120;
          gain.gain.value = 0.08;
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        } catch (e) {}
      }
      G.flying = false;
      G.turn = 1 - G.turn;
      G.wind = (Math.random() - 0.5) * 6;
      updateHUD();
    }
    if (Math.abs(ar.mesh.position.x) > 120) {
      ar.alive = false;
      scene.remove(ar.mesh);
      G.flying = false;
      G.turn = 1 - G.turn;
      updateHUD();
    }
  }
  G.arrows = G.arrows.filter(a => a.alive);

  updateAimIndicator();
  updateHUD();

  composer.render();
}
requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

updateHUD();
console.log('Bowbrawl 3D loaded');
