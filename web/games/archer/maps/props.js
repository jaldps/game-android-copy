// Prop geometry kit (owner: Maps specialist). Each PROP_TYPES[id]() returns
//   { geo: BufferGeometry (with `color` + `aSway` attributes, origin at the base), emissive?: bool, shadow?: bool }
// The core PropLayer instances them (one InstancedMesh per type) and drops props whose ground is blasted away.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeRng } from '../core/util.js';

const tmp = new THREE.Color();
/** parts: [geometry, colorHex | (x,y,z)=>hex, sway 0..1 | (y)=>0..1] */
export function build(parts) {
  const out = [];
  for (const [g0, col, sway = 0] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      tmp.set(typeof col === 'function' ? col(x, y, z) : col);
      c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
      s[i] = typeof sway === 'function' ? sway(y) : sway;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aSway', new THREE.BufferAttribute(s, 1));
    out.push(g);
  }
  const m = mergeGeometries(out); m.computeBoundingSphere(); return m;
}
const T = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz))); return g;
};
const sph = (r, ws = 10, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
/** Leaf / frond: a flattened, drooping ellipsoid along +X. */
function frond(len, w, droop) {
  const g = new THREE.SphereGeometry(1, 12, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + 1) / 2, wid = Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - u * 0.4);
    const x = u * len, y = p.getY(i) * 0.06 - droop * u * u * len, z = p.getZ(i) * w * wid;
    p.setXYZ(i, x, y + Math.abs(p.getZ(i)) * w * 0.25 * wid, z);
  }
  g.computeVertexNormals(); return g;
}

