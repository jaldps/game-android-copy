import * as THREE from '../../lib/three.module.js';

export function buildTerrain(scene, quality='high'){
  const geo = new THREE.PlaneGeometry(200, 200, 40, 40);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    // Simple rolling hills
    const h = Math.sin(x*0.05)*3 + Math.cos(z*0.07)*2 + Math.sin((x+z)*0.03)*4;
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({color:0x3f8f4a, roughness:0.85, metalness:0.0});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function surfaceY(x,z){
  return Math.sin(x*0.05)*3 + Math.cos(z*0.07)*2 + Math.sin((x+z)*0.03)*4;
}

export function addCrater(x,z,r,d){}
