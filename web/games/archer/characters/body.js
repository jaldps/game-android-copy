// Generic stylized body + clothing helpers + bow (owner: Characters specialist).
// buildBody(rig, def, colors) builds skin body parts from def.body proportions. Outfits then add clothing shells via the
// ctx helpers (torsoShell / limbShell / ...). Everything is built in RIG space (bind pose, facing +Z, left = +X).
import * as THREE from 'three';
import { ball, box, tube, torus, blade, dome, xf, tint, mix } from './parts.js';

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

// ---------------------------------------------------------------------------------------------
// Sculpted limbs. Every limb is lofted through elliptical rings whose radii follow a muscle profile, so arms have a
// bicep/tricep/forearm belly and legs a quad sweep, knee and calf. Clothing shells (limbShell) follow the SAME
// profile, so sleeves and trousers hug the muscles instead of being poked through by them.
// def.body.shape = { bicep, tricep, fore, quad, ham, calf, knee } (fractions of the limb radius; all optional).
const bump = (t, c, w) => Math.exp(-((t - c) / w) * ((t - c) / w));
/** [rx, rz, zOffset] of limb segment `seg` at t (0 = joint .. 1 = end), before inflation. */
export function limbProfile(B, seg, t) {
  const R = B[seg + 'R'] ?? [0.08, 0.06], tc = t < 0 ? 0 : t > 1 ? 1 : t, base = R[0] + (R[1] - R[0]) * tc;
  const M = B.shape ?? {};
  let rx = base, rz = base, zo = 0;
  if (seg === 'upperArm') {
    const bi = M.bicep ?? 0.2, tri = M.tricep ?? bi * 0.6, b = bump(tc, 0.52, 0.24);
    rx *= 1 + 0.18 * (bi + tri) * b; rz *= 1 + 0.55 * (bi + tri) * b; zo = base * 0.32 * (bi - tri * 0.7) * b;
    rx *= 1 - 0.1 * bump(tc, 1.0, 0.12);                                          // elbow pinch
  } else if (seg === 'foreArm') {
    const f = M.fore ?? 0.3, b = bump(tc, 0.22, 0.2);
    rx *= 1 + 0.5 * f * b; rz *= (1 + 0.3 * f * b) * (1 - 0.16 * bump(tc, 1.0, 0.25)); zo = base * 0.12 * f * b;
  } else if (seg === 'thigh') {
    const q = M.quad ?? 0.3, h = M.ham ?? q * 0.6, b = bump(tc, 0.42, 0.28);
    rx *= 1 + 0.18 * q * bump(tc, 0.3, 0.28); rz *= 1 + 0.4 * (q + h) * b; zo = base * 0.25 * (q - h) * b;
    const k = 1 - (M.knee ?? 0.1) * bump(tc, 0.97, 0.1); rx *= k; rz *= k;
  } else if (seg === 'shin') {
    const c = M.calf ?? 0.4, b = bump(tc, 0.3, 0.2);
    rx *= 1 + 0.25 * c * b; rz *= 1 + 0.7 * c * b; zo = -base * 0.42 * c * b;
    rx *= 1 - 0.08 * bump(tc, 0.86, 0.12); rz *= 1 - 0.1 * bump(tc, 0.86, 0.12);   // slim ankle
  }
  return [rx, rz, zo];
}
/** Loft rows (bottom -> top, joint at y = 0, limb along -Y) for t0..t1 of a limb, inflated by inf. */
function limbRows(B, seg, len, t0, t1, inf = 0, flare = 0, caps = false) {
  const rows = [], N = Math.max(3, Math.ceil((t1 - t0) * 16));
  const P = (t) => { const [rx, rz, zo] = limbProfile(B, seg, t), f = flare ? flare * (t - t0) / Math.max(0.01, t1 - t0) : 0; return [rx + inf + f, rz + inf + f * 0.8, zo]; };
  if (caps) { const [rx, rz, zo] = P(t1), m = Math.min(rx, rz); for (let k = 5; k >= 1; k--) { const a = (k / 6) * Math.PI / 2; rows.push([-t1 * len - Math.sin(a) * m, rx * Math.cos(a), rz * Math.cos(a), zo]); } }
  for (let i = N; i >= 0; i--) { const t = t0 + (t1 - t0) * (i / N), [rx, rz, zo] = P(t); rows.push([-t * len, rx, rz, zo]); }
  if (caps) { const [rx, rz, zo] = P(t0), m = Math.min(rx, rz); for (let k = 1; k <= 5; k++) { const a = (k / 6) * Math.PI / 2; rows.push([-t0 * len + Math.sin(a) * m, rx * Math.cos(a), rz * Math.cos(a), zo]); } }
  return rows;
}
/** Sculpted limb (or limb band) geometry, joint at the origin, along -Y. */
export function sculptLimb(B, seg, len, t0 = 0, t1 = 1, inf = 0, opts = {}) {
  return loft(limbRows(B, seg, len, t0, t1, inf, opts.flare ?? 0, !opts.open), opts.seg ?? 20, !!opts.open);
}

