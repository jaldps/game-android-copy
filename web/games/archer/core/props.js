// Prop layer: instanced decorative props that sit on the terrain and fall/fly when their ground is blasted.
// Prop TYPES (geometry) come from maps/props.js; maps place them with ctx.props.add(type, x, y, opts).
import * as THREE from 'three';

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();

export class PropLayer {
  constructor(parent, types, makeMaterial) {
    this.parent = parent; this.types = types; this.makeMaterial = makeMaterial;
    this.items = []; this.meshes = new Map(); this.group = new THREE.Group(); parent.add(this.group);
    this.mat = makeMaterial(false); this.matE = makeMaterial(true);
    this.geoCache = new Map();
  }
  /** opts: { z=0, scale=1, rotY=0 } */
  add(type, x, y, o = {}) {
    if (!this.types[type]) return -1;
    this.items.push({ type, x, y, z: o.z ?? 0, s: o.scale ?? 1, ry: o.rotY ?? 0, rz: 0, vx: 0, vy: 0, vr: 0, state: 0, idx: 0 });
    return this.items.length - 1;
  }
  build() {
    const byType = new Map();
    for (const it of this.items) { if (!byType.has(it.type)) byType.set(it.type, []); byType.get(it.type).push(it); }
    for (const [type, list] of byType) {
      let def = this.geoCache.get(type); if (!def) { def = this.types[type](); this.geoCache.set(type, def); }
      const mesh = new THREE.InstancedMesh(def.geo, def.emissive ? this.matE : this.mat, list.length);
      mesh.castShadow = def.shadow !== false; mesh.receiveShadow = true; mesh.frustumCulled = false;
      list.forEach((it, i) => { it.idx = i; it.mesh = mesh; this._write(it); });
      mesh.instanceMatrix.needsUpdate = true;
      this.meshes.set(type, mesh); this.group.add(mesh);
    }
  }
  _write(it) {
    e.set(0, it.ry, it.rz); q.setFromEuler(e); p.set(it.x, it.y, it.z);
    const sc = it.state === 3 ? 0 : it.s; s.set(sc, sc, sc);
    m4.compose(p, q, s); it.mesh.setMatrixAt(it.idx, m4);
  }
  /** After a crater at (x,y) radius r: fling props inside the blast, drop unsupported ones. */
  disturb(x, y, r, T, rng = Math.random) {
    for (const it of this.items) {
      if (it.state === 3 || Math.abs(it.x - x) > r + 3) continue;
      const d = Math.hypot(it.x - x, it.y - y);
      if (d < r * 1.1) { it.state = 2; it.vx = (it.x - x) / (d + 0.5) * 6 + (rng() - 0.5) * 3; it.vy = 6 + rng() * 5; it.vr = (rng() - 0.5) * 10; }
      else if (!T.solid(it.x, it.y - 0.25) && !T.solid(it.x - 0.3, it.y - 0.3) && !T.solid(it.x + 0.3, it.y - 0.3)) { it.state = 2; it.vx = 0; it.vy = 0; it.vr = (rng() - 0.5) * 3; }
    }
  }
  update(dt, T, killY, time) {
    this.mat.userData.u.uTime.value = time; this.matE.userData.u.uTime.value = time;
    let dirty = false;
    for (const it of this.items) {
      if (it.state !== 2) continue;
      it.vy -= 25 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rz += it.vr * dt;
      if (it.vy < 0 && T.solid(it.x, it.y)) {
        const g = T.groundBelow(it.x, it.y + 1.0, 1.5);
        if (!isNaN(g)) { it.y = g; it.state = 1; it.vr = 0; it.rz = Math.max(-0.5, Math.min(0.5, it.rz % 1)); }
      }
      if (it.y < killY - 4) it.state = 3;
      this._write(it); dirty = true; it.mesh.instanceMatrix.needsUpdate = true;
    }
    return dirty;
  }
  setWind(w) { this.mat.userData.u.uWind.value = w; this.matE.userData.u.uWind.value = w; }
  dispose() { for (const m of this.meshes.values()) { this.group.remove(m); m.dispose(); } this.meshes.clear(); this.items = []; this.parent.remove(this.group); }
}
