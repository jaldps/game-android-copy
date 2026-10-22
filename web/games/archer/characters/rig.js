// Procedural toon character rig (owner: Characters specialist).
//  RigBuilder  — collects coloured primitive parts bound to named bones and bakes them into ONE SkinnedMesh
//                (one draw call + one shadow call per character).
//  Character   — runtime: procedural animation (idle, walk, aim/draw, release, hit, fall, victory, defeat, dead),
//                two-bone IK for the bow arms, bow + string + nocked arrow, hit shapes, launch point.
// Rig space = the bind pose: standing at the origin, facing +Z, character's LEFT side on +X, arms straight down.
// The game always treats a character as facing +X ("right"); facing left is a mirror (holder.scale.x = -1).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, damp, lerp } from '../core/util.js';

export const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head',
  'upperArmL', 'foreArmL', 'handL', 'upperArmR', 'foreArmR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const PARENT = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
  upperArmL: 'chest', foreArmL: 'upperArmL', handL: 'foreArmL', upperArmR: 'chest', foreArmR: 'upperArmR', handR: 'foreArmR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR' };
const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));

/** Bind-pose joint positions (rig space) from body proportions B. */
export function jointPositions(B) {
  const ank = B.legLen - 0.02 - B.thighLen - B.shinLen;
  const J = {
    root: [0, 0, 0], hips: [0, B.legLen, 0], spine: [0, B.legLen + 0.08, 0], chest: [0, B.waistY, 0],
    neck: [0, B.neckY, 0], head: [0, B.neckY + B.neckLen, 0],
    upperArmL: [B.shoulderW, B.shoulderY, 0], foreArmL: [B.shoulderW, B.shoulderY - B.upperArm, 0], handL: [B.shoulderW, B.shoulderY - B.upperArm - B.foreArm, 0],
    thighL: [B.hipW, B.legLen - 0.02, 0], shinL: [B.hipW, B.legLen - 0.02 - B.thighLen, 0], footL: [B.hipW, ank, 0],
  };
  for (const k of ['upperArm', 'foreArm', 'hand', 'thigh', 'shin', 'foot']) { const p = J[k + 'L']; J[k + 'R'] = [-p[0], p[1], p[2]]; }
  return J;
}