/** Build the clothing/shape context handed to outfit and character builders. */
export function makeCtx(rig, def, colors) {
  const B = def.body, J = rig.J, bindT = torsoBind(B);
  const ctx = {
    rig, B, J, C: colors, def, F: def.face ?? {},
    /** Clothing band around the torso between heights y0..y1, inflated by `inf`. opts.rows overrides torso rows. */
    torsoShell(y0, y1, color, inf = 0.014, opts = {}) {
      const src = opts.rows ?? B.torso, rows = [];
      const steps = Math.max(2, Math.ceil((y1 - y0) / 0.035));
      for (let i = 0; i <= steps; i++) {
        const r = rowAt(src, y0 + (y1 - y0) * (i / steps));
        const flare = opts.flare ? opts.flare(i / steps) : 0;
        rows.push([r[0], r[1] + inf + flare, r[2] + inf + flare * 0.8, r[3]]);
      }
      return rig.add('spine', loft(rows, 28, !opts.closed), color, { ...opts, bind: bindT });
    },
    /** Band around a limb segment (both sides by default), hugging the muscle profile. seg: upperArm|foreArm|thigh|shin.
     *  from/to are 0..1 along the bone (from may be negative to reach up over a joint). */
    limbShell(seg, from, to, color, inf = 0.014, opts = {}) {
      const len = boneLen(B, seg);
      for (const side of opts.side ? [opts.side] : ['L', 'R']) {
        const g = sculptLimb(B, seg, len, from, to, inf, { flare: opts.flare ?? 0, open: true, seg: 18 });
        const p = J[seg + side];
        g.translate(p[0], p[1], p[2]);
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
    /** z of the face/skull surface at (x, y) in rig space — place facial features ON the skin. */
    faceZ(x, y) {
      const [hx, hy, hz] = ctx.headPos(), R = B.headR, F = ctx.F;
      const e = (cx, cy, cz, rx, ry, rz) => { const u = (x - cx) / rx, v = (y - cy) / ry, k = 1 - u * u - v * v; return k > 0 ? cz + rz * Math.sqrt(k) : -1e9; };
      return Math.max(e(hx, hy, hz, R * (F.skullX ?? 0.92), R * (F.skullY ?? 1.0), R * (F.skullZ ?? 0.98)),
        e(hx, hy - R * 0.45, hz + R * 0.12, R * (F.jawX ?? 0.72), R * (F.jawY ?? 0.55), R * (F.jawZ ?? 0.75)));
    },
  };
  return ctx;
}
function flip(g) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
export function boneLen(B, seg) { return { upperArm: B.upperArm, foreArm: B.foreArm, thigh: B.thighLen, shin: B.shinLen }[seg]; }

/** Skin body: torso loft, extras (pecs, glutes, traps...), neck, sculpted arms, hands, legs, feet. Clothing comes from the outfit. */
/** Egg/teardrop: round on top, tapering to a soft point at the bottom (deltoids, calves). */
function teardrop(rx, ryTop, rz, ryBot = ryTop) {
  const g = ball(1, 1, 1, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y < 0 ? 1 + y * 0.62 : 1; p.setXYZ(i, p.getX(i) * rx * k, y * (y < 0 ? ryBot : ryTop), p.getZ(i) * rz * k); }
  g.computeVertexNormals(); return g;
}
/** Muscle slab (pec): flattened front, squared lower edge that juts slightly, thinner toward the top. */
function slabBall(rx, ry, rz, k) {
  const g = ball(1, 1, 1, 22), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (z > 0) z = z * (1 - k * 0.35) * (1 - k * 0.3 * Math.max(0, y));          // flatter front, thinner at the top
    if (y < 0) { const sq = Math.pow(-y, 2.5); y = -Math.pow(-y, 1 - k * 0.45); x *= 1 + k * 0.12 * (1 - sq); }   // squarer bottom edge
    p.setXYZ(i, x * rx, y * ry, z * rz);
  }
  g.computeVertexNormals(); return g;
}
export function buildBody(ctx) {
  const { rig, B, J, C } = ctx;
  const skin = C.skin;
  // torso with soft form shading painted in (lighter toward the front), so the volume reads even in flat light
  const tz = (x, y, z) => tint(skin, 0.94 + 0.08 * Math.max(-1, Math.min(1, z / 0.2)));
  rig.add('spine', loft(B.torso, 30), tz, { bind: ctx.torsoBind, rough: 0.55 });
  for (const s of B.extras ?? []) {               // pecs, bust, glutes, traps, abs... [bone|'torso', [x,y,z], [rx,ry,rz], colorKey, rot?, slab?]
    // slab = 0..1 flattens the front into a plate with a defined lower edge (pecs), instead of a round ball
    const g = s[5] ? slabBall(s[2][0], s[2][1], s[2][2], s[5]) : ball(s[2][0], s[2][1], s[2][2], 20); if (s[4]) xf(g, null, s[4]); g.translate(s[1][0], s[1][1], s[1][2]);
    const col = C[s[3] ?? 'skin'] ?? s[3], y0 = s[1][1], ry = s[2][1];
    // shaded underside: every muscle mass gets a darker lower edge so it reads as a sculpted shape, not a balloon
    const base = col === skin ? tz : col, shade = (x, y, z) => tint(typeof base === 'function' ? base(x, y, z) : base, 0.8 + 0.25 * ss(y0 - ry, y0 + ry * 0.2, y));
    rig.add(s[0] === 'torso' ? 'spine' : s[0], g, shade, { bind: s[0] === 'torso' ? ctx.torsoBind : undefined, rough: 0.55 });
  }
  // neck with a trapezius flare at the base
  { const p = J.neck, L = B.neckLen + 0.12, rows = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6, y = p[1] - 0.04 + t * L, k = Math.min(1, t * 1.6); rows.push([y, B.neckR * (1.3 - 0.35 * k), B.neckR * (1.1 - 0.15 * k), -0.01]); }
    rig.add('neck', loft(rows, 18), skin, { rough: 0.55 }); }
  // arms (deltoid cap, sculpted upper arm + forearm, hand)
  const D = B.deltR ?? B.upperArmR[0] * 1.25;
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1, ua = J['upperArm' + side], fa = J['foreArm' + side], ha = J['hand' + side];
    // deltoid: a teardrop cap that wraps the shoulder and tapers into the arm (insertion ~45% down), shaded at the tip
    let g = teardrop(D * 1.0, D * 1.05, D * 0.98, D * 1.3); const dy0 = ua[1] - D * 0.1;
    xf(g, [ua[0] + sg * 0.02, dy0, ua[2]], [0, 0, sg * 0.18]);
    rig.add('upperArm' + side, g, (x, y) => tint(skin, 0.86 + 0.16 * ss(dy0 - D * 1.3, dy0 - D * 0.1, y)));
    const def = B.shape?.def ?? 0;
    g = sculptLimb(B, 'upperArm', B.upperArm); g.translate(ua[0], ua[1], ua[2]);
    rig.add('upperArm' + side, g, def ? (x, y, z) => { const t = (ua[1] - y) / B.upperArm, lat = Math.abs(x - ua[0]) / B.upperArmR[0];
      return tint(skin, 1 - def * (0.14 * bump(t, 0.95, 0.08) + 0.1 * bump(lat, 0.85, 0.2) * bump(t, 0.55, 0.3)) + def * 0.06 * Math.max(0, z / B.upperArmR[0])); } : skin);
    g = sculptLimb(B, 'foreArm', B.foreArm); g.translate(fa[0], fa[1], fa[2]); rig.add('foreArm' + side, g, skin);
    // mitten hand + thumb
    const hr = B.handR, hc = C.gloves && C.handsGloved ? C.gloves : skin;
    g = ball(hr * 0.78, hr * 1.22, hr * 1.02, 14); g.translate(ha[0], ha[1] - hr * 0.95, ha[2] + 0.01); rig.add('hand' + side, g, hc);
    g = ball(hr * 0.34, hr * 0.62, hr * 0.34, 10); xf(g, [ha[0], ha[1] - hr * 0.6, ha[2] + hr * 0.85], [0.5, 0, 0]); rig.add('hand' + side, g, hc);
  }
  // legs
  for (const side of ['L', 'R']) {
    const th = J['thigh' + side], sh = J['shin' + side], ft = J['foot' + side];
    let g = sculptLimb(B, 'thigh', B.thighLen + 0.04); g.translate(th[0], th[1] + 0.02, th[2]); rig.add('thigh' + side, g, skin);
    g = sculptLimb(B, 'shin', B.shinLen); g.translate(sh[0], sh[1], sh[2]); rig.add('shin' + side, g, skin);
    // foot (bare/boot base): rounded wedge
    g = box(B.footW, B.footH, B.footL, 0.04); g.translate(ft[0], ft[1] - B.footH * 0.35, ft[2] + B.footL * 0.28); rig.add('foot' + side, g, C.boots ?? skin, { rough: 0.5 });
  }
}

