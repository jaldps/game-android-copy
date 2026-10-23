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

  // ---------------- desert ruins ----------------
  cactus: () => {
    const rib = (x, y, z) => (Math.sin(Math.atan2(z, x) * 9) > 0.25 ? 0x62cc5a : 0x2f9446);
    const parts = [[T(new THREE.CylinderGeometry(0.32, 0.38, 2.6, 14, 3), 0, 1.3, 0), rib, (y) => y * 0.04], [T(sph(0.32, 14, 8), 0, 2.6, 0), rib, 0.1]];
    for (const [s, h, len] of [[1, 1.0, 0.95], [-1, 1.45, 0.7]]) {
      parts.push([T(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 10), s * 0.42, h, 0, 0, 0, Math.PI / 2), rib, 0.06]);
      parts.push([T(new THREE.CylinderGeometry(0.2, 0.22, len, 10), s * 0.7, h + len / 2, 0), rib, 0.08]);
      parts.push([T(sph(0.2, 10, 6), s * 0.7, h + len, 0), rib, 0.1]);
    }
    parts.push([T(sph(0.11, 6, 5), 0.06, 2.92, 0.08), 0xff5f9a, 0.1], [T(sph(0.09, 6, 5), 0.7, 2.0, 0.06), 0xffd24a, 0.1]);
    return { geo: build(parts) };
  },
  pillar: () => {
    const rng = makeRng(31), shaft = new THREE.CylinderGeometry(0.4, 0.44, 2.6, 16, 6), p = shaft.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 1.2) p.setY(i, p.getY(i) - rng() * 0.7);
    shaft.computeVertexNormals();
    const flute = (x, y, z) => (Math.sin(Math.atan2(z, x) * 8) > 0.55 ? 0xc0905a : (y > 2.2 ? 0xf2d29a : 0xe4bb82));
    const parts = [[T(new RoundedBoxGeometry(1.2, 0.35, 1.2, 2, 0.05), 0, 0.17, 0), 0xd4a46c], [T(shaft, 0, 1.6, 0), flute]];
    parts.push([T(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 14), 0.95, 0.3, 0.35, Math.PI / 2, 0.4, 0), flute]);
    return { geo: build(parts) };
  },
  urn: () => {
    const pts = [[0.02, 0], [0.22, 0.02], [0.34, 0.18], [0.42, 0.45], [0.36, 0.72], [0.18, 0.86], [0.16, 0.98], [0.24, 1.04]].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 14);
    const parts = [[g, (x, y) => (Math.abs(y - 0.5) < 0.06 ? 0x2a3a6a : (Math.abs(y - 0.62) < 0.03 ? 0xf2d060 : 0xc8643a))]];
    parts.push([T(new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI), 0.3, 0.8, 0, 0, 0, -1.2), 0xa8502e], [T(new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI), -0.3, 0.8, 0, 0, Math.PI, -1.2), 0xa8502e]);
    return { geo: build(parts) };
  },
  obelisk: () => {
    const sh = new THREE.CylinderGeometry(0.42, 0.62, 4.6, 4, 8); sh.rotateY(Math.PI / 4);
    const glyph = (x, y, z) => { const b = Math.floor(y * 2.2); return (b % 3 === 1 && Math.abs(x + z) < 0.25) ? 0x2a6ab0 : (b % 2 ? 0xe2b878 : 0xd4a468); };
    const parts = [[T(new RoundedBoxGeometry(1.6, 0.4, 1.6, 2, 0.05), 0, 0.2, 0), 0xc8965c], [T(sh, 0, 2.7, 0), glyph]];
    const cap = new THREE.ConeGeometry(0.6, 0.7, 4); cap.rotateY(Math.PI / 4); parts.push([T(cap, 0, 5.35, 0), 0xffcf3a]);
    return { geo: build(parts) };
  },
  shrub: () => {
    const rng = makeRng(17), parts = [];
    for (let i = 0; i < 9; i++) { const h = 0.5 + rng() * 0.5, a = rng() * 6.28; parts.push([T(new THREE.CylinderGeometry(0.015, 0.035, h, 4), Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.08, Math.sin(a) * 0.5, 0, Math.cos(a) * 0.6), 0x8a6a3a, (y) => y * 0.8]); }
    for (let i = 0; i < 6; i++) parts.push([T(sph(0.16 + rng() * 0.1, 7, 5), (rng() - 0.5) * 0.8, 0.35 + rng() * 0.4, (rng() - 0.5) * 0.4), rng() < 0.5 ? 0x9aa84a : 0xb8b45a, 0.5]);
    return { geo: build(parts), shadow: false };
  },
  sandrock: () => {
    const g = new THREE.DodecahedronGeometry(0.8, 1), p = g.attributes.position, rng = makeRng(23);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1.2 + (rng() - 0.5) * 0.25), Math.max(-0.1, p.getY(i) * 0.7), p.getZ(i));
    g.translate(0, 0.32, 0); g.computeVertexNormals();
    return { geo: build([[g, (x, y) => (Math.floor(y * 5) % 2 ? 0xe8a868 : 0xc8784a)]]) };
  },
  skull: () => {
    const parts = [[T(sph(0.32, 10, 8), 0, 0.3, 0, 0, 0, 0, 1, 0.85, 1.1), 0xf4ead0], [T(sph(0.07, 6, 5), 0.1, 0.32, 0.3), 0x3a2a1a], [T(sph(0.07, 6, 5), -0.1, 0.32, 0.3), 0x3a2a1a]];
    for (const s of [1, -1]) parts.push([T(new THREE.ConeGeometry(0.07, 0.6, 6), s * 0.45, 0.45, 0, 0, 0, -s * 1.1), 0xe8dcc0]);
    return { geo: build(parts), shadow: false };
  },

  // ---------------- lava forge ----------------
  obsidian: () => {
    const rng = makeRng(41), parts = [];
    for (let i = 0; i < 5; i++) parts.push([T(new THREE.OctahedronGeometry(0.32, 0), (rng() - 0.5) * 0.8, 0.4 + rng() * 0.3, (rng() - 0.5) * 0.4, 0, rng(), (rng() - 0.5) * 0.8, 0.6 + rng() * 0.4, 1.4 + rng() * 1.3, 0.6),
      (x, y) => (y > 0.9 ? 0xffa83a : y > 0.6 ? 0xff4a1a : 0x1a0e1e)]);
    return { geo: build(parts), emissive: true };
  },
  deadtree: () => {
    const parts = [], col = (x, y, z) => (Math.sin(y * 9 + x * 4) > 0.86 ? 0xff5a14 : 0x241a1c);
    parts.push([T(new THREE.CylinderGeometry(0.12, 0.28, 2.6, 7), 0, 1.3, 0, 0, 0, 0.08), col]);
    for (const [y, a, l] of [[1.6, 0.9, 1.1], [2.1, -0.8, 0.9], [2.5, 0.5, 0.7], [1.2, -1.1, 0.7]]) {
      parts.push([T(new THREE.CylinderGeometry(0.04, 0.09, l, 5), Math.sin(a) * l * 0.5, y + Math.cos(a) * l * 0.4, 0, 0, 0, -a), col]);
    }
    return { geo: build(parts), emissive: true };
  },
  lavarock: () => {
    const g = new THREE.DodecahedronGeometry(0.75, 1), p = g.attributes.position, rng = makeRng(29);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1.1 + (rng() - 0.5) * 0.3), Math.max(-0.1, p.getY(i) * 0.72), p.getZ(i) * (1 + (rng() - 0.5) * 0.3));
    g.translate(0, 0.3, 0); g.computeVertexNormals();
    return { geo: build([[g, (x, y, z) => (Math.abs(Math.sin(x * 5 + z * 3) * Math.cos(y * 6)) < 0.12 ? 0xff6a1a : (y > 0.6 ? 0x4a3a40 : 0x2a2028))]]), emissive: true };
  },
  anvil: () => {
    const iron = 0x3c4250, parts = [];
    parts.push([T(new RoundedBoxGeometry(1.0, 0.5, 0.7, 2, 0.05), 0, 0.25, 0), 0x6a4a30]);
    parts.push([T(new RoundedBoxGeometry(0.45, 0.35, 0.4, 2, 0.04), 0, 0.68, 0), iron]);
    parts.push([T(new RoundedBoxGeometry(1.1, 0.28, 0.5, 2, 0.05), 0, 0.98, 0), (x, y) => (y > 1.08 ? 0x8a94a8 : iron)]);
    parts.push([T(new THREE.ConeGeometry(0.2, 0.6, 8), 0.82, 0.98, 0, 0, 0, -Math.PI / 2), iron]);
    parts.push([T(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), -0.2, 1.4, 0.1, 0, 0, 0.9), 0x6a4a30], [T(new RoundedBoxGeometry(0.3, 0.16, 0.16, 1, 0.03), 0.05, 1.62, 0.1, 0, 0, 0.9), iron]);
    return { geo: build(parts) };
  },
  spikes: () => {
    const parts = [[T(new RoundedBoxGeometry(2.2, 0.12, 0.12, 1, 0.03), 0, 0.9, 0), 0x2e2a34], [T(new RoundedBoxGeometry(2.2, 0.12, 0.12, 1, 0.03), 0, 0.35, 0), 0x2e2a34]];
    for (let i = 0; i < 6; i++) { const x = -1.0 + i * 0.4; parts.push([T(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), x, 0.65, 0), 0x3a3644], [T(new THREE.ConeGeometry(0.08, 0.32, 6), x, 1.45, 0), (xx, y) => (y > 1.5 ? 0xff8a3a : 0x8a8a98)]); }
    return { geo: build(parts) };
  },
  chimney: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.42, 0.6, 4.2, 10, 6), 0, 2.1, 0), (x, y) => (Math.floor(y * 2.4) % 2 ? 0x4a2a2a : 0x5e3430)]];
    parts.push([T(new THREE.CylinderGeometry(0.55, 0.5, 0.35, 10), 0, 4.3, 0), 0x2a2228], [T(new THREE.CircleGeometry(0.4, 10), 0, 4.48, 0, -Math.PI / 2), 0xff8a2a]);
    parts.push([T(new RoundedBoxGeometry(0.5, 0.6, 0.1, 1, 0.03), 0, 0.7, 0.55), 0xffa030]);
    return { geo: build(parts), emissive: true };
  },

  // ---------------- neon city rooftops ----------------
  acunit: () => {
    const parts = [[T(new RoundedBoxGeometry(1.3, 0.85, 0.95, 2, 0.06), 0, 0.43, 0), (x, y, z) => (z > 0.4 && Math.abs((y * 10) % 1) < 0.35 && y < 0.75 ? 0x5a6478 : 0xb8c0cc)]];
    parts.push([T(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 14), 0.1, 0.88, 0), 0x2a3040], [T(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6), 0.1, 0.9, 0), 0x9aa4b4]);
    return { geo: build(parts) };
  },
  watertower: () => {
    const parts = [], wood = (x, y, z) => (Math.sin(Math.atan2(z, x) * 14) > 0.7 ? 0x6a4428 : 0x9a6638);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) parts.push([T(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 5), x, 1.1, z), 0x3a3a48]);
    parts.push([T(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 16, 2), 0, 3.0, 0), wood]);
    for (const y of [2.5, 3.5]) parts.push([T(new THREE.TorusGeometry(0.97, 0.04, 4, 18), 0, y, 0, Math.PI / 2), 0x2a2a34]);
    parts.push([T(new THREE.ConeGeometry(1.1, 0.8, 16), 0, 4.2, 0), 0x4a3a5a]);
    return { geo: build(parts) };
  },
  antenna: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.05, 0.1, 5, 5), 0, 2.5, 0), 0x1c1a26]];
    for (let i = 0; i < 4; i++) parts.push([T(new THREE.CylinderGeometry(0.025, 0.025, 1.2 - i * 0.22, 4), 0, 1.6 + i * 0.9, 0, 0, 0, Math.PI / 2), 0x1c1a26]);
    parts.push([T(sph(0.14, 8, 6), 0, 5.05, 0), 0xff2a3a], [T(sph(0.08, 6, 5), 0.5, 2.5, 0), 0xff2a3a]);
    return { geo: build(parts), emissive: true };
  },
  neonsign: () => {
    const pink = 0xff3fb0, cyan = 0x3ff0ff, parts = [];
    for (const x of [-1.0, 1.0]) parts.push([T(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5), x, 0.65, 0), 0x1a1624]);
    parts.push([T(new RoundedBoxGeometry(2.7, 1.3, 0.1, 1, 0.04), 0, 1.85, -0.05), 0x1a1030]);
    for (const [x, y, w, h] of [[0, 2.47, 2.6, 0.07], [0, 1.23, 2.6, 0.07], [-1.3, 1.85, 0.07, 1.3], [1.3, 1.85, 0.07, 1.3]]) parts.push([T(new RoundedBoxGeometry(w, h, 0.08, 1, 0.03), x, y, 0.04), pink]);
    for (const [x, y, w] of [[-0.62, 2.05, 0.9], [0.45, 2.05, 0.7], [-0.3, 1.66, 1.5], [0.88, 1.66, 0.3]]) parts.push([T(new RoundedBoxGeometry(w, 0.13, 0.08, 1, 0.04), x, y, 0.06), cyan]);
    return { geo: build(parts), emissive: true };
  },
  vent: () => {
    const parts = [[T(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 10), 0, 0.45, 0), 0x8a94a4], [T(new THREE.ConeGeometry(0.42, 0.3, 10), 0, 1.05, 0), 0x6a7484], [T(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), 0, 0.86, 0), 0x2a2e3a]];
    return { geo: build(parts) };
  },
  dish: () => {
    const bowl = new THREE.SphereGeometry(0.7, 14, 6, 0, Math.PI * 2, 0, 0.9); bowl.scale(1, 0.45, 1);
    const parts = [[T(new THREE.CylinderGeometry(0.06, 0.1, 0.9, 6), 0, 0.45, 0), 0x3a3e4a], [T(bowl, 0, 1.0, 0.1, -1.0, 0, 0, 1, 1, 1), (x, y) => (y > 1.15 ? 0xe8ecf4 : 0xc8ced8)], [T(sph(0.07, 6, 5), 0, 1.3, 0.55), 0xff3fb0]];
    return { geo: build(parts) };
  },
  billboard: () => {
    const parts = [];
    for (const x of [-1.6, 1.6]) parts.push([T(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), x, 1.2, 0), 0x22202e]);
    parts.push([T(new RoundedBoxGeometry(4.4, 2.2, 0.16, 1, 0.05), 0, 3.4, 0), (x, y) => {
      const t = (y - 2.3) / 2.2; return Math.abs(x) > 2.08 || Math.abs(t - 0.5) > 0.44 ? 0xffe14a : (x < -0.6 ? 0xff3fb0 : (t > 0.55 ? 0x3ff0ff : 0x8a4aff)); }]);
    for (let i = 0; i < 5; i++) parts.push([T(sph(0.08, 6, 4), -1.6 + i * 0.8, 4.62, 0.1), 0xfff2c0]);
    return { geo: build(parts), emissive: true };
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
