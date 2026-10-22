import * as THREE from '../../lib/three.module.js';
import { mergeGeometries } from '../../lib/addons/utils/BufferGeometryUtils.js';
import { setOrientation, vibrate, goHome, onBack, onPauseResume, params } from '../../shared/platform.js';

setOrientation('landscape');

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const ui = {
  menu: $('menu'), pause: $('pauseOverlay'), victory: $('victory'),
  start: $('startBtn'), fire: $('fireBtn'), resume: $('resumeBtn'),
  rematch: $('rematchBtn'), home: $('homeBtn'), pauseHome: $('pauseHomeBtn'),
  resultHome: $('resultHomeBtn'), pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'),
  controls: $('controls'), angle: $('angle'), power: $('power'),
  angleVal: $('angleVal'), powerVal: $('powerVal'), arrowOptions: [...document.querySelectorAll('.arrow-option')],
  hpL: $('hpL'), hpR: $('hpR'), hpLT: $('leftHpText'), hpRT: $('rightHpText'),
  leftStatus: $('leftStatus'), rightStatus: $('rightStatus'), round: $('roundNum'),
  wind: $('wind'), windGlyph: $('windGlyph'), turn: $('turn'), turnBanner: $('turnBanner'),
  aimHint: $('aimHint'), msg: $('msg'), winner: $('winner'), resultLine: $('resultLine'),
  resultEyebrow: $('resultEyebrow'), resultSigil: $('resultSigil'),
  headshots: $('headshotCount'), damage: $('damageCount'), streak: $('streakCount'),
  fps: $('fpsTag'), fireSub: $('fireSub')
};

const state = {
  screen: 'menu', turn: 'player', round: 1, selectedArrow: 'standard',
  angle: 23, power: 56, wind: 1.8, muted: false,
  projectile: null, pending: 0, aiWait: 0, autoWait: 0, resetWait: 0,
  time: 0, cameraKick: 0, hitStop: 0, totalDamage: 0, headshots: 0, streak: 0,
  bestStreak: 0, shots: 0, lastHit: '', autoPilot: params.get('autoplay') === '1',
  fixedStep: params.get('fixedstep') === '1', disposed: false
};

let seed = (Number(params.get('seed')) || 73) >>> 0;
function random() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
// Desktop browsers often log a warning for navigator.vibrate outside a trusted tap.
// The Android app exposes a native vibration bridge, so keep haptics native-only.
function haptic(ms) {
  if (window.AndroidHost) vibrate(ms);
}

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: false, powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb5a0a3, 0.0068);
const camera = new THREE.OrthographicCamera(-10, 10, 5.65, -5.65, 0.1, 150);
camera.position.set(0, 7.2, 31);
camera.lookAt(0, 2.35, 0);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(75, 40, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color(0x273e69) },
      mid: { value: new THREE.Color(0xc48689) },
      horizon: { value: new THREE.Color(0xf6bc87) }
    },
    vertexShader: 'varying vec3 vSky; void main(){ vSky=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; varying vec3 vSky; void main(){ float h=clamp(vSky.y*0.5+0.48,0.0,1.0); vec3 c=mix(horizon,mid,smoothstep(0.03,0.62,h)); c=mix(c,zenith,smoothstep(0.48,0.96,h)); gl_FragColor=vec4(c,1.0); }'
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xd7e7ff, 0x48364a, 1.8);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffd7ac, 3.5);
sunLight.position.set(-8, 16, 13);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -15;
sunLight.shadow.camera.right = 15;
sunLight.shadow.camera.top = 13;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;
sunLight.shadow.bias = -0.00018;
sunLight.shadow.normalBias = 0.025;
scene.add(sunLight);
const fill = new THREE.DirectionalLight(0x78c5da, 1.25);
fill.position.set(10, 8, 8);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xf6a5a1, 1.8);
rim.position.set(0, 7, -10);
scene.add(rim);

function makeTexture(kind, salt) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  if (kind === 'rock') {
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#71677a'); grad.addColorStop(.38, '#494b61'); grad.addColorStop(1, '#2e354b');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2100; i++) {
      const v = random();
      g.fillStyle = v > .5 ? 'rgba(226,190,166,' + (v * .13) + ')' : 'rgba(7,15,32,' + ((1-v) * .3) + ')';
      const x = random() * 256, y = random() * 256;
      g.fillRect(x, y, 1 + random() * 4, 1 + random() * 3);
    }
    for (let i = 0; i < 17; i++) {
      const y = random() * 256;
      g.strokeStyle = i % 3 === 0 ? 'rgba(238,183,142,.25)' : 'rgba(13,23,42,.25)';
      g.lineWidth = .5 + random() * 2; g.beginPath(); g.moveTo(0, y);
      g.bezierCurveTo(60, y + random() * 8 - 4, 180, y + random() * 9 - 4, 256, y + random() * 4 - 2); g.stroke();
    }
  } else if (kind === 'grass') {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#829b69'); grad.addColorStop(.5, '#617c59'); grad.addColorStop(1, '#435d4e');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const v = random();
      g.strokeStyle = v > .5 ? 'rgba(195,205,132,.28)' : 'rgba(21,56,48,.3)';
      g.lineWidth = .5 + random() * 1.5; g.beginPath();
      const x = random() * 256, y = random() * 256;
      g.moveTo(x, y); g.lineTo(x + random() * 5 - 2.5, y - 2 - random() * 9); g.stroke();
    }
    for (let i = 0; i < 55; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,209,135,.18)' : 'rgba(17,48,44,.16)';
      g.beginPath(); g.arc(random() * 256, random() * 256, 1 + random() * 3, 0, Math.PI * 2); g.fill();
    }
  } else {
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#5c4637'); grad.addColorStop(.2, '#a77b4e'); grad.addColorStop(.5, '#694832'); grad.addColorStop(1, '#3c3040');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 85; i++) {
      g.strokeStyle = 'rgba(25,15,20,' + (0.08 + random() * .18) + ')';
      g.lineWidth = .5 + random() * 2;
      g.beginPath(); g.moveTo(random() * 256, 0); g.lineTo(random() * 256, 256); g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(kind === 'rock' ? 2.5 : 2, kind === 'rock' ? 1.1 : 2);
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}
const rockTexture = makeTexture('rock', 1);
const grassTexture = makeTexture('grass', 2);
const woodTexture = makeTexture('wood', 3);
const rockMat = new THREE.MeshStandardMaterial({ map: rockTexture, color: 0xd4c0b7, roughness: .93, metalness: .015 });
const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture, color: 0xe1e3bd, roughness: .96 });
const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xc5a07c, roughness: .72 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x344258, roughness: .38, metalness: .72 });
const goldMetal = new THREE.MeshStandardMaterial({ color: 0xe1b36f, roughness: .31, metalness: .7, emissive: 0x2f1607, emissiveIntensity: .18 });
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x67e5db, emissive: 0x2fc9cc, emissiveIntensity: 1.7, roughness: .22, metalness: .1 });
const emberMat = new THREE.MeshStandardMaterial({ color: 0xff9d5c, emissive: 0xff5e35, emissiveIntensity: 1.5, roughness: .25 });