// ---------------------------------------------------------------------------------------------
// Face. Built to read at ~12% of screen height: big eyes with dark lash lines and irises with two highlights,
// tapered brows, a real nose and a mouth with an expression (smile / grin / lips), cheek blush painted into the
// skin. Every feature is placed ON the head surface (ctx.faceZ) and turned to follow it, so nothing sinks or z-fights.
const NO_LINE = { outline: 0 };
export function buildHead(ctx, F = {}) {
  ctx.F = F;
  const { rig, B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
  const add = (g, col, o) => rig.add('head', g, col, o);
  const fem = !!F.lashes, blush = C.cheek ?? (fem ? 0xf07f86 : null);
  const skinFn = (x, y, z) => {
    let c = C.skin;
    if (blush != null && z > hz) {
      const d = Math.min(Math.hypot(x - hx - R * 0.52, y - hy + R * 0.3), Math.hypot(x - hx + R * 0.52, y - hy + R * 0.3)) / R;
      if (d < 0.32) c = mix(c, blush, (1 - d / 0.32) * (fem ? 0.5 : 0.3));
    }
    // painted stubble along the jaw (C.stubble), leaving a clean band around the mouth
    if (C.stubble != null && y < hy - R * 0.32 && (y < hy - R * 0.74 || Math.abs(x - hx) > R * 0.3 || y > hy - R * 0.4)) c = mix(c, C.stubble, y < hy - R * 0.4 ? 0.32 : 0.18);
    return c;
  };
  // skull + jaw + chin
  let g = ball(R * (F.skullX ?? 0.92), R * (F.skullY ?? 1.0), R * (F.skullZ ?? 0.98), 28); g.translate(hx, hy, hz); add(g, skinFn, { rough: 0.5 });
  g = ball(R * (F.jawX ?? 0.72), R * (F.jawY ?? 0.55), R * (F.jawZ ?? 0.75), 22); g.translate(hx, hy - R * 0.45, hz + R * 0.12); add(g, F.jawColor ?? skinFn, { rough: 0.5 });
  if (F.chin) { g = ball(R * 0.3, R * 0.25, R * 0.3, 12); g.translate(hx, hy - R * 0.86, hz + R * 0.44); add(g, F.jawColor ?? skinFn); }
  // ears
  for (const s of [1, -1]) { g = ball(R * 0.14, R * 0.25, R * 0.11, 10); g.translate(hx + s * R * 0.9, hy - R * 0.1, hz - R * 0.05); add(g, tint(C.skin, 0.95)); }
  // nose: bridge + rounded tip, shaded underside
  const nk = F.nose ?? 1;
  g = ball(R * 0.12 * nk, R * 0.15 * nk, R * 0.13 * nk, 12); g.translate(hx, hy - R * 0.22, ctx.faceZ(hx, hy - R * 0.22) - R * 0.04);
  add(g, (x, y) => (y < hy - R * 0.3 ? tint(C.skin, 0.86) : tint(C.skin, 1.04)), NO_LINE);
  g = ball(R * 0.055 * nk, R * 0.16, R * 0.06, 8); g.translate(hx, hy - R * 0.06, ctx.faceZ(hx, hy - R * 0.06) - R * 0.02); add(g, tint(C.skin, 1.03), NO_LINE);
  // nostril wings + dark nostrils so the nose has a sculpted base instead of a lone ball
  for (const s of [1, -1]) {
    const nx = hx + s * R * 0.1 * nk, ny = hy - R * 0.27;
    g = ball(R * 0.07 * nk, R * 0.075 * nk, R * 0.07 * nk, 10); g.translate(nx, ny, ctx.faceZ(nx, ny) - R * 0.02); add(g, (x, y) => tint(C.skin, y < ny - R * 0.02 ? 0.82 : 0.97), NO_LINE);
    g = ball(R * 0.035 * nk, R * 0.02, R * 0.03, 6); g.translate(hx + s * R * 0.055 * nk, hy - R * 0.33, ctx.faceZ(hx, hy - R * 0.22) - R * 0.03); add(g, tint(C.skin, 0.45), NO_LINE);
  }
  if (!fem) {   // brow ridge: a soft shelf of skin over the eyes (shadowed underside) gives the male faces structure
    const by = hy + R * ((F.eyeY ?? 0.02) + (F.eyeSize ?? 0.2) * 1.15);
    g = ball(R * 0.68, R * 0.12, R * 0.14, 16); g.translate(hx, by, ctx.faceZ(hx, by) - R * 0.1);
    add(g, (x, y) => tint(C.skin, y < by - R * 0.03 ? 0.84 : 1.0), NO_LINE);
  }
  // eyes
  const es = R * (F.eyeSize ?? 0.2), tall = F.eyeTall ?? 1.15, ey = hy + R * (F.eyeY ?? 0.02);
  const iris = C.eyes, irisD = tint(iris, 0.5), lash = F.lashColor ?? 0x1c0f1a;
  for (const s of [1, -1]) {
    const ex = hx + s * R * (F.eyeSpread ?? 0.36), ez = ctx.faceZ(ex, ey), yaw = s * Math.asin(Math.min(0.9, (ex - hx) / (R * 0.95))) * 0.7;
    const put = (geo, lx, ly, lz) => xf(geo.translate(lx, ly, lz), [ex, ey, ez - es * 0.18], [0, yaw, 0]);
    const ix = -s * es * 0.05;     // irises look slightly inward/forward
    // eye white sits almost flush with the skin (front ~0.14 es proud), iris/pupil/glints layered just in front of it
    add(put(ball(es * 0.92, es * tall, es * 0.34, 16), 0, 0, 0), 0xfbfbff, { rough: 0.25, outline: 0.35 });
    add(put(ball(es * 0.64, es * 0.76 * tall, es * 0.2, 14), ix, -es * 0.06, es * 0.17), (x, y) => (y > ey + es * 0.22 ? irisD : y < ey - es * 0.42 ? tint(iris, 1.3) : iris), { rough: 0.15, outline: 0 });
    add(put(ball(es * 0.3, es * 0.42 * tall, es * 0.12, 10), ix, -es * 0.04, es * 0.27), 0x0a0810, { rough: 0.1, outline: 0 });
    add(put(ball(es * 0.18, es * 0.2, es * 0.06, 8), ix + es * 0.2, es * 0.24, es * 0.33), 0xffffff, { rough: 0.1, emissive: 1.0, outline: 0 });
    add(put(ball(es * 0.08, es * 0.08, es * 0.04, 6), ix - es * 0.18, -es * 0.3, es * 0.31), 0xffffff, { rough: 0.1, emissive: 0.8, outline: 0 });
    // upper lid / lash line hugging the top of the eye (thicker and winged for the women)
    const lt = es * (fem ? 0.2 : 0.14);
    g = torus(es * 0.88, lt, 22, 6, Math.PI); g.scale(1, tall * 0.98, 0.6); add(put(g, 0, es * 0.04, es * 0.1), lash, { rough: 0.5, outline: 0 });
    if (fem) { g = blade(es * 0.5, es * 0.2, es * 0.08, 0); xf(g, null, [0, 0, -s * 1.05]); add(put(g, s * es * 0.8, es * 0.38, es * 0.08), lash, NO_LINE); }
    // brow: tapered tube, thick at the inner end, sitting on the forehead surface
    const bt = es * (F.browThick ?? 0.38), by = ey + es * (F.browY ?? 1.55), tl = F.browTilt ?? -0.18, pts = [];
    for (const u of [-0.9, 0.05, 1.0]) { const bx = ex + s * u * es * 1.05, yy = by + u * tl * es * 1.0 + (Math.abs(u) < 0.5 ? es * 0.12 : 0); pts.push([bx, yy, ctx.faceZ(bx, yy) + bt * 0.15]); }
    add(tube(pts, bt * 0.55, bt * 0.25, 10, 6), C.brow ?? C.hair, { rough: 0.6, outline: 0 });
  }
  // mouth
  const my = hy - R * (F.mouthY ?? 0.52), mz = ctx.faceZ(hx, my), mw = R * (F.mouthW ?? 0.42) * 0.5, smirk = F.smirk ?? 0.1;
  const arc = (w, th, a, col, yLow, z) => { const t = torus(w, th, 18, 6, a); xf(t, null, [0, 0, -Math.PI / 2 - a / 2 + smirk]); t.scale(1, 0.7, 0.6); t.translate(hx, yLow + w * 0.7, z); add(t, col, NO_LINE); };
  if (F.mouth === false) { /* the character builds its own (e.g. inside a beard) */ } else if (F.lips) {
    g = ball(R * 0.19, R * 0.055, R * 0.065, 14); g.translate(hx, my + R * 0.035, mz - R * 0.01); add(g, F.lips, { rough: 0.3, outline: 0 });
    g = ball(R * 0.16, R * 0.07, R * 0.07, 14); g.translate(hx, my - R * 0.055, mz - R * 0.015); add(g, tint(F.lips, 1.1), { rough: 0.3, outline: 0 });
    arc(R * 0.22, R * 0.02, 1.3, tint(F.lips, 0.5), my - R * 0.012, mz + R * 0.035);
  } else if (F.grin) {
    // open grin: dark D-shaped mouth, a band of upper teeth, lips and smile creases at the corners
    g = ball(mw * 1.0, R * 0.1, R * 0.05, 16); xf(g, null, null); g.translate(hx, my - R * 0.035, mz - R * 0.02);
    add(g, (x, y) => (y > my - R * 0.005 ? 0x3a0e14 : 0x7a2028), { rough: 0.5, outline: 0 });
    g = ball(mw * 0.82, R * 0.035, R * 0.03, 14); g.translate(hx, my + R * 0.012, mz + R * 0.012); add(g, 0xfaf6ee, { rough: 0.25, outline: 0 });
    g = ball(mw * 0.6, R * 0.025, R * 0.025, 12); g.translate(hx, my - R * 0.085, mz + R * 0.0); add(g, 0xd06a70, { rough: 0.4, outline: 0 });
    g = ball(mw * 0.9, R * 0.03, R * 0.04, 14); g.translate(hx, my - R * 0.15, mz - R * 0.01); add(g, tint(C.skin, 0.9), NO_LINE);   // lower lip
    for (const s of [1, -1]) { g = ball(R * 0.025, R * 0.08, R * 0.03, 6); xf(g, [hx + s * mw * 1.05, my - R * 0.03, ctx.faceZ(hx + s * mw * 1.05, my) - R * 0.005], [0, 0, s * 0.5]); add(g, tint(C.skin, 0.72), NO_LINE); }
  } else {
    arc(mw * 1.5, R * 0.04, 1.2, 0x5a2a28, my - R * 0.05, mz + R * 0.01);
    // lower lip highlight + shadow under it, so the mouth reads as a feature and not a pencil line
    g = ball(R * 0.13, R * 0.035, R * 0.04, 12); g.translate(hx, my - R * 0.075, ctx.faceZ(hx, my - R * 0.075) - R * 0.01); add(g, mix(tint(C.skin, 0.95), 0xc06060, 0.25), NO_LINE);
    for (const s of [1, -1]) { g = ball(R * 0.022, R * 0.022, R * 0.02, 6); const cx = hx + s * mw * 1.45; g.translate(cx, my + smirk * s * R * 0.12, ctx.faceZ(cx, my) + R * 0.0); add(g, 0x5a2a28, NO_LINE); }
  }
}

/** Clean hair cap: a dome over the skull, slightly inflated (no shallow sphere-sphere intersection = no jagged
 *  hairline), tilted back so the front edge sits on the forehead and the back covers the nape.
 *  o: { inflate=1.07, cover=1.45 (rad from the crown), tilt=-0.5, front=0 (extra forward shift) } */
export function hairCap(ctx, color, o = {}) {
  const { B } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR, F = ctx.F ?? {}, k = o.inflate ?? 1.07;
  const g = dome(R * (F.skullX ?? 0.92) * k, R * (F.skullY ?? 1.0) * k, R * (F.skullZ ?? 0.98) * k, o.cover ?? 1.45, 28);
  xf(g, [hx, hy + R * 0.02, hz + R * (o.front ?? 0)], [o.tilt ?? -0.5, 0, 0]);
  return ctx.add('head', g, color, { rough: o.rough ?? 0.45 });
}

/** Recurve bow. Returns { group, setString(x), setDraw(k), drawLen, arrowLen, dispose }. Bow-local: grip at origin,
 *  arrow along +X, limbs ±Y. setDraw(0..1) flexes the limbs toward the string (vertex shader bend) and moves the tips. */
export function buildBow(o = {}) {
  const L = o.length ?? 0.6, wood = o.wood ?? 0x7a4528, trim = o.trim ?? 0xf0c050, grip = o.grip ?? 0x3a2418;
  const tipY = 0.76 * L / 0.72;
  const group = new THREE.Group(); group.name = 'bow';
  const flex = { value: 0 }, tipYU = { value: tipY };
  const mat = new THREE.MeshStandardMaterial({ color: wood, roughness: 0.45, metalness: 0.05 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uFlex = flex; s.uniforms.uTipY = tipYU;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlex, uTipY;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float u = clamp(abs(transformed.y) / uTipY, 0.0, 1.2); transformed.x -= uFlex * u * u * 0.16; transformed.y *= 1.0 - uFlex * u * u * 0.07; }`);
  };
  mat.customProgramCacheKey = () => 'archer-bow-flex';
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.3, metalness: 0.8 });
  const gripMat = new THREE.MeshStandardMaterial({ color: grip, roughness: 0.8 });
  const limbPts = (s) => [[0.0, 0.08 * s, 0], [-0.05, 0.3 * s * L / 0.72, 0], [-0.07, 0.55 * s * L / 0.72, 0], [-0.02, 0.69 * s * L / 0.72, 0], [0.07, 0.76 * s * L / 0.72, 0]];
  const geos = [tube(limbPts(1), 0.036, 0.014, 18, 8), tube(limbPts(-1), 0.036, 0.014, 18, 8)];
  // grip + trim bands merged into the limb mesh's sibling (one mesh each for wood / trim / grip)
  const limbs = new THREE.Mesh(mergeIdx(geos), mat); limbs.castShadow = true; group.add(limbs);
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.2, 10), gripMat); group.add(gr);
  const caps = [];
  const trimGeos = [];
  for (const s of [1, -1]) {
    const band = new THREE.TorusGeometry(0.042, 0.011, 6, 14); band.rotateX(Math.PI / 2); band.translate(0, 0.11 * s, 0); trimGeos.push(band);
  }
  group.add(new THREE.Mesh(mergeIdx(trimGeos), trimMat));
  for (const s of [1, -1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), trimMat); cap.position.set(0.07, tipY * s, 0); group.add(cap); caps.push(cap); }
  if (o.gem) { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: o.gem, emissive: o.gem, emissiveIntensity: 0.6, roughness: 0.2 })); gem.position.set(0.04, 0, 0); group.add(gem); }
  const sg = new THREE.BufferGeometry(); const arr = new Float32Array([0.07, tipY, 0, -0.1, 0, 0, 0.07, -tipY, 0]);
  sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const string = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: o.string ?? 0xfff4dc })); string.frustumCulled = false; group.add(string);
  let lastFlex = -1;
  return {
    group, drawLen: o.drawLen ?? 0.62, arrowLen: 1.3,
    setString(x) { if (arr[3] !== x) { arr[3] = x; sg.attributes.position.needsUpdate = true; } },
    /** Limb flex 0..1 (follows the draw): tips bend back toward the archer and the string ends follow them. */
    setDraw(k) {
      k = k < 0 ? 0 : k > 1 ? 1 : k; if (Math.abs(k - lastFlex) < 0.002) return; lastFlex = k;
      flex.value = k;
      const tx = 0.07 - k * 0.16, ty = tipY * (1 - k * 0.07);
      caps[0].position.set(tx, ty, 0); caps[1].position.set(tx, -ty, 0);
      arr[0] = tx; arr[1] = ty; arr[6] = tx; arr[7] = -ty; sg.attributes.position.needsUpdate = true;
    },
    dispose() { group.traverse((m) => { m.geometry?.dispose(); m.material?.dispose?.(); }); },
  };
}
function mergeIdx(gs) {
  const g = new THREE.BufferGeometry(); let off = 0; const pos = [], nor = [], idx = [];
  for (const s of gs) { const p = s.attributes.position.array, n = s.attributes.normal.array; pos.push(...p); nor.push(...n); for (const i of s.index.array) idx.push(i + off); off += p.length / 3; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
