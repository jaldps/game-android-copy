// terrain.js
import * as THREE from '../../lib/three.module.js';
import { mat } from './materials.js';

const SIZE = 200;
let terrainMesh = null;
const craters = [];

function hash2(x, z){
  let n = Math.sin(x*127.1 + z*311.7)*43758.5453;
  return n - Math.floor(n);
}
function noise2(x, z){
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx*fx*(3-2*fx), uz = fz*fz*(3-2*fz);
  const a = hash2(ix, iz), b = hash2(ix+1, iz), c = hash2(ix, iz+1), d = hash2(ix+1, iz+1);
  return (a*(1-ux)+b*ux)*(1-uz) + (c*(1-ux)+d*ux)*uz;
}
function fbm(x, z, oct=5){
  let v=0, amp=1, freq=1, sum=0;
  for(let i=0;i<oct;i++){ v += noise2(x*freq, z*freq)*amp; sum += amp; amp*=0.5; freq*=2.1; }
  return v/sum;
}
function ridges(x, z){
  let v = fbm(x*0.02, z*0.02, 4);
  v = 1 - Math.abs(v*2-1);
  return v*v;
}

function heightAt(x, z){
  let h = 0;
  // base rolling hills
  h += (fbm(x*0.012, z*0.012, 5)-0.5)*14;
  // mountains
  h += Math.exp(-Math.pow((x-70)/22,2)-Math.pow(z/30,2))*26;
  h += Math.exp(-Math.pow((x+70)/22,2)-Math.pow(z/30,2))*26;
  h += Math.exp(-Math.pow((x)/40,2)-Math.pow((z-70)/22,2))*22;
  h += Math.exp(-Math.pow((x)/40,2)-Math.pow((z+70)/22,2))*22;
  // ridges
  h += ridges(x*0.015, z*0.015)*10;
  // valleys along center corridor
  h -= Math.exp(-Math.pow(x/18,2))*3;
  // small detail
  h += (fbm(x*0.08, z*0.08, 3)-0.5)*2.5;
  // keep arena platforms flat-ish? mild
  const d = Math.abs(x);
  h -= Math.max(0, 6 - d*0.12);
  for(const c of craters){
    const dx=x-c.x, dz=z-c.z;
    const dd=Math.sqrt(dx*dx+dz*dz);
    if(dd < c.r){ h -= (1 - dd/c.r)*c.depth; }
  }
  return h;
}

function colorFor(h, slope){
  // low: dirt brown, mid: grass green, high: rock gray, peak: snow
  const c = new THREE.Color();
  if(h < 0){
    c.setRGB(0.42, 0.36, 0.28);
  } else if(h < 6){
    const t = h/6;
    c.setRGB(0.25 + t*0.1, 0.45 + t*0.15, 0.2);
  } else if(h < 16){
    const t = (h-6)/10;
    c.setRGB(0.35 + t*0.25, 0.45 + t*0.05, 0.25 + t*0.2);
  } else {
    const t = Math.min(1, (h-16)/10);
    c.setRGB(0.6 + t*0.35, 0.6 + t*0.35, 0.62 + t*0.33);
  }
  // slope darkens
  if(slope > 0.6){
    c.multiplyScalar(0.75);
  }
  return c;
}

export function buildTerrain(scene, quality='high'){
  const SEGS = quality==='low' ? 80 : 160;
  const grassCount = quality==='low' ? 1500 : 4000;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    const h = heightAt(x,z);
    pos.setY(i, h);
    // slope approx via neighbors? approximate with finite diff
    const eps=0.5;
    const hx = heightAt(x+eps,z)-heightAt(x-eps,z);
    const hz = heightAt(x,z+eps)-heightAt(x,z-eps);
    const slope = Math.min(1, Math.sqrt(hx*hx+hz*hz)/(eps*2));
    const c = colorFor(h, slope);
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const matT = mat.grass.clone();
  matT.vertexColors = true;
  terrainMesh = new THREE.Mesh(geo, matT);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // scatter rocks
  const rockMat = mat.rock.clone();
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for(let i=0;i<90;i++){
    const x = (Math.random()-0.5)*180;
    const z = (Math.random()-0.5)*180;
    const h = heightAt(x,z);
    if(h < 2) continue;
    const s = 0.6 + Math.random()*2.2;
    const m = new THREE.Mesh(rockGeo, rockMat);
    m.scale.set(s, s*(0.7+Math.random()*0.6), s);
    m.position.set(x, h + s*0.4, z);
    m.rotation.set(Math.random()*0.5, Math.random()*Math.PI*2, Math.random()*0.5);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }

  // grass patches
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4fa85a, roughness: 0.9, metalness: 0.0 });
  const bladeGeo = new THREE.ConeGeometry(0.05, 0.35, 4);
  const instCount = grassCount;
  const inst = new THREE.InstancedMesh(bladeGeo, grassMat, instCount);
  const m4 = new THREE.Matrix4();
  let placed = 0;
  for(let i=0;i<instCount*3 && placed<instCount;i++){
    const x = (Math.random()-0.5)*180;
    const z = (Math.random()-0.5)*180;
    const h = heightAt(x,z);
    if(h < 0 || h > 12) continue;
    const s = 0.6 + Math.random()*0.8;
    m4.makeScale(s, s*(0.8+Math.random()*0.6), s);
    m4.setPosition(x, h + 0.15*s, z);
    // random rotation
    const r = Math.random()*Math.PI*2;
    const rot = new THREE.Matrix4().makeRotationY(r);
    m4.multiply(rot);
    inst.setMatrixAt(placed, m4);
    placed++;
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = false;
  inst.receiveShadow = true;
  scene.add(inst);

  return terrainMesh;
}

export function surfaceY(x,z){ return heightAt(x,z); }
export function addCrater(x,z,r=4,depth=3){
  craters.push({x,z,r,depth});
  if(!terrainMesh) return;
  const geo = terrainMesh.geometry;
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const px=pos.getX(i), pz=pos.getZ(i);
    const dx=px-x, dz=pz-z;
    const dd=Math.sqrt(dx*dx+dz*dz);
    if(dd < r){
      pos.setY(i, pos.getY(i) - (1-dd/r)*depth);
    }
  }
  geo.computeVertexNormals();
  pos.needsUpdate = true;
}
export function getTerrainMesh(){ return terrainMesh; }