function addMountain(points, color, z, opacity) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }));
  m.position.z = z;
  scene.add(m);
  return m;
}
addMountain([[-35,-2],[-31,1],[-26,5],[-21,1],[-16,4],[-11,.6],[-6,4],[1,.3],[8,4],[14,.8],[19,5],[25,1],[31,4],[36,-2]], 0x736d8e, -16, .85);
addMountain([[-34,-3],[-30,0],[-26,2.8],[-23,.8],[-18,2.5],[-12,-.3],[-7,2.4],[-1,-.7],[5,2.2],[10,-.2],[15,3.2],[21,0],[25,2.6],[30,-.1],[35,-3]], 0x55566f, -13.5, .84);
addMountain([[-32,-4],[-27,-.8],[-22,1.5],[-17,-1.2],[-11,1.2],[-6,-1.6],[0,1.1],[7,-1.4],[13,1],[19,-1],[24,1.3],[30,-1.3],[34,-4]], 0x363d59, -11.5, .88);

const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd9a4 }));
sunDisk.position.set(-7.9, 6.15, -15);
scene.add(sunDisk);
const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 12), new THREE.MeshBasicMaterial({ color: 0xffb781, transparent: true, opacity: .16, depthWrite: false }));
sunHalo.position.copy(sunDisk.position);
scene.add(sunHalo);

const cloudClusters = [];
const cloudPuffs = [];
const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xf5d4c8, roughness: 1, transparent: true, opacity: .53, depthWrite: false });
const cloudInstanced = new THREE.InstancedMesh(new THREE.SphereGeometry(.62, 10, 7), cloudMaterial, 45);
cloudInstanced.castShadow = false;
cloudInstanced.receiveShadow = false;
const cloudDummy = new THREE.Object3D();
for (let i = 0; i < 9; i++) {
  cloudClusters.push({
    x:(random()-.5)*37, y:3.6+random()*6.2, z:-8.5-random()*2.5,
    scale:.65+random()*.9, speed:.06+random()*.12, phase:random()*7
  });
}
for (let i = 0; i < 45; i++) {
  const cluster=cloudClusters[Math.floor(i/5)];
  const local=i%5;
  const puff={
    index:i, cluster,
    x:(local-2)*(.63+random()*.12),
    y:random()*.28,
    z:(random()-.5)*.26,
    scale:.62+random()*.42,
    phase:random()*6.28
  };
  cloudPuffs.push(puff);
  cloudDummy.position.set(cluster.x+puff.x,cluster.y+puff.y,cluster.z+puff.z);
  cloudDummy.scale.set(1.5*puff.scale*cluster.scale,.54*puff.scale*cluster.scale,.55*puff.scale*cluster.scale);
  cloudDummy.updateMatrix();
  cloudInstanced.setMatrixAt(i,cloudDummy.matrix);
}
cloudInstanced.instanceMatrix.needsUpdate=true;
scene.add(cloudInstanced);
function animateClouds(dt) {
  for (const c of cloudClusters) {
    c.x+=c.speed*dt;
    if(c.x>23)c.x=-23;
  }
  for(const p of cloudPuffs) {
    const c=p.cluster;
    cloudDummy.position.set(c.x+p.x,c.y+p.y+Math.sin(state.time*.22+c.phase+p.phase)*.08,c.z+p.z);
    cloudDummy.rotation.set(0,0,Math.sin(state.time*.15+p.phase)*.015);
    cloudDummy.scale.set(1.5*p.scale*c.scale,.54*p.scale*c.scale,.55*p.scale*c.scale);
    cloudDummy.updateMatrix();
    cloudInstanced.setMatrixAt(p.index,cloudDummy.matrix);
  }
  cloudInstanced.instanceMatrix.needsUpdate=true;
}

// Small floating ruins establish a world that feels part of the same stylized arcade universe.
function addRuin(x, y, z, s, lightMat) {
  const g = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.18*s, .24*s, 2.2*s, 6), darkMetal);
  pillar.position.y = .55*s; pillar.castShadow = true; pillar.receiveShadow = true; g.add(pillar);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.42*s, .28*s, .23*s, 6), goldMetal);
  cap.position.y = 1.7*s; cap.castShadow = true; g.add(cap);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.25*s, 0), lightMat);
  gem.position.y = 2.06*s; gem.rotation.y = .4; g.add(gem);
  g.position.set(x,y,z); scene.add(g);
  return g;
}
addRuin(-10.5, .2, -5.7, 1.25, crystalMat);
addRuin(10.3, .4, -5.8, 1.5, emberMat);
addRuin(-12.6, -1, -7.7, .7, crystalMat);
addRuin(12.5, -.8, -7.7, .8, emberMat);

const platformSurfaceY = .52;
function buildIsland(isLeft) {
  const island = new THREE.Group();
  island.position.set(isLeft ? -9.3 : 9.3, 0, -2.3);
  island.scale.x = isLeft ? 1 : -1;
  const shape = new THREE.Shape();
  shape.moveTo(-.7, .43);
  shape.lineTo(7.25, .43);
  shape.lineTo(7.42, .02);
  shape.lineTo(6.97, -.66);
  shape.lineTo(7.3, -1.2);
  shape.lineTo(6.47, -1.92);
  shape.lineTo(6.7, -2.58);
  shape.lineTo(5.25, -3.24);
  shape.lineTo(4.55, -3.82);
  shape.lineTo(3.2, -3.6);
  shape.lineTo(2.22, -4.38);
  shape.lineTo(.55, -4.05);
  shape.lineTo(-.9, -4.4);
  shape.lineTo(-1.35, -3.55);
  shape.lineTo(-1.03, -2.77);
  shape.lineTo(-1.47, -1.9);
  shape.lineTo(-.95, -1.04);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 4.6, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .1, bevelThickness: .12, curveSegments: 4 });
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, rockMat);
  body.castShadow = true; body.receiveShadow = true; island.add(body);
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(7.76, 4.35), grassMat);
  turf.rotation.x = -Math.PI/2;
  turf.position.set(3.27, platformSurfaceY, 2.23);
  turf.receiveShadow = true; island.add(turf);

  // Hand-built lip stones, tiny banners, rivets and luminous seams break up the silhouette.
  for (let i = 0; i < 13; i++) {
    const x = .05 + random() * 6.9;
    const y = -.6 - random() * 2.8;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.25 + random() * .6, .035 + random() * .035, .045), i % 4 === 0 ? goldMetal : darkMetal);
    seam.position.set(x, y, 2.34);
    seam.rotation.z = (random() - .5) * .18;
    island.add(seam);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(4.25, .13, .14), darkMetal);
  rail.position.set(3.8, .68, .43); rail.castShadow = true; island.add(rail);
  for (let i = 0; i < 5; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.13,.38,.16), goldMetal);
    post.position.set(1.75 + i * 1.02, .74, .43); post.castShadow = true; island.add(post);
  }
  // Broken masonry at the outer edge.
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.75 + random()*.8,6), darkMetal);
    col.position.set(.1 + i*.38, .92 + (i%2)*.12, -.2);
    col.castShadow = true; island.add(col);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.26,.22,.14,6), goldMetal);
    cap.position.set(col.position.x, col.position.y + .42, -.2); island.add(cap);
  }
  const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.2,0), isLeft ? crystalMat : emberMat);
  lamp.position.set(5.9,1.02,.55); island.add(lamp);
  const light = new THREE.PointLight(isLeft ? 0x42e5d8 : 0xff9867, 1.25, 4.4);
  light.position.copy(lamp.position); island.add(light);

  // Suspended stalactites give the floating landmass a readable underside.
  for (let i = 0; i < 9; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(.15 + random()*.18, .55 + random()*.75, 5), rockMat);
    spike.rotation.z = Math.PI + (random()-.5)*.25;
    spike.position.set(.2 + random()*6.2, -3.65 - random()*.3, .5 + random()*1.3);
    spike.castShadow = true; island.add(spike);
  }
  scene.add(island);
  return island;
}
const islandLeft = buildIsland(true);
const islandRight = buildIsland(false);

