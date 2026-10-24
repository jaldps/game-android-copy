// Hero portraits rendered from the real 3D models (each hero in its starter outfit), once at boot, cached as data URLs.
// Used by the turn strip, the shop, hero select and the setup screens (meta/screens.js portrait() reads the cache and
// falls back to its CSS sketch until a portrait exists). Rendering goes through the main renderer so tone mapping and
// colour space match the game; it happens before the first game frame is drawn.
import * as THREE from 'three';
import { R } from './render.js';
import { CHARACTERS, defaultOutfit, createCharacter } from '../characters/index.js';

const cache = new Map();
export const portraitURL = (charId) => cache.get(charId) ?? null;

export function renderPortraits(size = 160) {
  const r = R.renderer; if (!r) return;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3c63b8);
  scene.environment = R.scene.environment; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x6a5a7a, 1.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 3.0); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 2.2); rim.position.set(3, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  const out = document.createElement('canvas'); out.width = out.height = size;
  const ctx = out.getContext('2d');
  const exposure = r.toneMappingExposure; r.toneMappingExposure = 1.05;
  const cv = r.domElement;
  for (const def of CHARACTERS) {
    let ch = null;
    try {
      ch = createCharacter(def, defaultOutfit(def.id));
      ch.setFacing(1); ch.setAnim('pose');
      for (let i = 0; i < 40; i++) ch.update(1 / 30);
      scene.add(ch.root); ch.root.updateMatrixWorld(true);
      const hs = ch.hitShapes, hr = hs.hr || 0.3;
      const F = Math.max(hr * 3.3, ch.height * 0.24);          // head + a hint of shoulders
      cam.aspect = cv.width / cv.height;
      const d = F / 2 / Math.tan(cam.fov * Math.PI / 360);
      cam.position.set(hs.hx + 0.08, hs.hy + 0.1, d); cam.lookAt(hs.hx, hs.hy - F * 0.1, 0); cam.updateProjectionMatrix();
      r.setRenderTarget(null); r.render(scene, cam);
      const s = cv.height;
      ctx.drawImage(cv, (cv.width - s) / 2, 0, s, s, 0, 0, size, size);
      cache.set(def.id, out.toDataURL('image/jpeg', 0.86));
    } catch (e) { console.warn('[portrait ' + def.id + ']', e); }
    if (ch) { scene.remove(ch.root); ch.dispose(); }
  }
  r.toneMappingExposure = exposure;
}
