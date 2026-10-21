// terrain.js
import * as THREE from '../../lib/three.module.js';
import { mat } from './materials.js';

const SIZE = 200;
const SEGS = 120;
let terrainMesh = null;
const craters = [];

function heightAt(x, z){
  let h = 0;
  h += Math.sin(x*0.05)*4 + Math.cos(z*0.07)*3;
  h += Math.sin((x+z)*0.03)*6;
  h += Math.cos(x*0.12)*2 + Math.sin(z*0.11)*2;
  const d = Math.abs(x);
  h -= Math.max(0, 8 - d*0.15);
  h += Math.exp(-Math.pow((x-70)/18,2))*18;
  h += Math.exp(-Math.pow((x+70)/18,2))*18;
  for(const c of craters){
    const dx=x-c.x, dz=z-c.z;
    const dd=Math.sqrt(dx*dx+dz*dz);
    if(dd < c.r){ h -= (1 - dd/c.r)*c.depth; }
  }
  return h;
}

export function buildTerrain(scene){
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    pos.setY(i, heightAt(x,z));
  }
  geo.computeVertexNormals();
  terrainMesh = new THREE.Mesh(geo, mat.grass.clone());
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
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