const groundMistMat = new THREE.MeshBasicMaterial({ color: 0xffb3a2, transparent: true, opacity: .08, depthWrite: false });
for (let i = 0; i < 8; i++) {
  const mist = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), groundMistMat);
  mist.scale.set(2.8 + random()*2.2, .22 + random()*.18, .7);
  mist.position.set((random()-.5)*30, -2.2 + random()*1.8, -3-random()*2);
  scene.add(mist);
}

const actorMats = {
  skinA: new THREE.MeshStandardMaterial({ color: 0xd49d7b, roughness: .7 }),
  skinB: new THREE.MeshStandardMaterial({ color: 0xe5ae8d, roughness: .65 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x182438, roughness: .52, metalness: .18 }),
  clothA: new THREE.MeshStandardMaterial({ color: 0x1c575b, roughness: .82 }),
  clothB: new THREE.MeshStandardMaterial({ color: 0x803e48, roughness: .76 }),
  trimA: new THREE.MeshStandardMaterial({ color: 0x64d3c1, metalness: .62, roughness: .34, emissive: 0x0e3935, emissiveIntensity: .18 }),
  trimB: new THREE.MeshStandardMaterial({ color: 0xf2b86f, metalness: .65, roughness: .3, emissive: 0x48220c, emissiveIntensity: .18 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x8fa5b8, metalness: .75, roughness: .3 }),
  hairA: new THREE.MeshStandardMaterial({ color: 0x111b2c, roughness: .82 }),
  hairB: new THREE.MeshStandardMaterial({ color: 0x302235, roughness: .8 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x151a24, roughness: .25 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffebd7, roughness: .5 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x49363c, roughness: .88 }),
  bowWood: new THREE.MeshStandardMaterial({ color: 0x946342, roughness: .48, metalness: .04 }),
  arrowWood: new THREE.MeshStandardMaterial({ color: 0xe5c994, roughness: .47 }),
  feather: new THREE.MeshStandardMaterial({ color: 0xc9d9dd, roughness: .58 })
};

function makeLimb(parent, a, b, radius, material, segments) {
  const av = new THREE.Vector3(a[0],a[1],a[2]||0), bv = new THREE.Vector3(b[0],b[1],b[2]||0);
  const direction = new THREE.Vector3().subVectors(bv,av);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(.04,length-radius*2), 4, segments || 8), material);
  mesh.position.copy(av).add(bv).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
