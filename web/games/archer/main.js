import * as THREE from '../../lib/three.module.js';
import { EffectComposer } from '../../lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../lib/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from '../../lib/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from '../../lib/addons/postprocessing/ShaderPass.js';
import { BokehPass } from '../../lib/addons/postprocessing/BokehPass.js';
import { OutputPass } from '../../lib/addons/postprocessing/OutputPass.js';
import { buildArcher } from './characters.js';

const canvas = document.getElementById('c');
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  return _audioCtx;
}
function playBeep(freq, dur, vol) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.value = vol || 0.1;
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// IBL / Environment map
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
// Simple gradient environment
const envGeo = new THREE.SphereGeometry(100, 32, 16);
const envMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0x4488ff) },
    bottomColor: { value: new THREE.Color(0x224422) }
  },
  vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos; void main(){ float h = normalize(vPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0); }'
});
const envMesh = new THREE.Mesh(envGeo, envMat);
envScene.add(envMesh);
const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
scene.environment = envMap;
pmremGenerator.dispose();
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
// Sky dome
const skyGeo = new THREE.SphereGeometry(300, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0x88ccff) },
    offset: { value: 33 },
    exponent: { value: 0.6 }
  },
  vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0,offset,0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0); }`,
  side: THREE.BackSide
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Clouds
for (let i = 0; i < 8; i++) {
  const cloudGeo = new THREE.SphereGeometry(8 + Math.random() * 6, 8, 6);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const cloud = new THREE.Mesh(cloudGeo, cloudMat);
  cloud.position.set(
    (Math.random() - 0.5) * 200,
    60 + Math.random() * 30,
    (Math.random() - 0.5) * 200
  );
  cloud.scale.set(1 + Math.random(), 0.4, 1 + Math.random());
  scene.add(cloud);
}

// Environment: rocks
for (let i = 0; i < 30; i++) {
  const rockGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9, metalness: 0.1 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(
    (Math.random() - 0.5) * 180,
    0,
    (Math.random() - 0.5) * 180
  );
  rock.position.y = surfaceYWithCraters(rock.position.x, rock.position.z);
  rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  rock.scale.set(1 + Math.random(), 0.6 + Math.random() * 0.4, 1 + Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

// Environment: trees
for (let i = 0; i < 20; i++) {
  const treeGroup = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2 + Math.random(), 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1;
  trunk.castShadow = true;
  treeGroup.add(trunk);
  const leafGeo = new THREE.SphereGeometry(1.5 + Math.random(), 8, 6);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.8 });
  const leaves = new THREE.Mesh(leafGeo, leafMat);
  leaves.position.y = 3;
  leaves.castShadow = true;
  treeGroup.add(leaves);
  treeGroup.position.set(
    (Math.random() - 0.5) * 160,
    0,
    (Math.random() - 0.5) * 160
  );
  treeGroup.position.y = surfaceYWithCraters(treeGroup.position.x, treeGroup.position.z);
  scene.add(treeGroup);
}

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

// Fill light
const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
fillLight.position.set(-40, 30, -30);
scene.add(fillLight);

// Rim light
const rimLight = new THREE.DirectionalLight(0xffaa88, 0.3);
rimLight.position.set(0, 20, -60);
scene.add(rimLight);

// Particle system for impacts
const particles = [];
function spawnParticles(x, y, z, count, color) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x, y, z);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 4
    );
    scene.add(p);
    particles.push({ mesh: p, vel, life: 1.0, maxLife: 1.0 });
  }
}

// Point lights for atmosphere
const pl1 = new THREE.PointLight(0xff8844, 0.8, 40);
pl1.position.set(-30, 10, 20);
scene.add(pl1);
const pl2 = new THREE.PointLight(0x4488ff, 0.6, 40);
pl2.position.set(30, 10, -20);
scene.add(pl2);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 60);
camera.lookAt(0, 5, 0);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85);
composer.addPass(bloomPass);

// SSAO
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 4;
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);

// Color grade pass
const colorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.15 },
    contrast: { value: 1.1 },
    warmth: { value: 0.05 },
    vignette: { value: 0.3 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation, contrast, warmth, vignette;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      // Saturation
      float l = dot(c.rgb, vec3(0.299,0.587,0.114));
      c.rgb = mix(vec3(l), c.rgb, saturation);
      // Contrast
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      // Warmth
      c.r += warmth;
      c.b -= warmth * 0.5;
      // Vignette (proper radial)
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vig = 1.0 - smoothstep(0.3, 0.8, dist) * vignette;
      c.rgb *= vig;
      gl_FragColor = c;
    }
  `
};
const colorGradePass = new ShaderPass(colorGradeShader);
composer.addPass(colorGradePass);

