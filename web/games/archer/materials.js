// materials.js
import * as THREE from '../../lib/three.module.js';

export const mat = {
  grass: new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9, metalness: 0.0 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 1.0 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85, metalness: 0.05 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.0 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.9 }),
  skin: (tone=0xf1c27d) => new THREE.MeshStandardMaterial({ color: tone, roughness: 0.6, metalness: 0.0 }),
  cloth: (c=0x3366cc) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.0 }),
  armor: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.4, metalness: 0.7 }),
  bikini: new THREE.MeshStandardMaterial({ color: 0xff4fa3, roughness: 0.5, metalness: 0.1, emissive: 0x220011 }),
  arrow: new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.5 }),
  arrowTip: new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.9 }),
  platform: new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.3 }),
};

export function celOutline(material, color=0x000000){
  return material;
}