function sphere(parent, geo, material, pos, scale, cast) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(pos[0],pos[1],pos[2]||0);
  if (scale) mesh.scale.set(scale[0],scale[1],scale[2]);
  mesh.castShadow = cast !== false; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function makeBow(dir, aim) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,-.85,0), new THREE.Vector3(.32,-.72,0),
    new THREE.Vector3(.47,-.38,0), new THREE.Vector3(.5,0,0),
    new THREE.Vector3(.47,.38,0), new THREE.Vector3(.32,.72,0),
    new THREE.Vector3(0,.85,0)
  ]);
  const bow = new THREE.Mesh(new THREE.TubeGeometry(curve,24,.065,8,false),goldMetal);
  bow.castShadow = true; g.add(bow);
  const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.85,.015),new THREE.Vector3(-.07,0,.015),new THREE.Vector3(0,.85,.015)]);
  g.add(new THREE.Line(stringGeo,new THREE.LineBasicMaterial({color:0xe7e4d9,transparent:true,opacity:.9})));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.34,8),woodMat);
  grip.rotation.z = Math.PI/2; grip.position.x = .02; g.add(grip);
  for (let k = 0; k < 2; k++) {
    const rune = new THREE.Mesh(new THREE.BoxGeometry(.15,.025,.035),dir > 0 ? crystalMat : emberMat);
    rune.position.set(.18,k===0?-.35:.35,.05); g.add(rune);
  }
  g.scale.x = dir;
  g.rotation.z = dir > 0 ? aim : -aim;
  return g;
}
function mergeCharacterMeshes(root) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map();
  const originals = [];
  root.traverse(child => {
    if (!child.isMesh || child.userData.keepSeparate || Array.isArray(child.material)) return;
    let ancestor = child.parent, keepSeparate = false;
    while (ancestor && ancestor !== root) {
      if (ancestor.userData.keepSeparate) { keepSeparate = true; break; }
      ancestor = ancestor.parent;
    }
    if (keepSeparate) return;
    let geometry = child.geometry.clone();
    if (geometry.index) geometry = geometry.toNonIndexed();
    const relative = new THREE.Matrix4().multiplyMatrices(rootInverse, child.matrixWorld);
    geometry.applyMatrix4(relative);
    geometry.computeVertexNormals();
    const material = child.material;
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push({geometry, original:child});
  });
  for (const [material, batch] of batches) {
    if (batch.length < 2) {
      for (const entry of batch) entry.geometry.dispose();
      continue;
    }
    const merged = mergeGeometries(batch.map(entry => entry.geometry), false);
    if (!merged) {
      for (const entry of batch) entry.geometry.dispose();
      continue;
    }
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const entry of batch) {
      entry.original.parent?.remove(entry.original);
      entry.geometry.dispose();
    }
  }
}
function makeCharacter(side) {
  const dir = side === 0 ? 1 : -1;
  const male = side === 0;
  const yaw = male ? .58 : -.58;
  const root = new THREE.Group();
  root.position.set(male ? -6.15 : 6.15, platformSurfaceY, .78);
  root.rotation.y = yaw;
  root.userData.yaw = yaw;
  const cloth = male ? actorMats.clothA : actorMats.clothB;
  const trim = male ? actorMats.trimA : actorMats.trimB;
  const skin = male ? actorMats.skinA : actorMats.skinB;
  const hair = male ? actorMats.hairA : actorMats.hairB;
  const white = new THREE.MeshStandardMaterial({color: male ? 0xe4f6ed : 0xffecd9, roughness:.6});
  const dark = actorMats.ink;

  // Boots and split greaves make the silhouette read clearly even at phone size.
  sphere(root,new THREE.SphereGeometry(.3,12,8),actorMats.leather,[-.22,.2,.01],[1.1,.55,1.35]);
  sphere(root,new THREE.SphereGeometry(.3,12,8),actorMats.leather,[.25,.2,.01],[1.1,.55,1.35]);
  makeLimb(root,[-.22,.36,0],[-.27,1.04,0],.18,dark,7);
  makeLimb(root,[.23,.36,0],[.25,1.04,0],.18,dark,7);
  const greaveL = sphere(root,new THREE.CapsuleGeometry(.16,.36,4,8),male?trim:actorMats.armor,[-.26,.67,.12],[1,1,.8]);
  const greaveR = sphere(root,new THREE.CapsuleGeometry(.16,.36,4,8),male?actorMats.armor:trim,[.25,.67,.12],[1,1,.8]);
  const skirt = sphere(root,new THREE.CylinderGeometry(.25,.49,.63,7,1),cloth,[0,1.16,0],[1,1,.9]);
  skirt.rotation.z = .03;
  for (let i=0;i<4;i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.22,.58,.08), i%2===0?trim:dark);
    panel.position.set(-.3+i*.2,.95,.28); panel.rotation.z=(i-1.5)*.08; panel.castShadow=true; root.add(panel);
  }

  const torso = sphere(root,new THREE.CapsuleGeometry(.38,.76,5,10),cloth,[0,1.85,0],male?[1.16,1.02,.9]:[.9,1.02,.82]);
  const chest = sphere(root,new THREE.SphereGeometry(.43,14,10),male?actorMats.armor:actorMats.trimB,[0,2.02,.19],male?[1.06,.75,.38]:[.97,.82,.4]);
  const inner = sphere(root,new THREE.SphereGeometry(.31,12,8),cloth,[0,2.02,.34],male?[.88,.6,.2]:[.9,.62,.22]);
  if (!male) {
    // An intentional hourglass armor silhouette: fitted waist, articulated breastplate and flared hips.
    sphere(root,new THREE.SphereGeometry(.29,14,10),cloth,[0,1.71,.2],[.78,.95,.75]);
    sphere(root,new THREE.SphereGeometry(.2,12,8),actorMats.armor,[-.19,2.05,.39],[1.04,1.18,.52]);
    sphere(root,new THREE.SphereGeometry(.2,12,8),actorMats.armor,[.19,2.05,.39],[1.04,1.18,.52]);
    const chestBadge = new THREE.Mesh(new THREE.OctahedronGeometry(.11,0), emberMat);
    chestBadge.position.set(0,2.22,.51); root.add(chestBadge);
  }
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(.36,.35,.16,12),goldMetal);
  belt.position.y=1.47; belt.castShadow=true; root.add(belt);
  sphere(root,new THREE.OctahedronGeometry(.12,0),male?crystalMat:emberMat,[0,1.48,.39],[1,1,.55]);
  // Raised pauldrons, forearm guards and a single bold shoulder silhouette.
  sphere(root,new THREE.SphereGeometry(.26,12,8),male?actorMats.armor:actorMats.trimB,[-.4,2.28,.02],[1.05,.82,.92]);
  sphere(root,new THREE.SphereGeometry(.28,12,8),trim,[.4,2.29,.04],[1.05,.9,.9]);
  makeLimb(root,[-.4,2.24,.04],[-.59,1.75,.13],.14,cloth,8);
  makeLimb(root,[-.59,1.75,.13],[-.36,1.55,.27],.12,trim,8);
  makeLimb(root,[.4,2.26,.05],[dir*.68,2.42,.18],.15,cloth,8);
  makeLimb(root,[dir*.68,2.42,.18],[dir*.88,2.62,.28],.105,skin,8);
  sphere(root,new THREE.SphereGeometry(.13,10,8),trim,[dir*.88,2.62,.28],[1,1,1]);

  // Face, brow, nose and mask are built as deliberate readable planes, not featureless balls.
  makeLimb(root,[0,2.28,0],[0,2.65,0],.13,skin,8);
  const head = sphere(root,new THREE.SphereGeometry(.36,20,16),skin,[0,3.05,.02],[.88,1.06,.87]);
  const jaw = sphere(root,new THREE.SphereGeometry(.27,14,10),skin,[0,2.89,.09],[.84,.64,.88]);
  sphere(root,new THREE.SphereGeometry(.365,16,10),hair,[0,3.27,-.04],[1.01,.65,.92]);
  if (male) {
    const hood = sphere(root,new THREE.SphereGeometry(.39,16,10),dark,[0,3.14,-.15],[1.08,.95,.7]);
    const hoodFront = sphere(root,new THREE.SphereGeometry(.34,16,10),hair,[0,3.21,.06],[1,.76,.92]);
    const mask = sphere(root,new THREE.SphereGeometry(.27,14,9),dark,[0,2.9,.25],[.95,.35,.43]);
    for (let i=0;i<3;i++) {
      const fold = new THREE.Mesh(new THREE.BoxGeometry(.23,.025,.025),trim);
      fold.position.set(0,2.83+i*.055,.49); root.add(fold);
    }
  } else {
    // Adult warrior: elegant long hair, ornamental crown and practical fitted armor.
    sphere(root,new THREE.SphereGeometry(.38,16,12),hair,[0,3.16,-.12],[1.13,1.13,.86]);
    makeLimb(root,[-.29,3.08,-.04],[-.4,2.05,-.18],.14,hair,8);
    makeLimb(root,[.29,3.08,-.04],[.45,2.2,-.18],.13,hair,8);
    const fringe = sphere(root,new THREE.SphereGeometry(.23,14,8),hair,[.12,3.35,.17],[1.15,.5,.6]);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(.27,.035,6,14,Math.PI),goldMetal);
    crown.position.set(0,3.47,.04); crown.rotation.x=Math.PI/2; crown.rotation.z=Math.PI; root.add(crown);
    sphere(root,new THREE.OctahedronGeometry(.095,0),emberMat,[0,3.54,.07],[1,1,.65]);
  }
  // Eye and cheek details sit toward the camera-facing side, with a glint for expression.
  for (const ex of [-.14,.14]) {
    sphere(root,new THREE.SphereGeometry(.067,10,8),white,[ex,3.08,.312],[1.05,.86,.55]);
    sphere(root,new THREE.SphereGeometry(.035,8,6),actorMats.eye,[ex+.018,3.08,.355],[1,1,.45]);
    sphere(root,new THREE.SphereGeometry(.012,6,4),white,[ex+.025,3.095,.372],[1,1,.5],false);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.13,.035,.035),male?actorMats.ink:actorMats.hairB);
    brow.position.set(ex,3.19,.31); brow.rotation.z=male?(ex<0?-.14:.12):(ex<0?.16:-.12); root.add(brow);
  }
  sphere(root,new THREE.SphereGeometry(.045,8,6),skin,[0,3.0,.36],[.75,.65,.55]);
  // Cloth sash and short back-cape provide motion and color separation.
  const sash = new THREE.Mesh(new THREE.BoxGeometry(.19,.93,.06),trim);
  sash.position.set(.17,1.93,.4); sash.rotation.z=-.25; root.add(sash);
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(.76,1.32,3,5),new THREE.MeshStandardMaterial({color:male?0x17333f:0x5a293d,roughness:.95,side:THREE.DoubleSide}));
  cape.userData.keepSeparate = true;
  cape.position.set(-.12,1.76,-.31); cape.rotation.y=.12; cape.rotation.z=male?-.08:.13; root.add(cape);
  // Quiver and feathered arrows visible over the shoulder.
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.78,8),actorMats.leather);
  quiver.position.set(-.34,2.17,-.3); quiver.rotation.z=-.17; root.add(quiver);
  for(let i=0;i<3;i++){
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.9,5),actorMats.arrowWood);
    arrow.position.set(-.37+i*.07,2.55,-.28); arrow.rotation.z=.16; root.add(arrow);
  }
  const bow = makeBow(dir, state.angle * Math.PI / 180);
  bow.userData.keepSeparate = true;
  bow.position.set(dir*.91,2.63,.32);
  bow.rotation.y=-yaw;
  root.add(bow);
  const launchPoint = new THREE.Object3D();
  launchPoint.position.set(dir*1.02,2.63,.38);
  root.add(launchPoint);

  root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; }});
  mergeCharacterMeshes(root);
  scene.add(root);
  return {
    side, dir, root, bow, launchPoint, head, cape, baseY: platformSurfaceY,
    name: male?'RAVEN':'VEXA', hp:100, hitUntil:0, phase:random()*6.28,
    hits:0, damage:0
  };
}
const actors = [makeCharacter(0), makeCharacter(1)];

