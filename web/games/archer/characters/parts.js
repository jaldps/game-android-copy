// Geometry helpers for building toon characters out of smooth primitives (owner: Characters specialist).
// Every helper returns a non-indexed-agnostic BufferGeometry in the bone's LOCAL space; RigBuilder.add() colours
// and binds it. Limbs extend along -Y from the joint at the origin (that is the rest direction of every limb bone).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Tapered capsule from (0,0,0) down to (0,-len,0), radius r0 at the top and r1 at the bottom. */
export function limb(r0, r1, len, seg = 14) {
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r1, -len + Math.sin(a) * r1)); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  const g = new THREE.LatheGeometry(pts, seg);
  return g;
}
/** Lathe from a profile of [radius, y] pairs (bottom -> top). sx/sz squash the cross-section. */
export function lathe(profile, seg = 20, sx = 1, sz = 1) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg);
  if (sx !== 1 || sz !== 1) g.scale(sx, 1, sz);
  return g;
}
export function ball(rx, ry = rx, rz = rx, seg = 16) { const g = new THREE.SphereGeometry(1, seg, Math.max(8, Math.round(seg * 0.75))); g.scale(rx, ry, rz); return g; }
export function box(w, h, d, r = 0.02) { return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); }
export function cyl(rt, rb, h, seg = 12, open = false) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); }
export function cone(r, h, seg = 10) { return new THREE.ConeGeometry(r, h, seg); }
export function torus(r, tube, seg = 18, tseg = 8, arc = Math.PI * 2) { return new THREE.TorusGeometry(r, tube, tseg, seg, arc); }
/** Tube along a list of [x,y,z] points with radius r (or r(t) taper via r0->r1). */
export function tube(points, r0, r1 = r0, seg = 16, rseg = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const g = new THREE.TubeGeometry(curve, seg, 1, rseg, false);
  // taper: scale each ring around the curve point
  const pos = g.attributes.position, nor = g.attributes.normal, P = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = r0 + (r1 - r0) * t; curve.getPointAt(t, P);
    for (let j = 0; j <= rseg; j++) {
      const k = i * (rseg + 1) + j;
      pos.setXYZ(k, P.x + nor.getX(k) * r, P.y + nor.getY(k) * r, P.z + nor.getZ(k) * r);
    }
  }
  return g;
}
/** A flat-ish teardrop "lock" of hair / leaf / flame: from origin pointing along +Y, width w, thickness t. */
export function blade(len, w, t, bend = 0, seg = 8) {
  const g = new THREE.SphereGeometry(1, 10, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const v = (y + 1) / 2;                       // 0 bottom .. 1 tip
    const width = Math.sin(Math.PI * Math.min(1, v * 0.95 + 0.05)) * (1 - v * 0.55);
    x *= w * width; z *= t * width; y = v * len;
    z += bend * v * v * len;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Apply pos/rot/scale ([x,y,z] arrays) to a geometry in place and return it. */
export function xf(g, pos, rot, scl) {
  _e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0); _q.setFromEuler(_e);
  _s.set(scl?.[0] ?? 1, scl?.[1] ?? 1, scl?.[2] ?? 1); _p.set(pos?.[0] ?? 0, pos?.[1] ?? 0, pos?.[2] ?? 0);
  _m.compose(_p, _q, _s); g.applyMatrix4(_m); return g;
}
/** Mirror a geometry across X (for symmetric parts built once). Fixes winding. */
export function mirrorX(g) {
  g = g.clone(); g.scale(-1, 1, 1);
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
  else { const pos = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < pos.count; i += 3) for (const at of [pos, n]) { if (!at) continue; for (let c = 0; c < at.itemSize; c++) { const v1 = at.getComponent(i + 1, c); at.setComponent(i + 1, c, at.getComponent(i + 2, c)); at.setComponent(i + 2, c, v1); } } }
  return g;
}

/** Partial sphere cap (top `theta` radians from the pole), scaled to rx/ry/rz. Open at the rim. */
export function dome(rx, ry = rx, rz = rx, theta = Math.PI / 2, seg = 20) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.5)), 0, Math.PI * 2, 0, theta); g.scale(rx, ry, rz); return g;
}

/**
 * Hanging cloth panel (cape, tabard, scarf tail, loincloth): top edge centred at the origin, hangs along -Y.
 * Width w0 at the top -> w1 at the bottom, thickness `thick`; `curl` wraps the side edges toward +Z (around a body),
 * `flare` swings the lower part toward -Z (billowing back). Rotate/translate with xf().
 */
export function drape(w0, w1, len, thick = 0.02, curl = 0, flare = 0, segX = 8, segY = 10) {
  const g = new THREE.BoxGeometry(1, 1, 1, segX, segY, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = 0.5 - y, w = w0 + (w1 - w0) * t;
    p.setXYZ(i, x * w, -t * len, z * thick + curl * 4 * x * x * w - flare * t * t * len);
  }
  g.computeVertexNormals();
  return g;
}

// ---- procedural colour helpers (vertex colours stand in for textures) ----
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
/** Brightness-scale a 0xRRGGBB colour. */
export function tint(hex, k) { return (cl(((hex >> 16) & 255) * k) << 16) | (cl(((hex >> 8) & 255) * k) << 8) | cl((hex & 255) * k); }
/** Mix two hex colours. */
export function mix(a, b, t) { const f = (s) => cl(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return (f(16) << 16) | (f(8) << 8) | f(0); }
/** Woven-cloth look: soft brightness ripple. */
export const fabric = (hex, amp = 0.07, fr = 38) => (x, y, z) => tint(hex, 1 + amp * Math.sin(x * fr + y * fr * 1.3) * Math.sin(z * fr * 0.9 - y * fr * 0.7));
/** Vertical gradient (k0 at y0 .. k1 at y1) — fakes occlusion / sheen on long garments. */
export const vgrad = (hex, y0, y1, k0 = 0.78, k1 = 1.08) => (x, y) => tint(hex, k0 + (k1 - k0) * Math.min(1, Math.max(0, (y - y0) / (y1 - y0))));
/** Horizontal stripes of two colours (period p, duty d). */
export const stripes = (a, b, p = 0.08, d = 0.5) => (x, y) => ((((y / p) % 1) + 1) % 1 < d ? a : b);
/** Chainmail / scale pattern. */
export const mail = (hex) => (x, y, z) => tint(hex, 0.86 + 0.2 * Math.sin(y * 160) * Math.sin(x * 140 + z * 140));