// Depth of Field
const bokehPass = new BokehPass(scene, camera, {
  focus: 60.0,
  aperture: 0.0001,
  maxblur: 0.01
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// Contact shadows (ground AO decal)
const contactShadowGeo = new THREE.PlaneGeometry(200, 200);
const contactShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.3,
  depthWrite: false
});
const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = 0.01;
scene.add(contactShadow);

// Ground
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.85 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Improved terrain with mountains, valleys, peaks
const tGeo = new THREE.PlaneGeometry(200, 200, 120, 120);
tGeo.rotateX(-Math.PI / 2);
const tPos = tGeo.attributes.position;
function terrainHeight(x, z) {
  let h = 0;
  h += Math.sin(x * 0.03) * 5;
  h += Math.cos(z * 0.04) * 4;
  h += Math.sin((x + z) * 0.02) * 6;
  h += Math.sin(x * 0.08) * 2;
  h += Math.cos(z * 0.1) * 1.5;
  h += Math.sin(x * 0.2 + z * 0.15) * 0.8;
  const peakDist1 = Math.sqrt((x + 40) ** 2 + (z - 30) ** 2);
  if (peakDist1 < 25) h += (25 - peakDist1) * 0.8;
  const peakDist2 = Math.sqrt((x - 50) ** 2 + (z + 20) ** 2);
  if (peakDist2 < 20) h += (20 - peakDist2) * 0.6;
  const valleyDist = Math.sqrt(x ** 2 + (z + 10) ** 2);
  if (valleyDist < 30) h -= (30 - valleyDist) * 0.3;
  return h;
}
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i), z = tPos.getZ(i);
  tPos.setY(i, terrainHeight(x, z));
}
tGeo.computeVertexNormals();
const tMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.85, metalness: 0.0 });
const terrain = new THREE.Mesh(tGeo, tMat);
terrain.receiveShadow = true;
scene.add(terrain);

function surfaceYWithCraters(x, z) {
  let h = terrainHeight(x, z);
  for (const c of craters) {
    const d = Math.sqrt((x-c.cx)**2 + (z-c.cz)**2);
    if (d < c.radius) {
      const falloff = 1 - d/c.radius;
      h -= c.depth * falloff * falloff;
    }
  }
  return h;
}

// Destructible terrain - crater deformation
const craters = [];
function addCrater(cx, cz, radius, depth) {
  craters.push({cx, cz, radius, depth});
  // Deform terrain mesh
  const pos = terrain.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.sqrt((x-cx)**2 + (z-cz)**2);
    if (d < radius) {
      const falloff = 1 - d/radius;
      const craterDepth = depth * falloff * falloff;
      const currentY = pos.getY(i);
      pos.setY(i, currentY - craterDepth);
    }
  }
  terrain.geometry.attributes.position.needsUpdate = true;
  terrain.geometry.computeVertexNormals();
}

// Modified surfaceY that accounts for craters
// Platforms
const platGeo = new THREE.BoxGeometry(6, 1, 6);
const p1 = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
p1.position.set(-60, surfaceYWithCraters(-60,0)+0.5, 0);
p1.castShadow = true; p1.receiveShadow = true;
scene.add(p1);
const p2 = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
p2.position.set(60, surfaceYWithCraters(60,0)+0.5, 0);
p2.castShadow = true; p2.receiveShadow = true;
scene.add(p2);

// Characters - simple but nice
const archerL = buildArcher(scene, {female:false});
archerL.position.set(-60, surfaceYWithCraters(-60,0)+1.0, 0);
scene.add(archerL);

const archerR = buildArcher(scene, {female:true});
archerR.position.set(60, surfaceYWithCraters(60,0)+1.0, 0);
archerR.rotation.y = Math.PI;
scene.add(archerR);

