// characters.js
import * as THREE from '../../lib/three.module.js';
import { mat } from './materials.js';

export function buildArcher(scene, opts={}){
  const g = new THREE.Group();
  const female = !!opts.female;
  const skinMat = mat.skin(female ? 0xf1c27d : 0xd9a066);
  const bodyMat = female ? mat.bikini.clone() : mat.cloth(0x3355aa).clone();

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.4,0.9,12), bodyMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);

  if(female){
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,10), bodyMat);
    chest.position.set(0,1.35,0.18);
    chest.scale.set(1.1,0.9,1.0);
    chest.castShadow=true;
    g.add(chest);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28,16,12), skinMat);
  head.position.y = 1.7;
  head.castShadow=true;
  g.add(head);

  const hairMat = new THREE.MeshStandardMaterial({color: female?0x8b4513:0x222222, roughness:0.9});
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3,16,12,0,Math.PI*2,0,Math.PI/2), hairMat);
  hair.position.y = 1.85;
  hair.castShadow=true;
  g.add(hair);

  const armGeo = new THREE.CylinderGeometry(0.08,0.09,0.8,8);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.45,1.0,0);
  leftArm.rotation.z = 0.3;
  leftArm.castShadow=true;
  g.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.45,1.0,0);
  rightArm.rotation.z = -0.3;
  rightArm.castShadow=true;
  g.add(rightArm);

  const legGeo = new THREE.CylinderGeometry(0.1,0.12,0.9,8);
  const leftLeg = new THREE.Mesh(legGeo, female?bodyMat:mat.cloth(0x222244).clone());
  leftLeg.position.set(-0.15,0.2,0);
  leftLeg.castShadow=true;
  g.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, female?bodyMat:mat.cloth(0x222244).clone());
  rightLeg.position.set(0.15,0.2,0);
  rightLeg.castShadow=true;
  g.add(rightLeg);

  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.04,8,16,Math.PI), mat.wood.clone());
  bow.position.set(0.55,1.0,0.2);
  bow.rotation.y = Math.PI/2;
  bow.castShadow=true;
  g.add(bow);

  g.userData.female = female;
  scene.add(g);
  return g;
}