function makeProjectile(side, type) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.026,.035,1.02,7),actorMats.arrowWood);
  shaft.rotation.z=-Math.PI/2; shaft.position.x=0; group.add(shaft);
  const tipMaterial = type==='ember' ? emberMat : type==='frost' ? crystalMat : goldMetal;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.095,.26,6),tipMaterial);
  tip.rotation.z=-Math.PI/2; tip.position.x=.58; group.add(tip);
  const fletchMaterial = type==='ember' ? emberMat : type==='frost' ? crystalMat : actorMats.feather;
  for(let i=0;i<2;i++){
    const fletch = new THREE.Mesh(new THREE.BoxGeometry(.2,.045,.025),fletchMaterial);
    fletch.position.set(-.38,.055*(i===0?1:-1),.015); fletch.rotation.z=.24*(i===0?1:-1); group.add(fletch);
  }
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  scene.add(group);
  return group;
}

const trailMat = new THREE.LineDashedMaterial({ color: 0xffe0a7, transparent:true, opacity:.75, dashSize:.17, gapSize:.12, scale:1, depthWrite:false });
const trajectory = new THREE.Line(new THREE.BufferGeometry(),trailMat);
trajectory.frustumCulled = false;
trajectory.visible = false;
scene.add(trajectory);

// A tiny fixed-size dynamic buffer avoids allocating new trail geometry every rendered frame.
const flightTrailGeometry = new THREE.BufferGeometry();
const flightTrailPositions = new Float32Array(8 * 3);
const flightTrailAttribute = new THREE.BufferAttribute(flightTrailPositions, 3);
flightTrailAttribute.setUsage(THREE.DynamicDrawUsage);
flightTrailGeometry.setAttribute('position', flightTrailAttribute);
flightTrailGeometry.setDrawRange(0, 0);
const flightTrailMaterial = new THREE.LineBasicMaterial({ color: 0xffe0a7, transparent: true, opacity: .68, depthWrite: false });
const flightTrail = new THREE.Line(flightTrailGeometry, flightTrailMaterial);
flightTrail.frustumCulled = false;
flightTrail.visible = false;
scene.add(flightTrail);

const arrowLight = new THREE.PointLight(0xffce91, .8, 3.5);
scene.add(arrowLight);

const sparkGeo = new THREE.SphereGeometry(.055,6,5);
const sparkMats = [
  new THREE.MeshBasicMaterial({color:0xffd7a0}),
  new THREE.MeshBasicMaterial({color:0x6ce9d8}),
  new THREE.MeshBasicMaterial({color:0xff805e}),
  new THREE.MeshBasicMaterial({color:0xf4f0d4})
];
const sparks = [];

function spawnSparks(pos, colorType, count) {
  const base = colorType==='ember'?2:colorType==='frost'?1:0;
  for(let i=0;i<count;i++){
    const mesh=new THREE.Mesh(sparkGeo,sparkMats[(base+(i%2))%sparkMats.length]);
    mesh.position.copy(pos); scene.add(mesh);
    sparks.push({mesh,v:new THREE.Vector3((random()-.5)*5,random()*4.8+.5,(random()-.5)*2),life:.42+random()*.52});
  }
}
const dustMotes=[];
const moteGeo = new THREE.SphereGeometry(.035,5,4);
const moteMaterial = new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.58,depthWrite:false});
const moteCount=30;
const moteInstanced=new THREE.InstancedMesh(moteGeo,moteMaterial,moteCount);
const moteDummy=new THREE.Object3D();
for(let i=0;i<moteCount;i++){
  const mote={x:(random()-.5)*26,y:-1+random()*9,z:-2.5-random()*5,seed:random()*9,rate:.08+random()*.18,scale:.7+random()*1.5};
  dustMotes.push(mote);
  moteDummy.position.set(mote.x,mote.y,mote.z);moteDummy.scale.setScalar(mote.scale);moteDummy.updateMatrix();
  moteInstanced.setMatrixAt(i,moteDummy.matrix);
  moteInstanced.setColorAt(i,new THREE.Color(i%3===0?0x63e0ce:i%3===1?0xffa36e:0xf4e8d0));
}
moteInstanced.instanceMatrix.needsUpdate=true;
scene.add(moteInstanced);
function animateMotes(dt) {
  for(let i=0;i<dustMotes.length;i++){
    const m=dustMotes[i];
    const y=m.y+Math.sin(state.time*m.rate+m.seed)*.1;
    const x=m.x+Math.cos(state.time*m.rate*.8+m.seed)*.05;
    moteDummy.position.set(x,y,m.z);moteDummy.scale.setScalar(m.scale);moteDummy.updateMatrix();
    moteInstanced.setMatrixAt(i,moteDummy.matrix);
  }
  moteInstanced.instanceMatrix.needsUpdate=true;
}

let audioCtx = null;
function sound(freq, duration, wave, volume, endFreq) {
  if(state.muted) return;
  try{
    audioCtx=audioCtx||(window.AudioContext?new AudioContext():null);
    if(!audioCtx) return;
    if(audioCtx.state==='suspended') audioCtx.resume();
    const now=audioCtx.currentTime;
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.type=wave||'sine'; osc.frequency.setValueAtTime(freq,now);
    if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+duration);
    gain.gain.setValueAtTime(volume||.06,now); gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now+duration+.015);
  }catch(e){}
}
function soundFire(){ sound(220,.2,'triangle',.055,75); sound(720,.09,'sawtooth',.018,290); }
function soundHit(headshot){ sound(headshot?155:110,headshot ? .32 : .2,'sine',headshot ? .12 : .085,headshot ? 48 : 55); sound(headshot?880:460,.16,'triangle',headshot ? .065 : .03,headshot ? 1500 : 170); }
function setMuted(value) {
  state.muted=value;
  try{localStorage.setItem('bowbrawl.muted',value?'1':'0');}catch(e){}
  ui.muteBtn.textContent=value?'♫̸':'♫';
  ui.muteBtn.setAttribute('aria-label',value?'Enable sound':'Mute sound');
  ui.muteBtn.classList.toggle('muted',value);
}
try{setMuted(localStorage.getItem('bowbrawl.muted')==='1');}catch(e){setMuted(false);}

