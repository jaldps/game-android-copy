// Generic stylized body + clothing helpers + bow (owner: Characters specialist).
// buildBody(rig, def, colors) builds skin body parts from def.body proportions. Outfits then add clothing shells via the
// ctx helpers (torsoShell / limbShell / ...). Everything is built in RIG space (bind pose, facing +Z, left = +X).
import * as THREE from 'three';
import { limb, ball, box, cyl, tube, xf } from './parts.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Closed loft through elliptical rings rows = [[y, rx, rz, zOffset], ...] (bottom -> top). */
export function loft(rows, seg = 22, open = false) {
  const pos = [], idx = [], R = rows.length;
  for (let i = 0; i < R; i++) {
    const [y, rx, rz, zo = 0] = rows[i];
    for (let j = 0; j <= seg; j++) { const a = Math.PI + (j / seg) * Math.PI * 2; pos.push(Math.sin(a) * rx, y, Math.cos(a) * rz + zo); }
  }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  if (!open) {
    const bot = pos.length / 3; const r0 = rows[0]; pos.push(0, r0[0] - Math.min(r0[1], r0[2]) * 0.4, r0[3] ?? 0);
    for (let j = 0; j < seg; j++) idx.push(bot, j, j + 1);
    const top = pos.length / 3; const rt = rows[R - 1]; pos.push(0, rt[0] + Math.min(rt[1], rt[2]) * 0.4, rt[3] ?? 0);
    const o = (R - 1) * (seg + 1); for (let j = 0; j < seg; j++) idx.push(top, o + j + 1, o + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** Interpolate torso rows at height y. */
export function rowAt(rows, y) {
  if (y <= rows[0][0]) return rows[0].slice();
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    if (y <= b[0]) { const t = (y - a[0]) / (b[0] - a[0]); return [y, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * t]; }
  }
  return rows[rows.length - 1].slice();
}
/** Skin binding for anything on the torso: hips -> spine -> chest -> neck with soft blends. */
export function torsoBind(B) {
  return (x, y) => {
    if (y < B.legLen + 0.1) return ['hips', 'spine', ss(B.legLen - 0.02, B.legLen + 0.1, y)];
    if (y < B.neckY - 0.04) return ['spine', 'chest', ss(B.waistY - 0.07, B.waistY + 0.07, y)];
    return ['chest', 'neck', ss(B.neckY - 0.04, B.neckY + 0.04, y)];
  };
}

/** Build the clothing/shape context handed to outfit and character builders. */
export function makeCtx(rig, def, colors) {
  const B = def.body, J = rig.J, bindT = torsoBind(B);
  const ctx = {
    rig, B, J, C: colors, def,
    /** Clothing band around the torso between heights y0..y1, inflated by `inf`. opts.rows overrides torso rows. */
    torsoShell(y0, y1, color, inf = 0.014, opts = {}) {
      const src = opts.rows ?? B.torso, rows = [];
      const steps = Math.max(2, Math.ceil((y1 - y0) / 0.035));
      for (let i = 0; i <= steps; i++) {
        const r = rowAt(src, y0 + (y1 - y0) * (i / steps));
        const flare = opts.flare ? opts.flare(i / steps) : 0;
        rows.push([r[0], r[1] + inf + flare, r[2] + inf + flare * 0.8, r[3]]);
      }
      return rig.add('spine', loft(rows, 24, !opts.closed), color, { ...opts, bind: bindT });
    },
    /** Band around a limb segment (both sides by default). seg: upperArm|foreArm|thigh|shin. from/to are 0..1 along the bone. */
    limbShell(seg, from, to, color, inf = 0.014, opts = {}) {
      const S = B[seg + 'R'] ?? [0.08, 0.06], len = boneLen(B, seg);
      const r = (f) => S[0] + (S[1] - S[0]) * f + inf + (opts.flare ? opts.flare * (f - from) / Math.max(0.01, to - from) : 0);
      const h = (to - from) * len;
      for (const side of opts.side ? [opts.side] : ['L', 'R']) {
        const g = cyl(r(from), r(to), h, 16, true);
        const p = J[seg + side];
        g.translate(p[0], p[1] - (from * len + h / 2), p[2]);
        rig.add(seg + side, g, color, opts);
      }
    },
    /** Add a geometry built for the LEFT side at a joint (local), mirrored to the right. */
    pair(bone, geo, color, opts = {}) {
      const gL = geo.clone(); const pL = J[bone + 'L']; gL.translate(pL[0], pL[1], pL[2]);
      const gR = geo.clone(); gR.scale(-1, 1, 1); flip(gR); const pR = J[bone + 'R']; gR.translate(pR[0], pR[1], pR[2]);
      rig.add(bone + 'L', gL, color, opts); rig.add(bone + 'R', gR, color, opts);
    },
    add(bone, geo, color, opts) { return rig.add(bone, geo, color, opts); },
    addLocal(bone, geo, color, opts) { return rig.addLocal(bone, geo, color, opts); },
    torsoBind: bindT,
    headPos() { const p = J.head; return [p[0], p[1] + B.headR * 0.95, p[2]]; },
  };
  return ctx;
}
function flip(g) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
export function boneLen(B, seg) { return { upperArm: B.upperArm, foreArm: B.foreArm, thigh: B.thighLen, shin: B.shinLen }[seg]; }

/** Skin body: torso loft, pelvis, neck, head base, arms, hands, legs, feet. Clothing comes from the outfit. */
export function buildBody(ctx) {
  const { rig, B, J, C } = ctx;
  const skin = C.skin;
  // torso
  rig.add('spine', loft(B.torso, 26), skin, { bind: ctx.torsoBind, rough: 0.55 });
  for (const s of B.extras ?? []) {               // pecs, bust, glutes, traps... [bone, [x,y,z], [rx,ry,rz], colorKey]
    const g = ball(s[2][0], s[2][1], s[2][2], 18); g.translate(s[1][0], s[1][1], s[1][2]);
    rig.add(s[0] === 'torso' ? 'spine' : s[0], g, C[s[3] ?? 'skin'] ?? s[3], { bind: s[0] === 'torso' ? ctx.torsoBind : undefined, rough: 0.55 });
  }
  // neck
  { const p = J.neck, g = cyl(B.neckR * 0.95, B.neckR * 1.15, B.neckLen + 0.12, 14); g.translate(p[0], p[1] + B.neckLen * 0.5, p[2] - 0.01); rig.add('neck', g, skin, { rough: 0.55 }); }
  // arms (deltoid, upper, fore, hand)
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1, ua = J['upperArm' + side], fa = J['foreArm' + side], ha = J['hand' + side];
    let g = ball(B.deltR ?? B.upperArmR[0] * 1.25, (B.deltR ?? B.upperArmR[0] * 1.25) * 1.05, B.deltR ?? B.upperArmR[0] * 1.25, 16); g.translate(ua[0] + sg * 0.01, ua[1] - 0.02, ua[2]);
    rig.add('upperArm' + side, g, skin);
    g = limb(B.upperArmR[0], B.upperArmR[1], B.upperArm, 16); g.translate(ua[0], ua[1], ua[2]); rig.add('upperArm' + side, g, skin);
    if (B.bicep) { g = ball(B.bicep[0], B.bicep[1], B.bicep[2], 14); g.translate(ua[0], ua[1] - B.upperArm * 0.45, ua[2] + 0.03); rig.add('upperArm' + side, g, skin); }
    g = limb(B.foreArmR[0], B.foreArmR[1], B.foreArm, 16); g.translate(fa[0], fa[1], fa[2]); rig.add('foreArm' + side, g, skin);
    // mitten hand + thumb
    const hr = B.handR;
    g = ball(hr * 0.75, hr * 1.25, hr, 14); g.translate(ha[0], ha[1] - hr * 0.95, ha[2] + 0.01); rig.add('hand' + side, g, C.gloves && C.handsGloved ? C.gloves : skin);
    g = ball(hr * 0.32, hr * 0.6, hr * 0.32, 10); xf(g, [ha[0] + sg * 0.0, ha[1] - hr * 0.6, ha[2] + hr * 0.8], [0.5, 0, 0]); rig.add('hand' + side, g, C.gloves && C.handsGloved ? C.gloves : skin);
  }
  // legs
  for (const side of ['L', 'R']) {
    const th = J['thigh' + side], sh = J['shin' + side], ft = J['foot' + side];
    let g = limb(B.thighR[0], B.thighR[1], B.thighLen + 0.04, 16); g.translate(th[0], th[1] + 0.02, th[2]); rig.add('thigh' + side, g, skin);
    g = limb(B.shinR[0], B.shinR[1], B.shinLen, 16); g.translate(sh[0], sh[1], sh[2]); rig.add('shin' + side, g, skin);
    if (B.calf) { g = ball(B.calf, B.calf * 1.9, B.calf, 12); g.translate(sh[0], sh[1] - B.shinLen * 0.32, sh[2] - 0.02); rig.add('shin' + side, g, skin); }
    // foot (bare/boot base): rounded wedge
    g = box(B.footW, B.footH, B.footL, 0.04); g.translate(ft[0], ft[1] - B.footH * 0.35, ft[2] + B.footL * 0.28); rig.add('foot' + side, g, C.boots ?? skin, { rough: 0.5 });
  }
}

/** Head base: skull, jaw, ears, nose, eyes with iris/pupil/highlight, brows, mouth. Face details from def.face. */
export function buildHead(ctx, F = {}) {
  const { rig, B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
  const add = (g, col, o) => rig.add('head', g, col, o);
  // skull + jaw
  let g = ball(R * (F.skullX ?? 0.92), R * (F.skullY ?? 1.0), R * (F.skullZ ?? 0.98), 22); g.translate(hx, hy, hz); add(g, C.skin, { rough: 0.5 });
  g = ball(R * (F.jawX ?? 0.72), R * (F.jawY ?? 0.55), R * (F.jawZ ?? 0.75), 18); g.translate(hx, hy - R * 0.45, hz + R * 0.12); add(g, F.jawColor ?? C.skin, { rough: 0.5 });
  if (F.chin) { g = ball(R * 0.3, R * 0.25, R * 0.3, 12); g.translate(hx, hy - R * 0.85, hz + R * 0.42); add(g, F.jawColor ?? C.skin); }
  // ears
  for (const s of [1, -1]) { g = ball(R * 0.14, R * 0.24, R * 0.1, 10); g.translate(hx + s * R * 0.9, hy - R * 0.08, hz - R * 0.05); add(g, C.skin); }
  // nose
  g = ball(R * 0.13, R * 0.18, R * 0.16, 10); g.translate(hx, hy - R * 0.2, hz + R * 0.96); add(g, C.skin);
  // eyes
  const ex = R * (F.eyeSpread ?? 0.36), ey = hy + R * (F.eyeY ?? 0.02), ez = hz + R * 0.8, es = R * (F.eyeSize ?? 0.2);
  for (const s of [1, -1]) {
    g = ball(es * 0.95, es * (F.eyeTall ?? 1.15), es * 0.55, 14); g.translate(hx + s * ex, ey, ez); add(g, 0xffffff, { rough: 0.2 });
    g = ball(es * 0.62, es * 0.75 * (F.eyeTall ?? 1.15), es * 0.35, 12); g.translate(hx + s * ex * 0.97, ey - es * 0.05, ez + es * 0.3); add(g, C.eyes, { rough: 0.15 });
    g = ball(es * 0.32, es * 0.42, es * 0.2, 10); g.translate(hx + s * ex * 0.97, ey - es * 0.05, ez + es * 0.48); add(g, 0x0c0a12, { rough: 0.1 });
    g = ball(es * 0.17, es * 0.17, es * 0.1, 8); g.translate(hx + s * ex * 0.97 + es * 0.22, ey + es * 0.28, ez + es * 0.56); add(g, 0xffffff, { rough: 0.1, emissive: 0.6 });
    // brow
    g = box(es * 2.1, es * (F.browThick ?? 0.38), es * 0.4, 0.015); xf(g, [hx + s * ex, ey + es * (F.browY ?? 1.55), ez + es * 0.25], [0.2, -s * 0.25, s * (F.browTilt ?? -0.18)]); add(g, C.brow ?? C.hair);
    if (F.lashes) { g = box(es * 2.0, es * 0.28, es * 0.3, 0.01); xf(g, [hx + s * ex, ey + es * 1.05, ez + es * 0.38], [0.3, -s * 0.2, s * -0.12]); add(g, 0x1a1016); g = box(es * 0.6, es * 0.22, es * 0.25, 0.01); xf(g, [hx + s * (ex + es * 1.0), ey + es * 0.95, ez + es * 0.1], [0, -s * 0.6, s * 0.5]); add(g, 0x1a1016); }
  }
  // mouth
  const my = hy - R * 0.52, mz = hz + R * 0.83;
  if (F.lips) {
    g = ball(R * 0.24, R * 0.07, R * 0.08, 12); g.translate(hx, my + R * 0.04, mz); add(g, F.lips, { rough: 0.35 });
    g = ball(R * 0.22, R * 0.08, R * 0.08, 12); g.translate(hx, my - R * 0.06, mz - 0.003); add(g, F.lips, { rough: 0.35 });
  } else {
    g = box(R * (F.mouthW ?? 0.42), R * 0.07, R * 0.08, 0.01); xf(g, [hx, my, mz], [0, 0, F.smirk ?? 0.12]); add(g, 0x5a2a28);
  }
}

/** Recurve bow. Returns { group, setString(x), drawLen, arrowLen, dispose }. Bow-local: grip at origin, arrow along +X, limbs ±Y. */
export function buildBow(o = {}) {
  const L = o.length ?? 0.6, wood = o.wood ?? 0x7a4528, trim = o.trim ?? 0xf0c050, grip = o.grip ?? 0x3a2418;
  const group = new THREE.Group(); group.name = 'bow';
  const mat = new THREE.MeshStandardMaterial({ color: wood, roughness: 0.45, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.3, metalness: 0.8 });
  const gripMat = new THREE.MeshStandardMaterial({ color: grip, roughness: 0.8 });
  const limbPts = (s) => [[0.0, 0.08 * s, 0], [-0.05, 0.3 * s * L / 0.72, 0], [-0.07, 0.55 * s * L / 0.72, 0], [-0.02, 0.69 * s * L / 0.72, 0], [0.07, 0.76 * s * L / 0.72, 0]];
  const geos = [tube(limbPts(1), 0.034, 0.014, 18, 8), tube(limbPts(-1), 0.034, 0.014, 18, 8)];
  const limbs = new THREE.Mesh(mergeIdx(geos), mat); limbs.castShadow = true; group.add(limbs);
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.2, 10), gripMat); group.add(gr);
  for (const s of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), trimMat); cap.position.set(0.07, 0.76 * s * L / 0.72, 0); group.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 14), trimMat); band.position.set(0, 0.11 * s, 0); band.rotation.x = Math.PI / 2; group.add(band);
  }
  if (o.gem) { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: o.gem, emissive: o.gem, emissiveIntensity: 0.6, roughness: 0.2 })); gem.position.set(0.04, 0, 0); group.add(gem); }
  const tipY = 0.76 * L / 0.72;
  const sg = new THREE.BufferGeometry(); const arr = new Float32Array([0.07, tipY, 0, -0.1, 0, 0, 0.07, -tipY, 0]);
  sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: o.string ?? 0xfff4dc })); string.frustumCulled = false; group.add(string);
  return {
    group, drawLen: o.drawLen ?? 0.62, arrowLen: 1.3,
    setString(x) { if (arr[3] !== x) { arr[3] = x; sg.attributes.position.needsUpdate = true; } },
    dispose() { group.traverse((m) => { m.geometry?.dispose(); m.material?.dispose?.(); }); },
  };
}
function mergeIdx(gs) {
  const g = new THREE.BufferGeometry(); let off = 0; const pos = [], nor = [], idx = [];
  for (const s of gs) { const p = s.attributes.position.array, n = s.attributes.normal.array; pos.push(...p); nor.push(...n); for (const i of s.index.array) idx.push(i + off); off += p.length / 3; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