// Game state
const G = {
  turn: 0,
  screenShake: 0,
  firing: false,
  fireRecoil: 0,
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
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const arrowTypeEl = document.getElementById('arrowType');

// Start with menu
G.paused = true;
if (menu) menu.style.display = 'flex';

if (startBtn) {
  startBtn.addEventListener('click', () => {
    if (menu) menu.style.display = 'none';
    G.paused = false;
    updateHUD();
  });
}

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
  const startY = surfaceYWithCraters(startX, 0) + 2;
  const dir = fromLeft ? 1 : -1;
  const a = G.angle * Math.PI / 180;
  const speed = G.power * 0.6;
  const vx = Math.cos(a) * speed * dir;
  const vy = Math.sin(a) * speed;
  let arrowColor = 0xffff00;
  let arrowEmissive = 0x444400;
  if (G.arrowType === 'explosive') { arrowColor = 0xff4400; arrowEmissive = 0x441100; }
  if (G.arrowType === 'multi') { arrowColor = 0x00ffff; arrowEmissive = 0x004444; }
  if (G.arrowType === 'bounce') { arrowColor = 0x00ff00; arrowEmissive = 0x004400; }
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), new THREE.MeshStandardMaterial({ color: arrowColor, emissive: arrowEmissive }));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
  tip.position.y = 0.7;
  arrow.add(tip);
  arrow.position.set(startX, startY, 0);
  scene.add(arrow);
  const arrowData = { mesh: arrow, vx, vy, vz: 0, alive: true, fromLeft, trailPoints: [], bounces: 0 };
  // Create trail line
  const trailGeo = new THREE.BufferGeometry();
  const trailMat = new THREE.LineBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.7 });
  const trail = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);
  arrowData.trail = trail;
  G.arrows.push(arrowData);
  G.flying = true;
  G.firing = true;
  G.fireRecoil = 1.0;
  // Trigger archer animation
  const shooter = G.turn === 0 ? archerL : archerR;
  if (shooter.userData.parts) {
    shooter.userData.parts.armR.rotation.x = -1.2;
  }
  playBeep(600, 0.08, 0.1);
}

if (fireBtn) fireBtn.addEventListener('click', fire);

const aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffff00 }));
scene.add(aimLine);

