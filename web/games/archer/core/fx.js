// Pooled VFX engine. Presets are DATA in vfx/presets.js (owned by the Arrows/VFX specialist); this file only runs them.
//   fx.burst(id, x, y, opts)   play a preset (array of emitters + optional debris/ring/flash/shake)
//   fx.emit(emitter, x, y, o)  spawn one emitter definition directly (used by trails)
// Nothing here allocates per frame: particles live in fixed typed arrays and draw as two instanced meshes.
import * as THREE from 'three';
import { VFX } from '../vfx/presets.js';

const MAXP = 900, MAXD = 140, MAXR = 8;
const SHAPES = { glow: 0, puff: 1, streak: 2, star: 3, ring: 4 };
const PKEYS = ['x', 'y', 'z', 'vx', 'vy', 'life', 'max', 's0', 's1', 'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'a0', 'a1', 'grav', 'drag', 'rot', 'spin', 'shape', 'alignVel'];
const DKEYS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 's', 'life', 'rx', 'ry', 'c'];

function makeSystem(additive) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage);   // xyz + size
  const iCol = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage);   // rgb + alpha
  const iMisc = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 2), 2).setUsage(THREE.DynamicDrawUsage);  // rotation, shape
  g.setAttribute('iPos', iPos); g.setAttribute('iCol', iCol); g.setAttribute('iMisc', iMisc);
  g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {},
    vertexShader: `attribute vec4 iPos; attribute vec4 iCol; attribute vec2 iMisc; varying vec2 vUv; varying vec4 vCol; varying float vShape;
      void main(){
        vUv = position.xy; vCol = iCol; vShape = iMisc.y;
        float c = cos(iMisc.x), s = sin(iMisc.x);
        vec2 q = position.xy; if (vShape > 1.5 && vShape < 2.5) q.x *= 3.2;
        q = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
        vec4 mv = modelViewMatrix * vec4(iPos.xyz, 1.0); mv.xy += q * iPos.w;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec2 vUv; varying vec4 vCol; varying float vShape;
      void main(){
        float r = length(vUv); float a; vec3 col = vCol.rgb;
        if (vShape < 0.5) { a = pow(max(0.0, 1.0 - r), 1.8); }
        else if (vShape < 1.5) { // toon puff: hard edge + soft inner shading + top-left highlight
          a = 1.0 - smoothstep(0.86, 0.98, r);
          float sh = smoothstep(0.1, 0.95, dot(vUv, vec2(0.45, -0.6)) * 0.8 + r * 0.45);
          col *= mix(1.12, 0.7, sh);
        }
        else if (vShape < 2.5) { a = pow(max(0.0, 1.0 - length(vUv * vec2(1.0, 2.6))), 1.4); }
        else if (vShape < 3.5) { vec2 u = abs(vUv); a = max(0.0, 1.0 - (u.x * 3.0 + u.y)) + max(0.0, 1.0 - (u.y * 3.0 + u.x)); a = clamp(a, 0.0, 1.0); }
        else { a = smoothstep(0.62, 0.78, r) * (1.0 - smoothstep(0.86, 1.0, r)); }
        if (a * vCol.a < 0.004) discard;
        gl_FragColor = vec4(col, a * vCol.a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = additive ? 12 : 11;
  const n = MAXP;
  return {
    mesh, g, iPos, iCol, iMisc, count: 0,
    x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n),
    life: new Float32Array(n), max: new Float32Array(n), s0: new Float32Array(n), s1: new Float32Array(n),
    r0: new Float32Array(n), g0: new Float32Array(n), b0: new Float32Array(n), r1: new Float32Array(n), g1: new Float32Array(n), b1: new Float32Array(n),
    a0: new Float32Array(n), a1: new Float32Array(n), grav: new Float32Array(n), drag: new Float32Array(n), rot: new Float32Array(n), spin: new Float32Array(n), shape: new Float32Array(n),
    alignVel: new Uint8Array(n),
  };
}

const col = new THREE.Color(), col2 = new THREE.Color();
let rnd = Math.random;
const range = (v, d) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * rnd() : (v ?? d));

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.add = makeSystem(true); this.alpha = makeSystem(false);
    scene.add(this.alpha.mesh, this.add.mesh); this.systems = [this.add, this.alpha];
    // debris: lit chunky rocks
    const dg = new THREE.DodecahedronGeometry(1, 0);
    this.debris = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), MAXD);
    this.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.debris.count = 0; this.debris.frustumCulled = false; this.debris.castShadow = true;
    this.debris.setColorAt(0, col.set(0xffffff));
    scene.add(this.debris);
    this.d = { n: 0, x: new Float32Array(MAXD), y: new Float32Array(MAXD), z: new Float32Array(MAXD), vx: new Float32Array(MAXD), vy: new Float32Array(MAXD), vz: new Float32Array(MAXD), s: new Float32Array(MAXD), life: new Float32Array(MAXD), rx: new Float32Array(MAXD), ry: new Float32Array(MAXD), c: new Uint32Array(MAXD) };
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.sv = new THREE.Vector3();
    // flash light (single, re-used)
    this.light = new THREE.PointLight(0xffaa55, 0, 14, 1.6); this.light.position.set(0, 0, 3); scene.add(this.light);
    this.lightT = 0; this.lightMax = 0; this.lightDur = 0.2;
    this.time = 0;
  }
  setRandom(fn) { rnd = fn; }

  /** Play a preset by id. opts: { scale=1, dirX, dirY (unit, for directional emitters), tint (hex), terrainColor (hex), z } */
  has(id) { return !!VFX[id]; }
  burst(id, x, y, o = {}) {
    const p = VFX[id]; if (!p) return;
    const sc = o.scale ?? 1;
    if (p.emitters) for (const e of p.emitters) this.emit(e, x, y, o);
    if (p.debris) this.spawnDebris(x, y, Math.round(p.debris.count * Math.min(1.5, sc)), p.debris, o);
    if (p.ring) this.ring(x, y, p.ring, sc);
    if (p.flash) this.flash(x, y, p.flash, sc);
    if (p.shake && this.onShake) this.onShake(p.shake * Math.min(1.4, sc));
  }

  emit(e, x, y, o = {}) {
    const sys = e.blend === 'add' ? this.add : this.alpha, sc = o.scale ?? 1;
    const n = Math.round(range(e.count, 8) * (e.scaleCount === false ? 1 : Math.min(1.6, sc)));
    const baseDir = e.dir === 'input' ? Math.atan2(o.dirY ?? 1, o.dirX ?? 0) : (e.dir ?? null);
    col.set(o.tint && e.tintable ? o.tint : (e.color === 'terrain' ? (o.terrainColor ?? 0x8a7a60) : (e.color ?? 0xffffff)));
    if (e.color2 === 'dark') col2.copy(col).multiplyScalar(0.45);
    else col2.set(o.tint && e.tintable ? o.tint : (e.color2 === 'terrain' ? (o.terrainColor ?? 0x8a7a60) : (e.color2 ?? (e.color === 'terrain' ? (o.terrainColor ?? 0x8a7a60) : e.color) ?? 0xffffff)));
    for (let k = 0; k < n; k++) {
      if (sys.count >= MAXP) this._kill(sys, 0);
      const i = sys.count++;
      const ang = baseDir === null ? rnd() * Math.PI * 2 : baseDir + (rnd() - 0.5) * (e.spread ?? 1);
      const sp = range(e.speed, 3) * (e.scaleSpeed === false ? 1 : Math.sqrt(sc));
      const off = range(e.offset, 0) * sc;
      sys.x[i] = x + Math.cos(ang) * off; sys.y[i] = y + Math.sin(ang) * off; sys.z[i] = (o.z ?? 0) + range(e.z, 0) * (rnd() < 0.5 ? -1 : 1);
      sys.vx[i] = Math.cos(ang) * sp + (o.vx ?? 0) * (e.inherit ?? 0); sys.vy[i] = Math.sin(ang) * sp + (e.lift ?? 0) + (o.vy ?? 0) * (e.inherit ?? 0);
      sys.max[i] = sys.life[i] = range(e.life, 0.6);
      const sz = range(e.size, 0.3) * sc; sys.s0[i] = sz; sys.s1[i] = sz * (e.grow ?? 1);
      const mixc = rnd() * (e.colorJitter ?? 0);
      sys.r0[i] = col.r + (col2.r - col.r) * mixc; sys.g0[i] = col.g + (col2.g - col.g) * mixc; sys.b0[i] = col.b + (col2.b - col.b) * mixc;
      sys.r1[i] = col2.r; sys.g1[i] = col2.g; sys.b1[i] = col2.b;
      sys.a0[i] = e.alpha?.[0] ?? 1; sys.a1[i] = e.alpha?.[1] ?? 0;
      sys.grav[i] = e.gravity ?? 0; sys.drag[i] = e.drag ?? 1.5;
      sys.rot[i] = rnd() * 6.28; sys.spin[i] = (rnd() - 0.5) * (e.spin ?? 0);
      sys.shape[i] = SHAPES[e.shape ?? 'glow']; sys.alignVel[i] = e.shape === 'streak' ? 1 : 0;
    }
  }
  _kill(sys, i) { // swap-remove
    const j = --sys.count; if (i === j) return;
    for (let q = 0; q < PKEYS.length; q++) { const a = sys[PKEYS[q]]; a[i] = a[j]; }
  }
  spawnDebris(x, y, n, def, o) {
    const d = this.d;
    col.set(def.color === 'terrain' || !def.color ? (o.terrainColor ?? 0x8a7a60) : def.color);
    for (let k = 0; k < n; k++) {
      let i = d.n < MAXD ? d.n++ : Math.floor(rnd() * MAXD);
      const a = (def.dir ?? Math.PI / 2) + (rnd() - 0.5) * (def.spread ?? 2.6), sp = range(def.speed, 8);
      d.x[i] = x; d.y[i] = y + 0.1; d.z[i] = (rnd() - 0.5) * 2.5;
      d.vx[i] = Math.cos(a) * sp; d.vy[i] = Math.sin(a) * sp; d.vz[i] = (rnd() - 0.2) * 3;
      d.s[i] = range(def.size, 0.15); d.life[i] = range(def.life, 1.6); d.rx[i] = rnd() * 6; d.ry[i] = rnd() * 6;
      const tone = 0.75 + rnd() * 0.4; d.c[i] = (Math.min(255, col.r * 255 * tone) << 16) | (Math.min(255, col.g * 255 * tone) << 8) | Math.min(255, col.b * 255 * tone);
    }
  }
  ring(x, y, def, sc = 1) {
    this.emit({ count: 1, shape: 'ring', blend: def.blend ?? 'add', life: def.life ?? 0.35, speed: 0, size: (def.radius ?? 1.5) * 0.25, grow: 4, color: def.color ?? 0xffffff, alpha: [def.alpha ?? 0.9, 0], drag: 0, scaleCount: false }, x, y, { scale: sc });
  }
  flash(x, y, def, sc = 1) {
    this.light.color.set(def.color ?? 0xffaa55); this.light.position.set(x, y + 0.5, 3.5);
    this.lightMax = (def.intensity ?? 60) * sc; this.lightT = this.lightDur = def.life ?? 0.25; this.light.distance = (def.radius ?? 12) * Math.sqrt(sc);
    this.emit({ count: 1, shape: 'glow', blend: 'add', life: this.lightDur * 0.7, speed: 0, size: (def.radius ?? 12) * 0.08, grow: 1.3, color: def.color ?? 0xffcc88, alpha: [0.45, 0], scaleCount: false }, x, y, { scale: Math.sqrt(sc), z: 0.5 });
  }
  clear() { this.add.count = 0; this.alpha.count = 0; this.d.n = 0; this.lightT = 0; this.light.intensity = 0; }

  update(dt, terrain) {
    this.time += dt;
    for (let si = 0; si < 2; si++) { const sys = this.systems[si];
      let i = 0;
      while (i < sys.count) {
        sys.life[i] -= dt;
        if (sys.life[i] <= 0) { this._kill(sys, i); continue; }
        const dr = Math.max(0, 1 - sys.drag[i] * dt);
        sys.vx[i] *= dr; sys.vy[i] = sys.vy[i] * dr - sys.grav[i] * dt;
        sys.x[i] += sys.vx[i] * dt; sys.y[i] += sys.vy[i] * dt;
        sys.rot[i] = sys.alignVel[i] ? Math.atan2(sys.vy[i], sys.vx[i]) : sys.rot[i] + sys.spin[i] * dt;
        i++;
      }
      const P = sys.iPos.array, C = sys.iCol.array, Mi = sys.iMisc.array;
      for (let k = 0; k < sys.count; k++) {
        const t = 1 - sys.life[k] / sys.max[k], o = k * 4;
        P[o] = sys.x[k]; P[o + 1] = sys.y[k]; P[o + 2] = sys.z[k]; P[o + 3] = sys.s0[k] + (sys.s1[k] - sys.s0[k]) * t;
        C[o] = sys.r0[k] + (sys.r1[k] - sys.r0[k]) * t; C[o + 1] = sys.g0[k] + (sys.g1[k] - sys.g0[k]) * t; C[o + 2] = sys.b0[k] + (sys.b1[k] - sys.b0[k]) * t;
        C[o + 3] = sys.a0[k] + (sys.a1[k] - sys.a0[k]) * t;
        Mi[k * 2] = sys.rot[k]; Mi[k * 2 + 1] = sys.shape[k];
      }
      sys.g.instanceCount = sys.count;
      if (sys.count) {
        sys.iPos.clearUpdateRanges(); sys.iPos.addUpdateRange(0, sys.count * 4); sys.iPos.needsUpdate = true;
        sys.iCol.clearUpdateRanges(); sys.iCol.addUpdateRange(0, sys.count * 4); sys.iCol.needsUpdate = true;
        sys.iMisc.clearUpdateRanges(); sys.iMisc.addUpdateRange(0, sys.count * 2); sys.iMisc.needsUpdate = true;
      }
    }
    // debris
    const d = this.d; let i = 0;
    while (i < d.n) {
      d.life[i] -= dt;
      if (d.life[i] <= 0) { const j = --d.n; for (let q = 0; q < DKEYS.length; q++) { const a = d[DKEYS[q]]; a[i] = a[j]; } continue; }
      d.vy[i] -= 26 * dt; d.x[i] += d.vx[i] * dt; d.y[i] += d.vy[i] * dt; d.z[i] += d.vz[i] * dt;
      if (terrain && d.vy[i] < 0 && terrain.solid(d.x[i], d.y[i])) { d.y[i] -= d.vy[i] * dt; d.vy[i] *= -0.3; d.vx[i] *= 0.55; d.vz[i] *= 0.5; }
      d.rx[i] += d.vx[i] * dt * 2; d.ry[i] += d.vy[i] * dt * 1.5;
      const s = d.s[i] * Math.min(1, d.life[i] * 2.5);
      this.e.set(d.rx[i], d.ry[i], 0); this.q.setFromEuler(this.e); this.v.set(d.x[i], d.y[i], d.z[i]); this.sv.set(s, s * 0.8, s);
      this.m4.compose(this.v, this.q, this.sv); this.debris.setMatrixAt(i, this.m4);
      col.setHex(d.c[i]); this.debris.setColorAt(i, col);
      i++;
    }
    this.debris.count = d.n; this.debris.instanceMatrix.needsUpdate = true; if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
    if (this.lightT > 0) { this.lightT -= dt; const k = Math.max(0, this.lightT / this.lightDur); this.light.intensity = this.lightMax * k * k; }
    else this.light.intensity = 0;
  }
}