export const PROP_TYPES = {
  palm: () => {
    const parts = [], rng = makeRng(5);
    let x = 0, y = 0; const segs = 7;
    for (let i = 0; i < segs; i++) {
      const h = 0.62, lean = 0.06 + i * 0.03;
      parts.push([T(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.2 - i * 0.012, h, 8), x, y + h / 2, 0, 0, 0, -lean), i % 2 ? 0x9a6a40 : 0x87593a, (yy) => Math.max(0, yy / 4.5) * 0.6]);
      x += Math.sin(lean) * h; y += Math.cos(lean) * h * 0.97;
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.3;
      parts.push([T(frond(2.2 + rng() * 0.5, 0.42, 0.42), x, y, 0, 0, a, 0.25), i % 2 ? 0x3fae3a : 0x5ccc46, 1]);
    }
    for (let i = 0; i < 3; i++) parts.push([T(sph(0.17), x + Math.cos(i * 2.1) * 0.2, y - 0.2, Math.sin(i * 2.1) * 0.2), 0x6a4a2a, 0.7]);
    return { geo: build(parts) };
  },
  bush: () => {
    const rng = makeRng(9), parts = [];
    for (let i = 0; i < 6; i++) { const r = 0.45 + rng() * 0.35; parts.push([T(sph(r, 10, 8), (rng() - 0.5) * 1.3, r * 0.75, (rng() - 0.5) * 0.7), (x, y) => (y > 0.7 ? 0x6fd24a : 0x3f9a34), 0.35]); }
    for (let i = 0; i < 7; i++) parts.push([T(sph(0.09, 6, 5), (rng() - 0.5) * 1.4, 0.5 + rng() * 0.6, 0.35 + rng() * 0.3), rng() < 0.5 ? 0xff6fa8 : 0xffe14a, 0.35]);
    return { geo: build(parts) };
  },
  rock: () => {
    const g = new THREE.DodecahedronGeometry(0.7, 1), p = g.attributes.position, rng = makeRng(2);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + (rng() - 0.5) * 0.2), Math.max(-0.1, p.getY(i) * 0.7), p.getZ(i));
    g.translate(0, 0.3, 0); g.computeVertexNormals();
    return { geo: build([[g, (x, y) => (y > 0.6 ? 0xd9c3a0 : 0xa88a6a)]]) };
  },
  grass: () => {
    const rng = makeRng(4), parts = [];
    for (let i = 0; i < 9; i++) { const h = 0.35 + rng() * 0.35; parts.push([T(new THREE.ConeGeometry(0.05, h, 3), (rng() - 0.5) * 0.7, h / 2, (rng() - 0.5) * 0.3, 0, 0, (rng() - 0.5) * 0.6), (x, y) => (y > 0.25 ? 0xa8ec5a : 0x52b03a), (y) => y * 1.5]); }
    return { geo: build(parts), shadow: false };
  },
  flowers: () => {
    const rng = makeRng(8), parts = [];
    for (let i = 0; i < 6; i++) {
      const x = (rng() - 0.5) * 0.9, z = (rng() - 0.5) * 0.3, h = 0.3 + rng() * 0.25;
      parts.push([T(new THREE.CylinderGeometry(0.015, 0.015, h, 4), x, h / 2, z), 0x3f9a34, (y) => y]);
      parts.push([T(sph(0.08, 8, 6), x, h, z, 0, 0, 0, 1, 0.6, 1), [0xff5f8a, 0xffe14a, 0xffffff, 0xb07aff][i % 4], 0.4]);
    }
    return { geo: build(parts), shadow: false };
  },
  hut: () => {
    const parts = [];
    parts.push([T(new RoundedBoxGeometry(2.2, 1.6, 1.8, 2, 0.08), 0, 0.8, 0), (x, y) => (Math.abs((y * 6) % 1) < 0.12 ? 0x6e4425 : 0x9a6438)]);
    parts.push([T(new THREE.ConeGeometry(1.9, 1.3, 4), 0, 2.2, 0, 0, Math.PI / 4, 0, 1, 1, 0.85), (x, y) => (Math.abs((y * 5) % 1) < 0.2 ? 0xd8b060 : 0xf0cd7a), 0.05]);
    parts.push([T(new RoundedBoxGeometry(0.6, 1.0, 0.1, 1, 0.03), 0.3, 0.5, 0.92), 0x4a2c18]);
    parts.push([T(new RoundedBoxGeometry(0.45, 0.4, 0.1, 1, 0.03), -0.6, 1.0, 0.92), 0x2a3a5a]);
    return { geo: build(parts) };
  },
  flag: () => {
    const parts = [];
    parts.push([T(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), 0, 1.6, 0), 0x6e4425]);
    parts.push([T(sph(0.1, 8, 6), 0, 3.25, 0), 0xf2c14e]);
    parts.push([T(new RoundedBoxGeometry(1.3, 0.8, 0.04, 1, 0.02), 0.7, 2.7, 0), (x, y) => (y > 2.75 ? 0xe23b3b : 0xffffff), (y) => 0.2 + (y - 2.3) * 0.4]);
    return { geo: build(parts) };
  },
  crate: () => ({ geo: build([[T(new RoundedBoxGeometry(0.9, 0.9, 0.9, 2, 0.06), 0, 0.45, 0), (x, y, z) => ((Math.abs(x) > 0.36 || Math.abs(y - 0.45) > 0.36) ? 0x7a4a26 : 0xb07a46)]]) }),
  pine: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 7), 0, 0.5, 0), 0x6e4425]];
    for (let i = 0; i < 4; i++) {
      const r = 1.3 - i * 0.26, y = 0.8 + i * 0.75;
      parts.push([T(new THREE.ConeGeometry(r, 1.3, 9), 0, y + 0.55, 0), 0x2f6b4a, 0.25]);
      parts.push([T(new THREE.ConeGeometry(r * 0.82, 0.55, 9), 0, y + 0.95, 0), 0xf4f8ff, 0.25]);
    }
    return { geo: build(parts) };
  },
  snowrock: () => {
    const g = new THREE.DodecahedronGeometry(0.8, 1), p = g.attributes.position, rng = makeRng(6);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + (rng() - 0.5) * 0.25), Math.max(-0.1, p.getY(i) * 0.75), p.getZ(i));
    g.translate(0, 0.35, 0); g.computeVertexNormals();
    return { geo: build([[g, (x, y) => (y > 0.75 ? 0xf4f8ff : 0x7d8aa8)]]) };
  },
  brazier: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), 0, 0.7, 0), 0x3a3a48], [T(new THREE.CylinderGeometry(0.4, 0.22, 0.35, 10), 0, 1.5, 0), 0x4a4a5a]];
    for (let i = 0; i < 4; i++) parts.push([T(new THREE.ConeGeometry(0.16 - i * 0.02, 0.6 + i * 0.1, 6), Math.cos(i * 1.7) * 0.12, 1.85 + i * 0.05, Math.sin(i * 1.7) * 0.12), i % 2 ? 0xffd25a : 0xff7a2a, 0.6]);
    return { geo: build(parts), emissive: true };
  },
  crystal: () => {
    const rng = makeRng(12), parts = [];
    for (let i = 0; i < 5; i++) parts.push([T(new THREE.OctahedronGeometry(0.3, 0), (rng() - 0.5) * 0.7, 0.4 + rng() * 0.3, (rng() - 0.5) * 0.4, 0, rng(), (rng() - 0.5) * 0.7, 0.6 + rng() * 0.4, 1.6 + rng() * 1.2, 0.6), i % 2 ? 0x9fe6ff : 0x5fb8ff]);
    return { geo: build(parts), emissive: true };
  },
  banner: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), 0, 2.1, 0), 0x4a3a2a], [T(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), 0, 3.9, 0, 0, 0, Math.PI / 2), 0x4a3a2a]];
    parts.push([T(new RoundedBoxGeometry(1.1, 2.2, 0.05, 1, 0.02), 0, 2.75, 0.05), (x, y) => (Math.abs(x) < 0.12 || y < 1.85 ? 0xf2c14e : 0x3a5ad0), (y) => Math.max(0, 3.9 - y) * 0.15]);
    return { geo: build(parts) };
  },
};

/** Shared prop material: vertex colours + gentle wind sway (aSway) + optional glow. */
export function createPropMaterial(emissive = false) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: emissive ? 0xffffff : 0x000000, emissiveIntensity: emissive ? 0.0 : 0 });
  const u = { uTime: { value: 0 }, uWind: { value: 0 } };
  mat.userData.u = u;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSway; uniform float uTime, uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sw = sin(uTime * 1.7 + ip.x * 0.7 + position.y * 0.6) * 0.06 + uWind * 0.04;
        transformed.x += sw * aSway * (0.4 + position.y * 0.3); transformed.z += sw * aSway * 0.3;`);
    if (emissive) s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = diffuseColor.rgb * 1.6;');
  };
  mat.customProgramCacheKey = () => 'archer-prop-' + (emissive ? 'e' : 'n');
  return mat;
}