function updateAimIndicator() {
  const fromLeft = G.turn === 0;
  const sx = fromLeft ? -60 : 60;
  const sy = surfaceYWithCraters(sx, 0) + 2;
  const a = G.angle * Math.PI / 180;
  const dir = fromLeft ? 1 : -1;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const t = i * 0.15;
    const x = sx + Math.cos(a) * t * 20 * dir;
    const y = sy + Math.sin(a) * t * 20 - 0.5 * 9.8 * t * t * 0.5;
    pts.push(new THREE.Vector3(x, y, 0));
    if (y < surfaceYWithCraters(x, 0)) break;
  }
  aimLine.geometry.setFromPoints(pts);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  if (G.paused) {
    // Still render but don't update
    composer.render();
    return;
  }
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.max(0, Math.min(dt, 1 / 30));
  // Hit pause
  if (G.hitPause > 0) {
    G.hitPause -= dt;
    dt = 0;
  }

  for (const ar of G.arrows) {
    if (!ar.alive) continue;
    ar.vy -= 9.8 * dt;
    ar.vx += G.wind * 0.3 * dt;
    // Continuous collision check
    const prevPos = ar.mesh.position.clone();
    ar.mesh.position.x += ar.vx * dt;
    ar.mesh.position.y += ar.vy * dt;
    // Check collision with target character
    const target = ar.fromLeft ? archerR : archerL;
    const targetPos = target.position;
    const dist = ar.mesh.position.distanceTo(targetPos);
    if (dist < 1.5 && ar.alive) {
      // Hit!
      ar.alive = false;
      scene.remove(ar.mesh);
      if (ar.trail) scene.remove(ar.trail);
      let craterRadius = 4, craterDepth = 3;
      if (G.arrowType === 'explosive') { craterRadius = 8; craterDepth = 6; }
      addCrater(ar.mesh.position.x, ar.mesh.position.z, craterRadius, craterDepth);
      const dmg = 20 + Math.round((Math.abs(ar.vx) + Math.abs(ar.vy)) * 0.5);
      const idx = ar.fromLeft ? 1 : 0;
      G.hp[idx] = Math.max(0, G.hp[idx] - dmg);
      playBeep(220, 0.2, 0.15);
      target.position.x += ar.fromLeft ? 2 : -2;
      spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 12, 0xffaa44);
      G.screenShake = 0.5;
      G.hitPause = 0.08;
      // Hit flash on target
      if (target.userData.parts) {
        target.userData.anim.state = 'hit';
        target.userData.anim.time = 0;
      }
      if (G.hp[idx] <= 0) {
        G.gameOver = true;
        G.deathAnim = { target: target, time: 0 };
        if (msg) msg.textContent = (ar.fromLeft ? 'Left' : 'Right') + ' wins!';
        spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 30, 0xff4444);
      }
      G.flying = false;
      G.turn = 1 - G.turn;
      G.wind = (Math.random() - 0.5) * 6;
      updateHUD();
      // Skip terrain collision check
      continue;
    }
    // Trail
    if (ar.trailPoints) {
      ar.trailPoints.push(ar.mesh.position.clone());
      if (ar.trailPoints.length > 30) ar.trailPoints.shift();
      if (ar.trail && ar.trailPoints.length > 1) {
        ar.trail.geometry.setFromPoints(ar.trailPoints);
      }
    }
    const v = new THREE.Vector3(ar.vx, ar.vy, ar.vz);
    if (v.length() > 0.01) {
      ar.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    }
    if (!ar.alive) continue;
    const ySurf = surfaceYWithCraters(ar.mesh.position.x, ar.mesh.position.z);
    if (G.arrowType === 'bounce' && ar.mesh.position.y <= ySurf && ar.bounces < 3) {
      // Bounce off terrain
      ar.vy = Math.abs(ar.vy) * 0.6;
      ar.vx *= 0.8;
      ar.mesh.position.y = ySurf + 0.1;
      ar.bounces = (ar.bounces || 0) + 1;
      playBeep(300, 0.05, 0.08);
      spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 6, 0x00ff00);
      // Don't process as hit
      continue;
    }
    if (ar.mesh.position.y <= ySurf) {
      let craterRadius = 4, craterDepth = 3;
      if (G.arrowType === 'explosive') { craterRadius = 8; craterDepth = 6; }
      if (G.arrowType === 'multi') {
        // Spawn 3 arrows in spread
        for (let i = 0; i < 3; i++) {
          const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x004444 }));
          a2.position.copy(ar.mesh.position);
          scene.add(a2);
          // Simple fall
          setTimeout(() => scene.remove(a2), 1000);
        }
      }
      addCrater(ar.mesh.position.x, ar.mesh.position.z, craterRadius, craterDepth);
      // Explosive: bigger particle burst
      if (G.arrowType === 'explosive') {
        spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 40, 0xff4400);
      }
      ar.alive = false;
      scene.remove(ar.mesh);
      if (ar.trail) scene.remove(ar.trail);
      const target = ar.fromLeft ? archerR : archerL;
      const d = target.position.distanceTo(ar.mesh.position);
      if (d < 3.0) {
        const dmg = 20 + Math.round((Math.abs(ar.vx) + Math.abs(ar.vy)) * 0.5);
        const idx = ar.fromLeft ? 1 : 0;
        G.hp[idx] = Math.max(0, G.hp[idx] - dmg);
        playBeep(220, 0.2, 0.15);
        target.position.x += ar.fromLeft ? 2 : -2;
        // Hit reaction
        if (target.userData.parts) {
          target.userData.anim.state = 'hit';
          target.userData.anim.time = 0;
        }
        // Spawn impact particles
        spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 12, 0xffaa44);
        G.screenShake = 0.5;
        if (G.hp[idx] <= 0) {
          G.gameOver = true;
          G.deathAnim = { target: target, time: 0 };
          if (msg) msg.textContent = (ar.fromLeft ? 'Left' : 'Right') + ' wins!';
          // Big particle burst
          spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 30, 0xff4444);
        }
      } else {
        spawnParticles(ar.mesh.position.x, ar.mesh.position.y, ar.mesh.position.z, 8, 0x886644);
        playBeep(120, 0.1, 0.08);
      }
      G.flying = false;
      G.turn = 1 - G.turn;
      G.wind = (Math.random() - 0.5) * 6;
      updateHUD();
    }
    if (Math.abs(ar.mesh.position.x) > 120) {
      ar.alive = false;
      scene.remove(ar.mesh);
      if (ar.trail) scene.remove(ar.trail);
      G.flying = false;
      G.turn = 1 - G.turn;
      updateHUD();
    }
  }
  G.arrows = G.arrows.filter(a => a.alive);

  // Death animation
  if (G.deathAnim) {
    G.deathAnim.time += 0.016;
    const target = G.deathAnim.target;
    const progress = Math.min(1, G.deathAnim.time / 1.5);
    target.rotation.x = progress * Math.PI / 2;
    target.position.y -= 0.02;
    if (progress >= 1) {
      G.deathAnim = null;
    }
  }

  // Character idle animation
  const t = now * 0.001;
  for (const archer of [archerL, archerR]) {
    const parts = archer.userData.parts;
    if (parts) {
      // Breathing
      parts.upperTorso.scale.y = 1 + Math.sin(t * 2) * 0.02;
      const isFemale = (archer === archerR);
      // Weight shift
      archer.rotation.z = Math.sin(t * 0.7) * 0.02;
      // Arm sway
      parts.armL.rotation.x = Math.sin(t * 1.2) * 0.05;
      parts.armR.rotation.x = Math.sin(t * 1.2 + 1) * 0.05;
      // Hair sway
      if (parts.hairGroup) {
        parts.hairGroup.rotation.z = Math.sin(t * 1.5) * 0.03;
      }
    }
  }

  // Update particles (dt-based)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt * 2.0;
    p.vel.y -= 9.8 * dt;
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y += p.vel.y * dt;
    p.mesh.position.z += p.vel.z * dt;
    p.mesh.material.opacity = Math.max(0, p.life);
    p.mesh.scale.setScalar(Math.max(0.01, p.life));
    if (p.life <= 0) {
      scene.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }

  // Fire recoil animation (decay)
  if (G.firing) {
    G.fireRecoil = Math.max(0, (G.fireRecoil || 0) - 0.05);
    if (G.fireRecoil <= 0) G.firing = false;
  }

  // Screen shake (trauma-based, decays)
  if (G.screenShake > 0) {
    G.screenShake = Math.max(0, G.screenShake - dt * 2);
    const shake = G.screenShake * G.screenShake;
    camera.position.x = (Math.random() - 0.5) * shake * 3;
    camera.position.y = 25 + (Math.random() - 0.5) * shake * 3;
    camera.rotation.z = (Math.random() - 0.5) * shake * 0.05;
  } else {
    camera.position.x = 0;
    camera.position.y = 25;
    camera.rotation.z = 0;
  }
  camera.lookAt(0, 5, 0);

  // Update arrow type display
  if (arrowTypeEl) {
    const names = { standard: 'Standard', explosive: 'Explosive', multi: 'Multi', bounce: 'Bounce' };
    arrowTypeEl.textContent = 'Arrow: ' + (names[G.arrowType] || 'Standard') + ' (1-4)';
  }

  // Pause overlay
  if (pauseOverlay) {
    pauseOverlay.style.display = G.paused ? 'flex' : 'none';
  }

  updateAimIndicator();
  updateHUD();

  composer.render();
}
requestAnimationFrame(loop);

// Arrow type selection (1-4)
window.addEventListener('keydown', (e) => {
  if (e.key === '1') G.arrowType = 'standard';
  if (e.key === '2') G.arrowType = 'explosive';
  if (e.key === '3') G.arrowType = 'multi';
  if (e.key === '4') G.arrowType = 'bounce';
});

// Restart on R key
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (G.gameOver) {
      G.hp = [100, 100];
      G.turn = 0;
      G.gameOver = false;
      G.deathAnim = null;
      G.wind = (Math.random() - 0.5) * 6;
      // Reset positions
      archerL.position.set(-60, surfaceYWithCraters(-60, 0) + 1.0, 0);
      archerR.position.set(60, surfaceYWithCraters(60, 0) + 1.0, 0);
      archerL.rotation.set(0, 0, 0);
      archerR.rotation.set(0, Math.PI, 0);
      if (msg) msg.textContent = '';
      updateHUD();
    }
  }
  if (e.key === 'p' || e.key === 'P') {
    G.paused = !G.paused;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

updateHUD();
console.log('Bowbrawl 3D loaded');
