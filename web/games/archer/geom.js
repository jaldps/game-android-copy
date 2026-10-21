// Procedural geometry builder (GB pattern from Crowd)
import * as THREE from '../../lib/three.module.js';
import { mergeGeometries } from '../../lib/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

export class GB {
  constructor() { this.parts = []; }
  add(geo, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    _e.set(...(o.r ?? [0, 0, 0])); _q.setFromEuler(_e);
    _m.compose(_v.set(...(o.p ?? [0, 0, 0])), _q, _s.set(...(o.s ?? [1, 1, 1])));
    g.applyMatrix4(_m);
    if (o.flat) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    _c.set(o.c ?? '#ffffff'); if (o.k) _c.multiplyScalar(o.k);
    const pos = g.attributes.position;
    let y0 = Infinity, y1 = -Infinity;
    if (o.grad) for (let i = 0; i < n; i++) { y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); }
    for (let i = 0; i < n; i++) {
      let k = 1;
      if (o.grad) { const t = (pos.getY(i) - y0) / Math.max(1e-4, y1 - y0); k = o.grad[0] + (o.grad[1] - o.grad[0]) * t; }
      col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }
  box(w, h, d, o = {}) { const p = o.p ?? [0, 0, 0]; return this.add(new THREE.BoxGeometry(w, h, d), { ...o, p: [p[0], p[1] + h / 2, p[2]] }); }
  rbox(w, h, d, rad, o = {}) { const p = o.p ?? [0, 0, 0]; return this.add(new THREE.BoxGeometry(w, h, d), { ...o, p: [p[0], p[1] + h / 2, p[2]] }); }
  cyl(rt, rb, h, seg, o = {}) { const p = o.p ?? [0, 0, 0]; return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), { ...o, p: [p[0], p[1] + h / 2, p[2]] }); }
  sphere(r, ws, hs, o = {}) { return this.add(new THREE.SphereGeometry(r, ws, hs), o); }
  ico(r, det, o = {}) { return this.add(new THREE.IcosahedronGeometry(r, det), { flat: true, ...o }); }
  cone(r, h, seg, o = {}) { const p = o.p ?? [0, 0, 0]; return this.add(new THREE.ConeGeometry(r, h, seg), { ...o, p: [p[0], p[1] + h / 2, p[2]] }); }
  torus(r, t, rs, ts, o = {}) { return this.add(new THREE.TorusGeometry(r, t, rs, ts), o); }
  capsule(r, len, cs, rs, o = {}) { return this.add(new THREE.CapsuleGeometry(r, len, cs, rs), o); }
  build() {
    if (this.parts.length === 1) return this.parts[0];
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere();
    return g;
  }
}

export default GB;