// ---------------------------------------------------------------------------------------------
// Material: standard PBR + per-vertex roughness/metalness/emissive (aPbr), fresnel rim and hit flash.
export function createCharacterMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 });
  const u = { uRim: { value: new THREE.Color(0xfff2dd) }, uRimAmt: { value: 0.32 }, uFlash: { value: new THREE.Color(0xffffff) }, uFlashAmt: { value: 0 } };
  mat.userData.u = u;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aPbr; varying vec3 vPbr;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPbr = aPbr;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPbr; uniform vec3 uRim; uniform float uRimAmt; uniform vec3 uFlash; uniform float uFlashAmt;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vPbr.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPbr.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vPbr.z;')
      .replace('#include <opaque_fragment>', `float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6);
        outgoingLight += uRim * fr * uRimAmt;
        outgoingLight = mix(outgoingLight, uFlash, uFlashAmt);
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'archer-char-v1';
  return mat;
}

// ---------------------------------------------------------------------------------------------
const _c = new THREE.Color();
export class RigBuilder {
  constructor(B) {
    this.B = B; this.J = jointPositions(B); this.parts = [];
  }
  /**
   * Add a part. geo is in RIG space (bind pose) unless opts.local is true (then it is relative to the bone joint).
   * color: hex | (x,y,z)=>hex.  opts: { rough=0.6, metal=0, emissive=0, bind: (x,y,z)=>[boneA, boneB, wB] }
   */
  add(bone, geo, color, opts = {}) {
    if (!(bone in BI)) throw new Error('unknown bone ' + bone);
    if (opts.local) { const p = this.J[bone]; geo.translate(p[0], p[1], p[2]); }
    if (geo.index === null) geo = geo; // non-indexed supported as-is
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    const pos = geo.attributes.position, n = pos.count;
    const col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), pbr = new Float32Array(n * 3);
    const fn = typeof color === 'function' ? color : null; if (!fn) _c.set(color).convertSRGBToLinear();
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (fn) _c.set(fn(x, y, z)).convertSRGBToLinear();
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
      if (opts.bind) { const [a, b, w] = opts.bind(x, y, z); si[i * 4] = BI[a]; si[i * 4 + 1] = BI[b]; sw[i * 4] = 1 - w; sw[i * 4 + 1] = w; }
      else { si[i * 4] = BI[bone]; sw[i * 4] = 1; }
      pbr[i * 3] = opts.rough ?? 0.62; pbr[i * 3 + 1] = opts.metal ?? 0; pbr[i * 3 + 2] = opts.emissive ?? 0;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.setAttribute('aPbr', new THREE.BufferAttribute(pbr, 3));
    this.parts.push(geo.index ? geo : geo);
    return geo;
  }
  /** Same as add() for a geometry built relative to a bone joint (e.g. a hand mitten at the wrist). */
  addLocal(bone, geo, color, opts = {}) { return this.add(bone, geo, color, { ...opts, local: true }); }
  /** Symmetric helper: geo built for the LEFT side (+x); adds it to boneL and a mirrored copy to boneR. */
  addPair(boneBase, geoL, color, opts = {}) {
    const g2 = geoL.clone(); g2.scale(-1, 1, 1); flipWinding(g2);
    this.add(boneBase + 'L', geoL, color, opts); this.add(boneBase + 'R', g2, color, opts);
  }
  build(material) {
    const indexed = this.parts.map((g) => (g.index ? g : indexify(g)));
    const geo = mergeGeometries(indexed, false);
    geo.computeBoundingSphere();
    const bones = BONES.map((name) => { const b = new THREE.Bone(); b.name = name; return b; });
    BONES.forEach((name, i) => {
      const p = this.J[name], par = PARENT[name];
      if (par) { const q = this.J[par]; bones[i].position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); bones[BI[par]].add(bones[i]); }
      else bones[i].position.set(p[0], p[1], p[2]);
      bones[i].rotation.order = 'YXZ';
    });
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
    return { mesh, bones };
  }
}
function flipWinding(g) {
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.index.needsUpdate = true; }
  const n = g.attributes.normal; if (n) for (let i = 0; i < n.count; i++) n.setX(i, n.getX(i)); // normals already mirrored by scale()
  return g;
}
function indexify(g) { const n = g.attributes.position.count, idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); return g; }

// ---------------------------------------------------------------------------------------------
// Runtime
const ARM_BONES = ['upperArmL', 'foreArmL', 'upperArmR', 'foreArmR'];
const ANIMS = ['idle', 'pose', 'walk', 'aim', 'release', 'hit', 'fall', 'victory', 'defeat', 'dead'];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(), _pole = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0), YAXIS = new THREE.Vector3(0, 1, 0), ZAXIS = new THREE.Vector3(0, 0, 1);

export class Character {
  /**
   * @param {object} parts  { mesh, bones } from RigBuilder.build
   * @param {object} B      body proportions
   * @param {object} bow    { group, setString(stringX), length } from buildBow (bow-local: grip at origin, arrow along +X)
   */
  constructor(parts, B, bow, def) {
    this.def = def; this.B = B;
    this.root = new THREE.Group(); this.root.name = 'character:' + def.id;
    this.tilt = new THREE.Group(); this.yawNode = new THREE.Group();
    this.root.add(this.tilt); this.tilt.add(this.yawNode);
    this.mesh = parts.mesh; this.bones = {}; parts.bones.forEach((b) => (this.bones[b.name] = b));
    this.yawNode.add(this.mesh);
    this.boneList = parts.bones; this.rest = parts.bones.map((b) => b.position.clone());
    this.rig = parts.bones.map(() => new THREE.Matrix4());
    this.cur = new Float32Array(BONES.length * 3); this.tgt = new Float32Array(BONES.length * 3);
    this.bow = bow; this.bowNode = new THREE.Group(); this.bowNode.add(bow.group); this.yawNode.add(this.bowNode);
    this.nock = new THREE.Group(); bow.group.add(this.nock); this.nocked = null;
    this.S = def.scale ?? 1.2;                       // global hero scale (world units = rig units * S)
    this.root.scale.setScalar(this.S);
    this.facing = 1; this.anim = 'idle'; this.animT = 0; this.t = Math.random() * 10;
    this.aimAngle = 0.6; this.draw = 0; this.aimBlend = 0; this.walkPhase = 0; this.walkSpeed = 0;
    this.yaw = 0.95; this.hitK = 0; this.flashT = 0; this.releaseT = 9; this.hipsDY = 0; this.tiltZ = 0; this.tiltY = 0;
    const S0 = def.scale ?? 1.2;
    this.hitShapes = { hx: 0, hy: 0, hr: B.headR * 1.2 * S0, ax: 0, ay: 0, bx: 0, by: 0, br: (B.bodyR ?? 0.3) * S0 };
    this.height = (B.neckY + B.neckLen + B.headR * 2) * S0;
    this.material = this.mesh.material;
    this._t1 = new THREE.Vector3(); this._t2 = new THREE.Vector3(); this._pl = new THREE.Vector3(); this._S = new THREE.Vector3();
  }
  setFacing(f) { this.facing = f >= 0 ? 1 : -1; this.root.scale.x = this.facing * this.S; }
  /** Anim names: idle | walk | aim | release | hit | fall | victory | defeat | dead */
  setAnim(name) { if (name !== this.anim && ANIMS.includes(name)) { this.anim = name; this.animT = 0; if (name === 'release') this.releaseT = 0; } }
  /** Aim angle in WORLD radians (0 = +x, PI/2 = up); draw 0..1. */
  setAim(angle, draw) { this.aimAngle = angle; this.draw = clamp(draw, 0, 1); }
  setWalkSpeed(s) { this.walkSpeed = s; }
  hit(strength = 1) { this.hitK = Math.min(1.4, this.hitK + strength); this.flashT = 0.16; }
  /** Attach the arrow model shown on the string (or null). Model convention: tip at origin, shaft along -X. */
  setNockedArrow(obj) {
    if (this.nocked === obj) return;
    if (this.nocked) this.nock.remove(this.nocked);
    this.nocked = obj; if (obj) this.nock.add(obj);
  }
  _rigAngle() { return this.facing > 0 ? this.aimAngle : Math.PI - this.aimAngle; }

  // ---- pose targets (euler XYZ-ish per bone, order YXZ) ----
  _set(name, x, y, z) { const i = BI[name] * 3; this.tgt[i] = x; this.tgt[i + 1] = y; this.tgt[i + 2] = z; }
  _pose(dt) {
    this.tgt.fill(0);
    const t = this.t, a = this.anim, B = this.B;
    let hipsDY = 0, yaw = 0.95, tiltZ = 0, tiltY = 0;
    const br = Math.sin(t * 2.1);
    // idle baseline
    this._set('spine', 0.03 * br, 0, 0); this._set('chest', 0.02 * br, 0, 0); this._set('neck', -0.02 * br, 0, 0);
    this._set('head', 0.03 * Math.sin(t * 0.9), 0.18 * Math.sin(t * 0.37), 0);
    this._set('upperArmL', 0.06, 0, 0.14 + 0.02 * br); this._set('upperArmR', 0.06, 0, -0.14 - 0.02 * br);
    this._set('foreArmL', -0.25, 0, 0); this._set('foreArmR', -0.25, 0, 0);
    this._set('thighL', -0.04, 0, 0.04); this._set('thighR', 0.06, 0, -0.06); this._set('shinR', 0.08, 0, 0);
    hipsDY = 0.008 * br;
    if (a === 'walk') {
      const p = this.walkPhase, s = Math.sin(p), c = Math.cos(p);
      this._set('thighL', -0.62 * s - 0.08, 0, 0.02); this._set('thighR', 0.62 * s - 0.08, 0, -0.02);
      this._set('shinL', Math.max(0, -c) * 1.0 + 0.1, 0, 0); this._set('shinR', Math.max(0, c) * 1.0 + 0.1, 0, 0);
      this._set('footL', 0.25 * s, 0, 0); this._set('footR', -0.25 * s, 0, 0);
      this._set('upperArmL', 0.5 * s, 0, 0.12); this._set('upperArmR', -0.5 * s, 0, -0.12);
      this._set('foreArmL', -0.45, 0, 0); this._set('foreArmR', -0.45, 0, 0);
      this._set('hips', 0, 0.16 * s, 0); this._set('chest', 0.08, -0.22 * s, 0); this._set('spine', 0.06, 0, 0);
      hipsDY = -0.05 * Math.abs(c) + 0.02;
    } else if (a === 'pose') {                       // menu / shop showcase: confident stance facing the camera
      yaw = 0.42 + Math.sin(t * 0.4) * 0.08;
      this._set('thighL', -0.06, 0, 0.12); this._set('thighR', 0.04, 0, -0.16); this._set('shinL', 0.08, 0, 0);
      this._set('hips', 0, 0, 0.05); this._set('spine', 0.02 * br, 0, -0.04); this._set('chest', 0.02 * br, -0.1, 0.03);
      this._set('upperArmR', 0.15, 0, -0.62); this._set('foreArmR', -0.35, 0, 1.75);
      this._set('upperArmL', 0.1, 0, 0.18); this._set('foreArmL', -0.3, 0, 0);
      this._set('head', -0.06 + 0.03 * Math.sin(t * 0.9), -0.25 + 0.12 * Math.sin(t * 0.37), 0.08);
      hipsDY = 0.006 * br;
    } else if (a === 'fall') {
      const f = Math.sin(t * 14);
      this._set('upperArmL', -0.3, 0, 2.2 + 0.25 * f); this._set('upperArmR', -0.3, 0, -2.2 - 0.25 * f);
      this._set('foreArmL', -0.5, 0, 0); this._set('foreArmR', -0.5, 0, 0);
      this._set('thighL', -0.7, 0, 0.1); this._set('thighR', -0.2, 0, -0.1); this._set('shinL', 1.1, 0, 0); this._set('shinR', 0.7, 0, 0);
      this._set('spine', -0.15, 0, 0); this._set('head', -0.2, 0, 0);
    } else if (a === 'victory') {
      const hop = Math.abs(Math.sin(this.animT * 5.5));
      hipsDY = hop * 0.22;
      this._set('upperArmL', -0.2, 0, 2.7); this._set('foreArmL', -0.2, 0, 0);
      this._set('upperArmR', -0.6 - 0.4 * hop, 0, -0.5); this._set('foreArmR', -1.9, 0, 0);
      this._set('thighL', -0.2 - hop * 0.4, 0, 0.12); this._set('thighR', -0.1, 0, -0.12); this._set('shinL', hop * 0.8, 0, 0);
      this._set('spine', -0.08, 0, 0); this._set('head', -0.25, 0.4, 0); yaw = 0.45;
    } else if (a === 'defeat') {
      hipsDY = -0.42;
      this._set('thighL', -1.5, 0, 0.1); this._set('shinL', 1.55, 0, 0); this._set('thighR', -0.15, 0, -0.1); this._set('shinR', 1.95, 0, 0); this._set('footR', 0.6, 0, 0);
      this._set('spine', 0.35, 0, 0); this._set('chest', 0.2, 0, 0); this._set('head', 0.45, 0, 0);
      this._set('upperArmL', 0.3, 0, 0.1); this._set('upperArmR', 0.2, 0, -0.1); this._set('foreArmL', -0.4, 0, 0); this._set('foreArmR', -0.3, 0, 0);
      yaw = 0.6;
    } else if (a === 'dead') {
      tiltZ = Math.PI / 2 * 0.96; tiltY = (B.bodyR ?? 0.25) * 0.9;
      this._set('upperArmL', -0.2, 0, 1.4); this._set('upperArmR', 0.2, 0, -0.9); this._set('foreArmL', -0.3, 0, 0);
      this._set('thighL', -0.3, 0, 0.1); this._set('shinL', 0.6, 0, 0); this._set('head', -0.3, 0, 0.3);
      yaw = 0.15;
    }
    const aiming = a === 'aim' || (a === 'release' && this.releaseT < 0.45);
    this.aimBlend = damp(this.aimBlend, aiming ? 1 : 0, 12, dt);
    if (this.aimBlend > 0.001) {
      const k = this.aimBlend, ang = this._rigAngle();
      yaw = lerp(yaw, 0.32, k);
      // archer stance
      this._mix('thighL', -0.18, 0, 0.2, k); this._mix('thighR', 0.12, 0, -0.18, k); this._mix('shinL', 0.12, 0, 0, k); this._mix('shinR', 0.1, 0, 0, k);
      this._mix('spine', -0.05, 0.05, -0.05 * Math.sin(ang), k); this._mix('chest', -0.06, 0.08, 0, k);
      this._mix('head', -clamp(ang - 0.2, -0.6, 1.2) * 0.45, 1.05, -0.12, k);
      hipsDY = lerp(hipsDY, -0.04, k);
    }
    // hit reaction (additive): lean back + head snap
    if (this.hitK > 0.001) {
      const h = this.hitK;
      this.tgt[BI.spine * 3] -= 0.45 * h; this.tgt[BI.chest * 3] -= 0.3 * h; this.tgt[BI.head * 3] -= 0.5 * h;
      this.tgt[BI.upperArmL * 3 + 2] += 0.6 * h; this.tgt[BI.upperArmR * 3 + 2] -= 0.6 * h;
    }
    this.hipsDY = damp(this.hipsDY, hipsDY, 16, dt);
    this.yaw = damp(this.yaw, yaw, 10, dt);
    this.tiltZ = damp(this.tiltZ, tiltZ, 7, dt); this.tiltY = damp(this.tiltY, tiltY, 7, dt);
  }
  _mix(name, x, y, z, k) { const i = BI[name] * 3, T = this.tgt; T[i] += (x - T[i]) * k; T[i + 1] += (y - T[i + 1]) * k; T[i + 2] += (z - T[i + 2]) * k; }

  _rigMatrices() {
    const L = this.boneList;
    for (let i = 0; i < L.length; i++) {
      const b = L[i]; b.updateMatrix();
      const p = PARENT[BONES[i]];
      if (p) this.rig[i].multiplyMatrices(this.rig[BI[p]], b.matrix); else this.rig[i].copy(b.matrix);
    }
  }
  /** Two-bone IK in rig space: aim bone chain (upper, fore) so the wrist reaches target; pole biases the elbow. */
  _ik(upper, fore, target, pole) {
    const iu = BI[upper], ifo = BI[fore], ip = BI[PARENT[upper]];
    const l1 = this.rest[ifo].length(), l2 = this.rest[BI[fore.replace('foreArm', 'hand')]].length();
    const S = _v.setFromMatrixPosition(this.rig[iu]);
    _d.subVectors(target, S); let dist = _d.length();
    dist = clamp(dist, 0.05, (l1 + l2) * 0.999); _d.normalize();
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    _pole.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
    const E = _v2.copy(S).addScaledVector(_d, a).addScaledVector(_pole, h);
    const T = _v3.copy(S).addScaledVector(_d, dist);
    // upper: parent rig rotation^-1 * fromUnitVectors(down, E-S)
    _q.setFromRotationMatrix(this.rig[ip]).invert();
    _q2.setFromUnitVectors(DOWN, _v4.subVectors(E, S).normalize());
    const bu = this.boneList[iu]; bu.quaternion.multiplyQuaternions(_q, _q2);
    _qa.copy(_q2); // rig rotation of upper
    _q.copy(_qa).invert();
    _q2.setFromUnitVectors(DOWN, _v4.subVectors(T, E).normalize());
    this.boneList[ifo].quaternion.multiplyQuaternions(_q, _q2);
  }

  update(dt) {
    this.t += dt; this.animT += dt; this.releaseT += dt;
    this.hitK = damp(this.hitK, 0, 5, dt);
    if (this.anim === 'walk') this.walkPhase += dt * (5.5 + this.walkSpeed * 1.6);
    this._pose(dt);
    // damp current toward targets and write bone rotations
    const C = this.cur, T = this.tgt, L = this.boneList, k = 1 - Math.exp(-16 * dt);
    for (let i = 0; i < L.length; i++) {
      const o = i * 3; C[o] += (T[o] - C[o]) * k; C[o + 1] += (T[o + 1] - C[o + 1]) * k; C[o + 2] += (T[o + 2] - C[o + 2]) * k;
      L[i].rotation.set(C[o], C[o + 1], C[o + 2]);
    }
    L[BI.hips].position.y = this.rest[BI.hips].y + this.hipsDY;
    this.yawNode.rotation.y = this.yaw;
    this.tilt.rotation.z = this.tiltZ; this.tilt.position.y = this.tiltY;
    this._rigMatrices();

    // ---- bow arms ----
    const kA = this.aimBlend, ang = this._rigAngle(), yaw = this.yaw;
    // aim direction (holder xy plane) -> rig space (undo yaw)
    _d.set(Math.cos(ang), Math.sin(ang), 0).applyAxisAngle(YAXIS, -yaw);
    const aimDir = _v4.copy(_d); // careful: _v4 reused below — copy into locals
    const ax = aimDir.x, ay = aimDir.y, az = aimDir.z;
    const S = this._S.setFromMatrixPosition(this.rig[BI.upperArmL]);
    if (kA > 0.01) {
      const reach = (this.rest[BI.foreArmL].length() + this.rest[BI.handL].length()) * 0.96;
      const T1 = this._t1.set(S.x + ax * reach, S.y + ay * reach, S.z + az * reach);
      this._pl.set(0, -1, -0.4);
      this._ik('upperArmL', 'foreArmL', T1, this._pl);
      const stringX = -0.1 - (this.bow.drawLen ?? 0.6) * this.draw;
      const T2 = this._t2.set(T1.x + ax * stringX, T1.y + ay * stringX, T1.z + az * stringX + 0.05);
      this._pl.set(-ax, 0.6 - ay * 0.3, -0.5);
      this._ik('upperArmR', 'foreArmR', T2, this._pl);
      // blend IK result with the FK pose by aimBlend
      if (kA < 0.999) for (let q = 0; q < ARM_BONES.length; q++) { const n = ARM_BONES[q];
        const b = this.boneList[BI[n]], o = BI[n] * 3; _qc.copy(b.quaternion); b.rotation.set(C[o], C[o + 1], C[o + 2]); b.quaternion.slerp(_qc, kA);
      }
      this._rigMatrices();
    }
    // ---- bow placement ----
    const hand = _v.setFromMatrixPosition(this.rig[BI.handL]);
    _q.setFromRotationMatrix(this.rig[BI.handL]); // carry: hand rotation * (arrow axis forward, limbs vertical)
    _q2.setFromAxisAngle(YAXIS, -Math.PI / 2); _qc.multiplyQuaternions(_q, _q2);
    _qa.setFromAxisAngle(ZAXIS, ang); _q.setFromAxisAngle(YAXIS, -yaw); _qa.premultiply(_q);
    this.bowNode.quaternion.copy(_qc).slerp(_qa, kA);
    this.bowNode.position.copy(hand).addScaledVector(_d.set(ax, ay, az), 0.02 * kA);
    const sx = -0.1 - (this.bow.drawLen ?? 0.6) * this.draw * kA;
    this.bow.setString(sx + (this.releaseT < 0.25 ? Math.sin(this.releaseT * 60) * 0.04 * (1 - this.releaseT * 4) : 0));
    this.nock.position.set(sx + (this.bow.arrowLen ?? 1.0), 0, 0.0);
    this.nock.visible = kA > 0.5 && this.anim === 'aim';
    // ---- flash ----
    this.flashT = Math.max(0, this.flashT - dt);
    this.material.userData.u.uFlashAmt.value = this.flashT > 0 ? Math.min(0.75, this.flashT * 6) : 0;
    // ---- hit shapes (world) ----
    const hs = this.hitShapes, B = this.B;
    this._toWorld(_v.setFromMatrixPosition(this.rig[BI.head]).add(_v2.set(0, B.headR * 0.95, 0).applyQuaternion(_q.setFromRotationMatrix(this.rig[BI.head]))), _v3);
    hs.hx = _v3.x; hs.hy = _v3.y;
    this._toWorld(_v.setFromMatrixPosition(this.rig[BI.hips]), _v3); hs.ax = _v3.x; hs.ay = _v3.y;
    this._toWorld(_v.setFromMatrixPosition(this.rig[BI.neck]), _v3); hs.bx = _v3.x; hs.by = _v3.y;
  }
  /** rig space -> world (uses the holder transform, avoids a full matrixWorld update). */
  _toWorld(p, out) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy, y1 = p.y;
    const ct = Math.cos(this.tiltZ), st = Math.sin(this.tiltZ);
    const x2 = x1 * ct - y1 * st, y2 = x1 * st + y1 * ct + this.tiltY;
    const S = this.S;
    out.set(this.root.position.x + x2 * this.facing * S, this.root.position.y + y2 * S, this.root.position.z + z1 * S);
    return out;
  }
  /** World launch point of the arrow (writes out.x/out.y). */
  getMuzzle(out) {
    const ang = this._rigAngle();
    _d.set(Math.cos(ang), Math.sin(ang), 0).applyAxisAngle(YAXIS, -this.yaw);
    this._toWorld(_v.copy(this.bowNode.position).addScaledVector(_d, 0.3), _v3);
    out.x = _v3.x; out.y = _v3.y; return out;
  }
  dispose() { this.mesh.geometry.dispose(); this.material.dispose(); this.bow.dispose?.(); }
}