function showMessage(text, style) {
  ui.msg.className='event-callout'+(style?' '+style:'');
  ui.msg.textContent=text;
  void ui.msg.offsetWidth;
  ui.msg.classList.add('show');
}
function setAim(angle, power) {
  state.angle=clamp(Math.round(angle),5,70);
  state.power=clamp(Math.round(power),20,100);
  ui.angle.value=String(state.angle); ui.power.value=String(state.power);
  ui.angleVal.textContent=state.angle+'°'; ui.powerVal.textContent=state.power+'%';
  updateBowPose(actors[0], state.angle);
  updateTrajectory();
}
function updateBowPose(actor, angle) {
  if(!actor || !actor.bow) return;
  const radians=angle*Math.PI/180;
  actor.bow.rotation.z=actor.dir>0?radians*.84:-radians*.84;
}
function arrowSpeed(power) { return 6.2 + power*.126; }
function getLaunch(actor) {
  const p=new THREE.Vector3();
  actor.launchPoint.getWorldPosition(p);
  p.x+=actor.dir*.15;
  return p;
}
function calculateTrajectory(actor, angle, power, count) {
  const start=getLaunch(actor);
  const tAngle=angle*Math.PI/180;
  const speed=arrowSpeed(power);
  const dx=actor.dir*speed*Math.cos(tAngle);
  const vy=speed*Math.sin(tAngle);
  const pts=[];
  for(let i=0;i<count;i++){
    const t=i*.065;
    const x=start.x+dx*t+state.wind*.065*t*t;
    const y=start.y+vy*t-.5*9.5*t*t;
    pts.push(new THREE.Vector3(x,y,start.z));
    if(y<-.2||Math.abs(x)>13) break;
  }
  return pts;
}
function updateTrajectory() {
  if(!trajectory) return;
  const enabled=state.screen==='play' && state.turn==='player' && !state.projectile && !state.autoPilot;
  trajectory.visible=enabled;
  if(!enabled) return;
  const points=calculateTrajectory(actors[0],state.angle,state.power,34);
  trajectory.geometry.dispose();
  trajectory.geometry=new THREE.BufferGeometry().setFromPoints(points);
  trajectory.computeLineDistances();
}
function updateHud() {
  document.getElementById('gameRoot').classList.toggle('menu-open', state.screen === 'menu');
  ui.hpL.style.width=clamp(actors[0].hp,0,100)+'%';
  ui.hpR.style.width=clamp(actors[1].hp,0,100)+'%';
  ui.hpLT.textContent=Math.ceil(actors[0].hp);
  ui.hpRT.textContent=Math.ceil(actors[1].hp);
  ui.round.textContent=String(state.round).padStart(2,'0');
  ui.wind.textContent='WIND · '+(state.wind>=0?'+':'−')+Math.abs(state.wind).toFixed(1);
  ui.windGlyph.textContent=state.wind>=0?'➜':'➜';
  ui.windGlyph.style.transform=state.wind>=0?'scaleX(1)':'scaleX(-1)';
  ui.leftStatus.textContent=actors[0].hp<30?'WOUNDED':state.turn==='player'?'READY':'WAITING';
  ui.rightStatus.textContent=actors[1].hp<30?'WOUNDED':state.turn==='enemy'?'DRAWING':'WAITING';
  ui.turn.textContent=state.turn==='player'?'YOUR TURN':state.turn==='enemy'?'VEXA’S TURN':state.turn==='flight'?'ARROW IN FLIGHT':'DUEL COMPLETE';
  ui.turnBanner.classList.toggle('enemy-turn',state.turn==='enemy');
  ui.controls.classList.toggle('disabled',state.screen!=='play'||state.turn!=='player'||!!state.projectile||state.autoPilot);
  ui.fire.disabled=state.screen!=='play'||state.turn!=='player'||!!state.projectile||state.autoPilot;
  ui.aimHint.classList.toggle('hidden',state.screen!=='play'||state.turn!=='player'||!!state.projectile||state.autoPilot);
  ui.fireSub.textContent=state.turn==='enemy'?'OPPONENT IS AIMING':state.projectile?'ARROW IN FLIGHT':'LOOSE YOUR ARROW';
  updateTrajectory();
}
function setArrowType(type) {
  state.selectedArrow=type;
  for(const b of ui.arrowOptions) {
    const active=b.dataset.arrow===type;
    b.classList.toggle('selected',active);
    b.setAttribute('aria-pressed',active?'true':'false');
  }
  const tint=type==='ember'?0xffa064:type==='frost'?0x8deaff:0xffe3b4;
  trailMat.color.setHex(tint);
  updateTrajectory();
}
function updateWind() {
  state.wind=(random()*2-1)*4.2;
}
function resetActor(actor) {
  actor.hp=100; actor.hits=0; actor.damage=0; actor.hitUntil=0;
  actor.root.rotation.z=0; actor.root.position.y=actor.baseY;
}

function startMatch() {
  state.screen='play'; state.turn='player'; state.round=1; state.pending=0;
  state.aiWait=0; state.autoWait = state.autoPilot ? .7 : 0; state.resetWait=0;
  state.projectile=null; state.totalDamage=0; state.headshots=0; state.streak=0;
  state.bestStreak=0; state.shots=0; state.lastHit='';
  resetActor(actors[0]); resetActor(actors[1]); updateWind(); setAim(23,56); setArrowType(state.selectedArrow);
  ui.menu.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.victory.classList.add('hidden');
  ui.aimHint.classList.remove('hidden'); updateHud();
  if(state.autoPilot){ actors[0].hp=76; actors[1].hp=68; state.totalDamage=32; state.headshots=1; updateHud(); }
}
function showMenu() {
  state.screen='menu'; state.turn='player'; state.projectile&&scene.remove(state.projectile.mesh); state.projectile=null;
  ui.menu.classList.remove('hidden'); ui.pause.classList.add('hidden'); ui.victory.classList.add('hidden');
  ui.aimHint.classList.add('hidden'); updateHud();
}
function pauseGame() {
  if(state.screen==='play' && !state.autoPilot) {
    state.screen='paused'; ui.pause.classList.remove('hidden'); ui.aimHint.classList.add('hidden'); updateHud();
  }
}
function resumeGame() {
  if(state.screen==='paused') {
    state.screen='play'; ui.pause.classList.add('hidden'); updateHud();
  }
}
function backAction() {
  if(state.screen==='paused'){resumeGame();return true;}
  if(state.screen==='play'&&!state.autoPilot){pauseGame();return true;}
  if(state.screen==='menu') return false;
  if(state.screen==='over'){showMenu();return true;}
  return false;
}
onBack(backAction);
onPauseResume(()=>{if(state.screen==='play')pauseGame();},()=>{});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.screen==='play')pauseGame();});

function chooseAIShot(actor, target) {
  const launch=getLaunch(actor);
  const signedDistance=target.root.position.x-launch.x;
  const dx=Math.abs(signedDistance);
  const targetY=target.root.position.y+2.62;
  let best={score:Infinity,angle:23,power:56};
  for(let angle=7;angle<=66;angle+=1) {
    const rad=angle*Math.PI/180;
    for(let power=24;power<=100;power+=2) {
      const speed=arrowSpeed(power);
      let t=dx/Math.max(.1,speed*Math.cos(rad));
      // Solve the horizontal wind drift iteratively, then score the actual ballistic height.
      for(let it=0;it<3;it++) {
        const alongWind=actor.dir*state.wind*.065*t;
        t=dx/Math.max(.1,speed*Math.cos(rad)+alongWind);
      }
      const y=launch.y+speed*Math.sin(rad)*t-.5*9.5*t*t;
      const error=Math.abs(y-targetY);
      const score=error + power*.002 + Math.abs(angle-25)*.0015;
      if(score<best.score) best={score,angle,power};
    }
  }
  const difficulty=.9;
  best.angle=clamp(best.angle+(random()-.5)*3.5*difficulty,5,70);
  best.power=clamp(best.power+(random()-.5)*6*difficulty,20,100);
  return best;
}

