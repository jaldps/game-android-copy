// main.js
import * as THREE from '../../lib/three.module.js';
import { createRenderer, createScene, createCamera, createComposer, handleResize } from './render.js';
import { buildTerrain, surfaceY, addCrater } from './terrain.js';
import { buildArcher } from './characters.js';
import { mat } from './materials.js';
import { store } from './store.js';
import { beep } from './audio.js';
import { clamp, rand } from './util.js';

const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera();
const composer = createComposer(renderer, scene, camera);

buildTerrain(scene);

const platGeo = new THREE.BoxGeometry(6, 1, 6);
const p1 = new THREE.Mesh(platGeo, mat.platform.clone());
p1.position.set(-60, surfaceY(-60,0)+0.5, 0);
p1.castShadow = true; p1.receiveShadow = true;
scene.add(p1);
const p2 = new THREE.Mesh(platGeo, mat.platform.clone());
p2.position.set(60, surfaceY(60,0)+0.5, 0);
p2.castShadow = true; p2.receiveShadow = true;
scene.add(p2);

const archerL = buildArcher(scene, {female:false});
archerL.position.set(-60, surfaceY(-60,0)+1, 0);
const archerR = buildArcher(scene, {female:true});
archerR.position.set(60, surfaceY(60,0)+1, 0);
archerR.rotation.y = Math.PI;

const G = {
  turn: 0,
  hp: [100,100],
  wind: (Math.random()-0.5)*6,
  angle: 45,
  power: 60,
  arrows: [],
  flying: false,
  gameOver: false,
};

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

angleSlider.addEventListener('input', ()=>{ G.angle = +angleSlider.value; angleVal.textContent = G.angle; });
powerSlider.addEventListener('input', ()=>{ G.power = +powerSlider.value; powerVal.textContent = G.power; });

function updateHUD(){
  hpL.style.width = G.hp[0]+'%';
  hpR.style.width = G.hp[1]+'%';
  windEl.textContent = 'Wind: '+G.wind.toFixed(1);
  turnEl.textContent = 'Turn: '+(G.turn===0?'Left':'Right');
}

function fire(){
  if(G.flying || G.gameOver) return;
  const fromLeft = G.turn===0;
  const startX = fromLeft? -60 : 60;
  const startY = surfaceY(startX,0)+2;
  const dir = fromLeft? 1 : -1;
  const a = G.angle*Math.PI/180;
  const speed = G.power*0.6;
  const vx = Math.cos(a)*speed*dir;
  const vy = Math.sin(a)*speed;
  const vz = 0;
  const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.2,8), mat.arrow.clone());
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08,0.25,8), mat.arrowTip.clone());
  tip.position.y = 0.7;
  arrow.add(tip);
  arrow.position.set(startX, startY, 0);
  scene.add(arrow);
  G.arrows.push({mesh:arrow, vx,vy,vz, alive:true, fromLeft});
  G.flying = true;
  beep(600,0.08);
}

fireBtn.addEventListener('click', fire);

const aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0xffff00}));
scene.add(aimLine);

function updateAimIndicator(){
  const fromLeft = G.turn===0;
  const sx = fromLeft? -60:60;
  const sy = surfaceY(sx,0)+2;
  const a = G.angle*Math.PI/180;
  const dir = fromLeft?1:-1;
  const pts = [];
  for(let i=0;i<8;i++){
    const t=i*0.15;
    const x=sx+Math.cos(a)*t*20*dir;
    const y=sy+Math.sin(a)*t*20 - 0.5*9.8*t*t*0.5;
    pts.push(new THREE.Vector3(x,y,0));
    if(y < surfaceY(x,0)) break;
  }
  aimLine.geometry.setFromPoints(pts);
}

let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  let dt = (now-last)/1000;
  last = now;
  dt = Math.max(0, Math.min(dt, 1/30));

  for(const ar of G.arrows){
    if(!ar.alive) continue;
    ar.vy -= 9.8*dt;
    ar.vx += G.wind*0.3*dt;
    ar.mesh.position.x += ar.vx*dt;
    ar.mesh.position.y += ar.vy*dt;
    ar.mesh.position.z += ar.vz*dt;
    const v = new THREE.Vector3(ar.vx,ar.vy,ar.vz);
    if(v.length()>0.01){
      ar.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), v.clone().normalize());
    }
    const ySurf = surfaceY(ar.mesh.position.x, ar.mesh.position.z);
    if(ar.mesh.position.y <= ySurf){
      ar.alive = false;
      scene.remove(ar.mesh);
      addCrater(ar.mesh.position.x, ar.mesh.position.z, 4, 3);
      const target = ar.fromLeft? archerR : archerL;
      const d = target.position.distanceTo(ar.mesh.position);
      if(d < 2.5){
        const dmg = 20 + Math.round((Math.abs(ar.vx)+Math.abs(ar.vy))*0.5);
        const idx = ar.fromLeft?1:0;
        G.hp[idx] = Math.max(0, G.hp[idx]-dmg);
        beep(220,0.2);
        target.position.x += ar.fromLeft? 2 : -2;
        if(G.hp[idx]<=0){ G.gameOver=true; msg.textContent = (ar.fromLeft?'Left':'Right')+' wins!'; }
      } else {
        beep(120,0.1);
      }
      G.flying = false;
      G.turn = 1 - G.turn;
      G.wind = (Math.random()-0.5)*6;
      updateHUD();
    }
    if(Math.abs(ar.mesh.position.x)>120){ ar.alive=false; scene.remove(ar.mesh); G.flying=false; G.turn=1-G.turn; updateHUD(); }
  }
  G.arrows = G.arrows.filter(a=>a.alive);

  updateAimIndicator();
  updateHUD();

  composer.render();
}
requestAnimationFrame(loop);

window.addEventListener('resize', ()=>handleResize(camera,renderer,composer));

updateHUD();
