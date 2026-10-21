import * as THREE from '../../lib/three.module.js';
import { mat } from './materials.js';

export function buildArcher(scene, opts={}){
  const g = new THREE.Group();
  const female = !!opts.female;
  const S = female ? 0.92 : 1.0;

  const skinColor = female ? 0xf3c9a8 : 0xd9a066;
  const hairColor = female ? 0xb33a2b : 0x1a1a1a;
  const bodyColor = female ? 0xff4fa3 : 0x2f4f8f;
  const pantsColor = female ? 0xff4fa3 : 0x222244;

  const skinMat = new THREE.MeshStandardMaterial({color: skinColor, roughness: 0.45, metalness: 0.0});
  const bodyMat = new THREE.MeshStandardMaterial({color: bodyColor, roughness: 0.7, metalness: 0.0});
  const hairMat = new THREE.MeshStandardMaterial({color: hairColor, roughness: 0.9, metalness: 0.0});
  const pantsMat = new THREE.MeshStandardMaterial({color: pantsColor, roughness: 0.7, metalness: 0.0});
  const bootMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.5, metalness: 0.2});

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22*S, 16, 12), skinMat);
  head.position.y = 1.72*S;
  head.castShadow = true;
  g.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24*S, 16, 12, 0, Math.PI*2, 0, Math.PI/2), hairMat);
  hair.position.y = 1.85*S;
  hair.castShadow = true;
  g.add(hair);

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25*S, 0.3*S, 0.9*S, 12), bodyMat);
  torso.position.y = 1.0*S;
  torso.castShadow = true;
  g.add(torso);

  // Chest (female)
  if (female) {
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.2*S, 12, 10), bodyMat);
    chest.position.set(0, 1.3*S, 0.15*S);
    chest.scale.set(1.1, 0.9, 1.0);
    chest.castShadow = true;
    g.add(chest);
  }

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.06*S, 0.07*S, 0.7*S, 8);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(-0.35*S, 1.0*S, 0);
  leftArm.rotation.z = 0.3;
  leftArm.castShadow = true;
  g.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.set(0.35*S, 1.0*S, 0);
  rightArm.rotation.z = -0.3;
  rightArm.castShadow = true;
  g.add(rightArm);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.08*S, 0.1*S, 0.8*S, 8);
  const leftLeg = new THREE.Mesh(legGeo, female ? bodyMat : pantsMat);
  leftLeg.position.set(-0.12*S, 0.2*S, 0);
  leftLeg.castShadow = true;
  g.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, female ? bodyMat : pantsMat);
  rightLeg.position.set(0.12*S, 0.2*S, 0);
  rightLeg.castShadow = true;
  g.add(rightLeg);

  // Feet
  const footGeo = new THREE.BoxGeometry(0.12*S, 0.08*S, 0.2*S);
  const leftFoot = new THREE.Mesh(footGeo, bootMat);
  leftFoot.position.set(-0.12*S, -0.15*S, 0.05*S);
  leftFoot.castShadow = true;
  g.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeo, bootMat);
  rightFoot.position.set(0.12*S, -0.15*S, 0.05*S);
  rightFoot.castShadow = true;
  g.add(rightFoot);

  // Bow
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4*S, 0.03*S, 8, 16, Math.PI), mat.wood.clone());
  bow.position.set(0.5*S, 1.0*S, 0.2*S);
  bow.rotation.y = Math.PI/2;
  bow.castShadow = true;
  g.add(bow);

  // Quiver
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.06*S, 0.08*S, 0.4*S, 8), mat.leather.clone());
  quiver.position.set(-0.2*S, 1.0*S, -0.15*S);
  quiver.rotation.z = 0.2;
  quiver.castShadow = true;
  g.add(quiver);

  g.userData.female = female;
  scene.add(g);
  return g;
}