function shoot(side, automated) {
  if(state.screen!=='play'||state.projectile) return;
  if(!automated && (state.turn!=='player'||state.autoPilot)) return;
  const actor=actors[side], target=actors[1-side];
  if(side===1 || state.autoPilot) {
    const aim=chooseAIShot(actor,target);
    actor.angle=aim.angle; actor.power=aim.power; updateBowPose(actor,aim.angle);
  } else { actor.angle=state.angle; actor.power=state.power; }
  const angle=actor.angle*Math.PI/180, speed=arrowSpeed(actor.power);
  const pos=getLaunch(actor);
  const arrowType = side === 0 ? state.selectedArrow : (random() < .14 ? 'ember' : random() < .12 ? 'frost' : 'standard');
  const mesh=makeProjectile(side,arrowType);
  mesh.position.copy(pos); mesh.position.z=pos.z;
  const vel=new THREE.Vector3(actor.dir*speed*Math.cos(angle),speed*Math.sin(angle),0);
  state.projectile={
    mesh, vel, side, type:arrowType, age:0, lastPos:pos.clone(),
    trail:Array.from({length:8},()=>new THREE.Vector3()), trailCount:0, trailCursor:0,
    wind:state.wind
  };
  flightTrailMaterial.color.setHex(arrowType==='ember'?0xff9a53:arrowType==='frost'?0x8deaff:0xffe0a7);
  flightTrail.geometry.setDrawRange(0,0);
  flightTrail.visible=false;
  state.turn='flight'; state.shots++;
  trajectory.visible=false; ui.aimHint.classList.add('hidden'); updateHud();
  soundFire(); haptic(18);
  // A small tension snap is visible before the arrow crosses the frame.
  showMessage(side===0?'DRAW. RELEASE.':'COUNTERSHOT',side===0?'':'damage');
}
function actorSurfaceAt(x) {
  if(x>-10.65&&x<-1.9) return platformSurfaceY;
  if(x>1.9&&x<10.65) return platformSurfaceY;
  return -100;
}
function hitActor(projectile, actor) {
  const p=projectile.mesh.position;
  const previous=projectile.lastPos;
  const centerX=actor.root.position.x;
  const minX=Math.min(previous.x,p.x), maxX=Math.max(previous.x,p.x);
  if(minX>centerX+.58 || maxX<centerX-.58) return false;
  const segmentX=p.x-previous.x;
  const crossT=Math.abs(segmentX)<.0001?1:clamp((centerX-previous.x)/segmentX,0,1);
  const hitY=lerp(previous.y,p.y,crossT);
  const hitZ=lerp(previous.z,p.z,crossT);
  if(hitY < actor.root.position.y+1.1 || hitY > actor.root.position.y+4.05) return false;
  if(Math.abs(hitZ-actor.root.position.z)>1.45) return false;
  const headshot=hitY>actor.root.position.y+3.02 && hitY<actor.root.position.y+3.8;
  const baseDamage=projectile.type==='ember'?32:projectile.type==='frost'?21:26;
  const damage=Math.round(headshot?baseDamage*1.75:baseDamage);
  actor.hp=clamp(actor.hp-damage,0,100);
  actor.hits++; actor.damage+=damage; state.totalDamage+=damage;
  if(headshot){state.headshots++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);}
  else state.streak=0;
  actor.hitUntil=state.time+.72;
  actor.root.rotation.z=actor.side===0?-.07:.07;
  state.hitStop = headshot ? .15 : .07;
  state.cameraKick=.22;
  const point=new THREE.Vector3(centerX,hitY,hitZ+.1);
  spawnSparks(point,projectile.type,headshot?34:22);
  const hitLabel = headshot ? 'HEADSHOT!' : projectile.type === 'ember' ? 'EMBER HIT!' : projectile.type === 'frost' ? 'FROST HIT!' : 'SOLID HIT!';
  showMessage(hitLabel + '  −' + damage, headshot ? '' : 'damage');
  soundHit(headshot); haptic(headshot?42:24);
  if(headshot) sound(1040,.22,'triangle',.055,520);
  updateHud();
  endProjectile(true, actor);
  if(actor.hp<=0) endMatch(1-actor.side);
  return true;
}
function endProjectile(hit, target) {
  const shot = state.projectile;
  if (!shot) return;
  scene.remove(shot.mesh);
  shot.mesh.traverse(o => { if (o.geometry && o.geometry !== sparkGeo) o.geometry.dispose?.(); });
  state.projectile = null;
  flightTrail.visible = false;
  flightTrail.geometry.setDrawRange(0, 0);
  arrowLight.intensity = 0;
  if (state.screen === 'over') return;

  // Turns are determined by the arrow that actually fired, not by hit/miss outcome.
  const nextSide = 1 - shot.side;
  state.lastFiredSide = shot.side;
  state.pending = 0;
  state.turn = nextSide === 0 ? 'player' : 'enemy';
  if (nextSide === 0) {
    state.round++;
    updateWind();
    if (!state.autoPilot) showMessage('YOUR MOVE', 'damage');
  } else if (!state.autoPilot) {
    state.aiWait = .72;
  }
  if (state.autoPilot) state.autoWait = .72;
  updateHud();
}
function impactMiss(p) {
  spawnSparks(p,state.projectile?state.projectile.type:'standard',10);
  showMessage('MISS','damage');
  sound(320,.12,'triangle',.035,180);
  endProjectile(false,null);
}
function endMatch(winnerSide) {
  state.screen='over'; state.turn='over'; state.projectile&&scene.remove(state.projectile.mesh); state.projectile=null;
  trajectory.visible=false; ui.victory.classList.remove('hidden'); ui.pause.classList.add('hidden');
  ui.winner.textContent=winnerSide===0?'VICTORY':'DEFEAT';
  ui.resultEyebrow.textContent=winnerSide===0?'SKYFALL CHAMPION':'A WORTHY RIVAL';
  ui.resultLine.textContent=winnerSide===0?'The sky remembers your shot.':'Every legend starts with a harder duel.';
  ui.resultSigil.textContent=winnerSide===0?'✦':'⚔';
  ui.headshots.textContent=String(state.headshots).padStart(2,'0');
  ui.damage.textContent=String(state.totalDamage).padStart(3,'0');
  ui.streak.textContent=String(state.bestStreak).padStart(2,'0');
  try{
    const old=Number(localStorage.getItem('archer.bestDamage')||0);
    if(state.totalDamage>old)localStorage.setItem('archer.bestDamage',String(state.totalDamage));
  }catch(e){}
  sound(winnerSide===0?740:175,.38,'triangle',.085,winnerSide===0?1100:80);
  updateHud();
  if(state.autoPilot) state.resetWait=2.1;
}

