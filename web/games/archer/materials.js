// materials.js - PBR materials
import * as THREE from '../../lib/three.module.js';

export const mat = {
  grass: new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.6 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.95, metalness: 0.0 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x7c7c84, roughness: 0.75, metalness: 0.1, envMapIntensity: 0.4 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.5 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.25, metalness: 0.95, envMapIntensity: 1.0 }),
  skin: (tone=0xf1c27d) => new THREE.MeshStandardMaterial({ color: tone, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.35 }),
  cloth: (c=0x3366cc) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.0, envMapIntensity: 0.4 }),
  armor: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.8, envMapIntensity: 0.9 }),
  bikini: new THREE.MeshStandardMaterial({ color: 0xff4fa3, roughness: 0.45, metalness: 0.15, emissive: 0x330018, emissiveIntensity: 0.15, envMapIntensity: 0.6 }),
  arrow: new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 0.5, metalness: 0.05 }),
  arrowTip: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.15, metalness: 1.0 }),
  platform: new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.35, envMapIntensity: 0.5 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.3 }),
  hair: (c=0x8b4513) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.2 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.0 }),
  iris: (c=0x3a7d44) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.0, emissive: c, emissiveIntensity: 0.05 }),
  lip: (c=0xc94a6a) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.0 }),
  heel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.2 }),
};

// (celOutline removed — dead no-op)
