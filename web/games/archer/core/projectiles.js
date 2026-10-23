// Projectile system: pooled projectiles + ribbon trails + stuck arrows. Arrow BEHAVIOUR comes from arrows/index.js
// via hooks (onLaunch / onUpdate / onImpact) that receive `api` (see Match.arrowApi and MODULES.md).
import * as THREE from 'three';
import { PHYS } from './config.js';
import { stepBody, hitTestShapes, launchSpeed, DEFAULT_PHYS } from './physics.js';
import { getArrow } from '../arrows/index.js';
import { events } from './events.js';

const TRAIL_N = 32, MAX_TRAILS = 14, MAX_STUCK = 10;

class Trail {
  constructor(parent) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(TRAIL_N * 2 * 3); this.t = new Float32Array(TRAIL_N * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aT', new THREE.BufferAttribute(this.t, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 1 } },
      vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vT; void main(){ float a = pow(1.0 - vT, 1.6) * uAlpha; if (a < 0.01) discard; gl_FragColor = vec4(uColor * (1.0 + (1.0 - vT) * 0.4), a);\n#include <colorspace_fragment>\n}',
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; this.mesh.visible = false;
    parent.add(this.mesh);
    this.xs = new Float32Array(TRAIL_N); this.ys = new Float32Array(TRAIL_N); this.n = 0; this.busy = false; this.fade = 0; this.width = 0.1; this.alpha = 1;
  }
  start(def, x, y) {
    const tr = def.trail ?? {};
    this.mat.uniforms.uColor.value.set(tr.color ?? 0xffffff); this.alpha = tr.alpha ?? 0.8; this.width = tr.width ?? 0.1;
    this.mat.blending = tr.additive ? THREE.AdditiveBlending : THREE.NormalBlending; this.mat.needsUpdate = true;
    this.len = Math.min(TRAIL_N, tr.length ?? 24);
    this.xs.fill(x); this.ys.fill(y); this.n = 1; this.busy = true; this.fade = 1; this.mesh.visible = true;
  }
  push(x, y) {
    if (this.n > 0 && Math.hypot(x - this.xs[0], y - this.ys[0]) < 0.12) { this.xs[0] = x; this.ys[0] = y; return; }
    for (let i = Math.min(this.n, this.len - 1); i > 0; i--) { this.xs[i] = this.xs[i - 1]; this.ys[i] = this.ys[i - 1]; }
    this.xs[0] = x; this.ys[0] = y; this.n = Math.min(this.len, this.n + 1);
  }
  write() {
    if (this.n < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const n = this.n, P = this.pos, Tt = this.t;
    for (let i = 0; i < TRAIL_N; i++) {
      const k = Math.min(i, n - 1), k2 = Math.min(k + 1, n - 1), k0 = Math.max(k - 1, 0);
      let dx = this.xs[k0] - this.xs[k2], dy = this.ys[k0] - this.ys[k2]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const t = k / (n - 1), w = this.width * (1 - t * 0.85);
      const o = i * 6;
      P[o] = this.xs[k] - dy * w; P[o + 1] = this.ys[k] + dx * w; P[o + 2] = 0;
      P[o + 3] = this.xs[k] + dy * w; P[o + 4] = this.ys[k] - dx * w; P[o + 5] = 0;
      Tt[i * 2] = Tt[i * 2 + 1] = i >= n ? 1 : t;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.aT.needsUpdate = true;
    this.mat.uniforms.uAlpha.value = this.alpha * this.fade;
  }
}

export class Projectiles {
  constructor(parent, fx) {
    this.parent = parent; this.fx = fx; this.list = []; this.pool = [];
    this.trails = []; for (let i = 0; i < MAX_TRAILS; i++) this.trails.push(new Trail(parent));
    this.stuck = []; this.api = null; this.hit = { kind: '', x: 0, y: 0, nx: 0, ny: 1, actor: null, part: null };
    this.nrm = { x: 0, y: 1 }; this.ray = { x: 0, y: 0, t: 0 };
  }
  setApi(api) { this.api = api; }
  get active() { return this.list.length; }
  clear() {
    for (const p of this.list) this._free(p); this.list.length = 0;
    for (const s of this.stuck) this.parent.remove(s.mesh); this.stuck.length = 0;
    for (const t of this.trails) { t.busy = false; t.mesh.visible = false; }
  }
  /** Spawn a projectile of arrow type `id`. opts: { owner, parent, data, damageScale } */
  spawn(id, x, y, vx, vy, opts = {}) {
    const def = getArrow(id);
    const p = this.pool.pop() ?? { data: {} };
    p.def = def; p.x = p.px = x; p.y = p.py = y; p.vx = vx; p.vy = vy; p.age = 0; p.alive = true; p.bounces = 0;
    p.owner = opts.owner ?? opts.parent?.owner ?? null; p.damageScale = opts.damageScale ?? 1; p.puffT = 0;
    for (const k in p.data) delete p.data[k]; if (opts.data) Object.assign(p.data, opts.data);
    p.phys = def.physics ?? DEFAULT_PHYS; p.windResist = p.owner?.stats.windResist ?? 0;
    p.mesh = def.createModel(); p.mesh.position.set(x, y, 0); this.parent.add(p.mesh);
    p.trail = this.trails.find((t) => !t.busy) ?? null; p.trail?.start(def, x, y);
    this.list.push(p);
    def.onLaunch?.(p, this.api);
    events.emit('projectile:spawn', p);
    return p;
  }
  /** Fire from an actor at world angle (rad) and power 0..100. */
  launch(actor, arrowId, x, y, angle, power) {
    const sp = launchSpeed(power);
    return this.spawn(arrowId, x, y, Math.cos(angle) * sp, Math.sin(angle) * sp, { owner: actor });
  }
  _free(p) {
    this.parent.remove(p.mesh); p.mesh = null;
    if (p.trail) { p.trail = null; }
    this.pool.push(p);
  }
  _stick(p, x, y) {
    const m = p.mesh; p.mesh = null;
    const a = Math.atan2(p.vy, p.vx);
    m.position.set(x + Math.cos(a) * 0.25, y + Math.sin(a) * 0.25, 0); m.rotation.z = a;
    this.stuck.push({ mesh: m, x, y, t: 0 });
    if (this.stuck.length > MAX_STUCK) { const s = this.stuck.shift(); this.parent.remove(s.mesh); }
  }
  /** Leader projectile (for the camera): the most recently spawned alive one. */
  leader() { return this.list.length ? this.list[this.list.length - 1] : null; }

  update(dt, ctx) {
    const { terrain: T, actors, wind, killY, fallVfx = 'splash', fallSfx = 'splash' } = ctx, api = this.api, h = this.hit;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      if (!p.alive) continue;
      let steps = Math.max(1, Math.ceil(dt / PHYS.substep)); const sdt = dt / steps;
      while (steps-- > 0 && p.alive) {
        p.age += sdt; p.px = p.x; p.py = p.y;
        const cont = p.def.onUpdate ? p.def.onUpdate(p, sdt, api) : true;
        if (!p.alive) break;
        if (cont !== false) stepBody(p, sdt, wind, p.phys, p.windResist);
        // actors
        let hitActor = null, part = null;
        for (const a of actors) {
          if (!a.alive || (a === p.owner && p.age < 0.4)) continue;
          part = hitTestShapes(a.hitShapes, p.x, p.y, 0.04); if (part) { hitActor = a; break; }
        }
        if (hitActor) { h.kind = 'actor'; h.x = p.x; h.y = p.y; h.actor = hitActor; h.part = part; h.nx = -p.vx; h.ny = -p.vy; this._impact(p, h); break; }
        if (T.solid(p.x, p.y)) {
          if (T.raycast(p.px, p.py, p.x, p.y, this.ray)) { h.x = this.ray.x; h.y = this.ray.y; } else { h.x = p.x; h.y = p.y; }
          T.normal(h.x, h.y, this.nrm); h.nx = this.nrm.x; h.ny = this.nrm.y; h.kind = 'terrain'; h.actor = null; h.part = null;
          this._impact(p, h); break;
        }
        if (p.y < killY || p.x < T.x0 - 25 || p.x > T.x1 + 25 || p.age > PHYS.maxFlight) {
          h.kind = 'void'; h.x = p.x; h.y = Math.max(p.y, killY); h.actor = null; h.part = null;
          if (p.def.onImpact) p.def.onImpact(p, h, api); else if (p.y < killY + 1) { api.fx(fallVfx, p.x, killY + 0.4); api.sfx(fallSfx); }
          p.alive = false; break;
        }
      }
      if (p.mesh) { p.mesh.position.set(p.x, p.y, 0); p.mesh.rotation.z = Math.atan2(p.vy, p.vx); }
      if (p.trail) p.trail.push(p.x, p.y);
      if (p.def.trail?.puff && p.alive) { p.puffT += dt; const ev = p.def.trail.puffEvery ?? 0.04; while (p.puffT > ev) { p.puffT -= ev; this.fx.emit(p.def.trail.puff, p.x, p.y); } }
    }
    // reap
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (!p.alive) { this.list.splice(i, 1); if (p.mesh) this._free(p); else this.pool.push(p); }
    }
    // trails: fade out the ones whose projectile is gone
    for (const t of this.trails) {
      if (!t.busy) continue;
      let owned = false; for (const p of this.list) if (p.trail === t) { owned = true; break; }
      if (!owned) { t.fade -= dt * 2.2; if (t.fade <= 0) { t.busy = false; t.mesh.visible = false; continue; } }
      t.write();
    }
    // stuck arrows sink with the terrain (fall if the ground is gone)
    for (const s of this.stuck) {
      s.t += dt;
      if (!T.solid(s.x, s.y) && !T.solid(s.x, s.y - 0.2)) { s.y -= dt * 6; s.mesh.position.y -= dt * 6; s.mesh.rotation.z -= dt * 3; }
    }
  }
  _impact(p, h) {
    const def = p.def, api = this.api;
    let res;
    if (def.onImpact) res = def.onImpact(p, h, api);
    else {
      const d = def.damage ?? {};
      api.explode(h.x, h.y, {
        base: (d.base ?? 30) * p.damageScale, radius: d.radius ?? 1.5, crater: d.crater ?? 1, knockback: d.knockback ?? 4,
        owner: p.owner, direct: h.actor, part: h.part, arrow: def.id,
        vfx: h.actor ? def.vfx?.body : def.vfx?.impact, sfx: h.actor ? def.sfx?.body : def.sfx?.impact, nx: h.nx, ny: h.ny,
      });
      res = 'remove';
    }
    if (res !== 'keep') {
      if (def.stick && h.kind === 'terrain' && p.mesh) this._stick(p, h.x, h.y);
      p.alive = false;
    }
  }
}