function tickProjectile(dt) {
  const p=state.projectile;
  if(!p) return;
  p.age+=dt;
  p.lastPos.copy(p.mesh.position);
  p.vel.x+=p.wind*.13*dt;
  p.vel.y-=9.5*dt;
  p.mesh.position.addScaledVector(p.vel,dt);
  p.mesh.rotation.z=Math.atan2(p.vel.y,p.vel.x);
  p.mesh.rotation.y=Math.sin(p.age*2)*.035;
  arrowLight.position.copy(p.mesh.position); arrowLight.intensity=.75;
  p.trail[p.trailCursor].copy(p.mesh.position);
  p.trailCursor=(p.trailCursor+1)%p.trail.length;
  p.trailCount=Math.min(p.trailCount+1,p.trail.length);
  for(let i=0;i<p.trailCount;i++){
    const index=(p.trailCursor-p.trailCount+i+p.trail.length)%p.trail.length;
    const v=p.trail[index];
    flightTrailAttribute.setXYZ(i,v.x,v.y,v.z);
  }
  flightTrailAttribute.needsUpdate=true;
  flightTrail.geometry.setDrawRange(0,p.trailCount);
  flightTrail.visible=p.trailCount>1;
  const target=actors[1-p.side];
  if(hitActor(p,target)) return;
  const surface=actorSurfaceAt(p.mesh.position.x);
  if(surface>-50 && p.mesh.position.y<surface+.12) {
    const point=p.mesh.position.clone(); point.y=surface+.1;
    spawnSparks(point,p.type,11); sound(185,.1,'triangle',.035,90);
    showMessage('DUST & STONE','damage'); endProjectile(false,null); return;
  }
  if(p.mesh.position.y < -4.6 || Math.abs(p.mesh.position.x)>13.4 || p.age>4.3) {
    const point=p.mesh.position.clone(); spawnSparks(point,p.type,8); impactMiss(point); return;
  }
  if(p.age>.22) ui.aimHint.classList.add('hidden');
}
function advanceGame(dt) {
  if (state.hitStop > 0) {
    state.hitStop = Math.max(0, state.hitStop - dt);
    dt *= .18;
  }
  state.time+=dt;
  if(state.screen==='play') {
    if(state.projectile) tickProjectile(dt);
    else if(state.turn==='enemy' && state.aiWait>0) {
      state.aiWait-=dt;
      if(state.aiWait<=0) shoot(1,true);
    } else if(state.autoPilot && state.turn!=='flight' && state.autoWait>0) {
      state.autoWait-=dt;
      if(state.autoWait<=0 && state.turn!=='over') shoot(state.turn==='player'?0:1,true);
    }
  } else if(state.screen==='over' && state.autoPilot && state.resetWait>0) {
    state.resetWait-=dt;
    if(state.resetWait<=0) startMatch();
  }

  for(let i=sparks.length-1;i>=0;i--){
    const s=sparks[i]; s.life-=dt;
    s.mesh.position.addScaledVector(s.v,dt); s.v.y-=5.7*dt;
    s.mesh.scale.setScalar(Math.max(.015,s.life));
    if(s.life<=0){scene.remove(s.mesh);sparks.splice(i,1);}
  }
  animateClouds(dt);
  animateMotes(dt);
  for(const actor of actors){
    const idle=Math.sin(state.time*1.75+actor.phase)*.032;
    actor.root.position.y=actor.baseY+idle;
    actor.cape.rotation.z=(actor.side===0?-.08:.13)+Math.sin(state.time*2.2+actor.phase)*.07;
    const hit=state.time<actor.hitUntil;
    actor.root.rotation.z=hit?(actor.side===0?-.07:.07):Math.sin(state.time*1.4+actor.phase)*.008;
  }
  if(state.cameraKick>0){
    state.cameraKick=Math.max(0,state.cameraKick-dt);
    camera.position.x=(random()-.5)*state.cameraKick*1.8;
  } else camera.position.x=0;
  // Trajectory updates only when aim, wind, or turn state changes; no geometry churn per frame.
}
let previousTime=0, fpsWindowStart=0, fpsFrames=0;
window.__fps = 60;
function animate(now) {
  requestAnimationFrame(animate);
  let dt = previousTime ? (now - previousTime) / 1000 : 1 / 60;
  previousTime = now;
  dt = state.fixedStep ? 1 / 60 : Math.min(Math.max(dt, 0), .033);
  if (!state.disposed && state.screen !== 'paused') advanceGame(dt);
  renderer.render(scene, camera);
  fpsFrames++;
  if (!fpsWindowStart) fpsWindowStart = now;
  if (now - fpsWindowStart >= 600) {
    window.__fps = Math.round(fpsFrames * 1000 / Math.max(1, now - fpsWindowStart));
    ui.fps.textContent = window.__fps + ' FPS · SKYFALL';
    fpsFrames = 0;
    fpsWindowStart = now;
  }
}

ui.angle.addEventListener('input',()=>setAim(Number(ui.angle.value),state.power));
ui.power.addEventListener('input',()=>setAim(state.angle,Number(ui.power.value)));
for(const b of ui.arrowOptions)b.addEventListener('click',()=>setArrowType(b.dataset.arrow));
ui.fire.addEventListener('click',()=>shoot(0,false));
ui.start.addEventListener('click',()=>{state.autoPilot=false;startMatch();});
ui.rematch.addEventListener('click',()=>{state.autoPilot=false;startMatch();});
ui.resume.addEventListener('click',resumeGame);
ui.pauseBtn.addEventListener('click',pauseGame);
ui.home.addEventListener('click',goHome);
ui.pauseHome.addEventListener('click',goHome);
ui.resultHome.addEventListener('click',goHome);
ui.muteBtn.addEventListener('click',()=>setMuted(!state.muted));

let drag=null;
canvas.addEventListener('pointerdown',e=>{
  if(state.screen!=='play'||state.turn!=='player'||state.projectile||state.autoPilot)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:state.angle,power:state.power,moved:false};
  try{canvas.setPointerCapture(e.pointerId);}catch(err){}
});
canvas.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>7)drag.moved=true;
  if(drag.moved){
    const scale=window.innerHeight/600;
    setAim(drag.angle-dy*.34/Math.max(.7,scale),drag.power-dx*.22/Math.max(.7,scale));
  }
});
function finishDrag(e){
  if(!drag||drag.id!==e.pointerId)return;
  if(drag.moved) sound(560,.045,'sine',.018,430);
  drag=null;
}
canvas.addEventListener('pointerup',finishDrag);
canvas.addEventListener('pointercancel',()=>{drag=null;});
window.addEventListener('keydown',e=>{
  if(e.repeat)return;
  if(e.code==='Space'){e.preventDefault();if(state.screen==='play')shoot(0,false);}
  if(e.key.toLowerCase()==='p'||e.key==='Escape')backAction();
  if(e.key.toLowerCase()==='r'&&state.screen!=='menu'){state.autoPilot=false;startMatch();}
  if(e.key==='1')setArrowType('standard');
  if(e.key==='2')setArrowType('ember');
  if(e.key==='3')setArrowType('frost');
});
window.addEventListener('resize',()=>{
  const aspect=window.innerWidth/Math.max(1,window.innerHeight);
  const h=11.3;
  camera.left=-h*aspect/2; camera.right=h*aspect/2; camera.top=h/2; camera.bottom=-h/2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  sunLight.shadow.mapSize.set(1024,1024);
  updateTrajectory();
});

window.__game = {
  state,
  actors,
  shoot:()=>shoot(0,false),
  setAim:(a,p)=>setAim(a,p),
  start:startMatch,
  pause:pauseGame,
  // Deterministic fixed-step hook lets headless CI cover multi-second projectile paths
  // without confusing slow software-WebGL rendering with game-clock progress.
  step:(frames=1)=>{
    const count=clamp(Math.floor(Number(frames)||1),1,3600);
    for(let i=0;i<count;i++) advanceGame(1/60);
    return {screen:state.screen,turn:state.turn,round:state.round,shots:state.shots,
      playerHp:actors[0].hp,enemyHp:actors[1].hp,headshots:state.headshots};
  },
  getSnapshot:()=>({screen:state.screen,turn:state.turn,round:state.round,angle:state.angle,power:state.power,wind:state.wind,playerHp:actors[0].hp,enemyHp:actors[1].hp,shots:state.shots,headshots:state.headshots}),
  buildTag:'skyfall-visual-rebuild-r2'
};

updateHud();
const requestedScene=params.get('scene');
if(requestedScene==='play'||state.autoPilot){
  state.autoPilot=params.get('autoplay')==='1';
  startMatch();
  if(requestedScene==='play'&&!state.autoPilot)state.autoWait=0;
  if(state.autoPilot){
    if(params.has('warp')){
      const warpSeconds=clamp(Number(params.get('warp'))||0,0,55);
      for(let i=0;i<Math.floor(warpSeconds*60);i++)advanceGame(1/60);
    }
  }
}else if(requestedScene==='over'){
  startMatch(); actors[0].hp=42; actors[1].hp=0; endMatch(0);
}else{
  state.screen='menu';
  ui.aimHint.classList.add('hidden');
  updateHud();
}
requestAnimationFrame(animate);
