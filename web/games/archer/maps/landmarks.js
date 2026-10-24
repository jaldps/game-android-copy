// Hand-made landmark set-pieces, one per map (owner: Maps specialist). Each sits in the backdrop behind/between the
// islands where it is visible in normal play, and is ONE merged mesh (vertex colours + aGlow self-light), so it costs
// one draw call (Neon's blimp is a second). All designs are original.
//   stoneGuardian (Sunspire) · dragonSkeleton (Frostpeak) · sunKingHead (Ruins) · giantAnvil (Emberforge) · luckyCatSign + blimp (Neon)
// Every builder returns { mesh, update(dt, t) }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowStdMaterial, depthShade } from './sky.js';

const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const h1 = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise3 = (x, y, z) => 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2.0) * Math.sin(z * 0.8 + y * 0.45 + Math.cos(x * 0.5));

/** Collects parts, paints each vertex with fn(x, y, z, ny) -> [hex, glow] (or a hex), merges into one mesh. */
function kit() {
  const parts = [];
  const api = {
    add(geo, paint, glow = 0, pos = null, rot = null, scl = null) {
      _e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0); _q.setFromEuler(_e); _s.set(...(scl ?? [1, 1, 1])); _v.set(...(pos ?? [0, 0, 0]));
      _m.compose(_v, _q, _s);
      let g;
      if (api.smooth) {               // keep the geometry's own smooth normals (sculpted look), then un-index for the merge
        g = geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(_m); if (g.index) g = g.toNonIndexed();
      } else {
        g = geo.index ? geo.toNonIndexed() : geo;
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        g.applyMatrix4(_m); g.computeVertexNormals();
      }
      const p = g.attributes.position, n = g.attributes.normal, N = p.count, col = new Float32Array(N * 3), gl = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const r = typeof paint === 'function' ? paint(p.getX(i), p.getY(i), p.getZ(i), n.getY(i)) : paint;
        const hex = Array.isArray(r) ? r[0] : r; _c.set(hex);
        col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; gl[i] = Array.isArray(r) ? r[1] : glow;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1));
      parts.push(g); return api;
    },
    /** Cylinder from point a to point b (radius r0 at a, r1 at b). */
    seg(a, b, r0, r1, paint, glow = 0, sides = 8) {
      const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
      const g = new THREE.CylinderGeometry(r1, r0, L, sides, 1); g.translate(0, L / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a[0], a[1], a[2]);
      return api.add(g, paint, glow);
    },
    /** Tube through points. */
    tube(pts, r, paint, glow = 0, seg = 24, rs = 6) {
      const c = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
      return api.add(new THREE.TubeGeometry(c, seg, r, rs, false), paint, glow);
    },
    build({ x = 0, y = 0, z = -100, scale = 1, glowK = 1.6, shade = null } = {}) {
      const geo = mergeGeometries(parts); geo.scale(scale, scale, scale); geo.translate(x, y, z); geo.computeBoundingSphere();
      let mat = glowStdMaterial(glowK); if (shade) mat = depthShade(mat, shade);
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; return mesh;
    },
  };
  return api;
}
const shift = (hex, k) => { _c.set(hex).multiplyScalar(k); return _c.getHex(); };
const mixHex = (a, b, t) => { const A = new THREE.Color(a), B = new THREE.Color(b); return A.lerp(B, Math.max(0, Math.min(1, t))).getHex(); };

// -------------------------------------------------------------------------------------------------------------
/** Sunspire: a colossal mossy stone guardian rising from the sea, raising a stone bow, wearing a golden sun crown. */
export function stoneGuardian({ x = 18, y = -9, z = -150, scale = 0.95 } = {}) {
  const K = kit(), STONE = 0xd8b888, STONE2 = 0xa0805a, MOSS = 0x5fb43e, GOLD = 0xf2c14e;
  const stone = (px, py, pz, ny) => {
    const n = noise3(px * 0.6, py * 0.6, pz * 0.6), crack = Math.abs(Math.sin(px * 1.7 + py * 0.9) * Math.sin(py * 1.3 - pz)) < 0.04;
    if (ny > 0.55 && n > 0.45) return mixHex(MOSS, 0x9ae05a, n);               // moss on everything facing up
    if (py < 6 && n > 0.62) return 0x4f9a3a;                                    // waterline weed
    return crack ? shift(STONE2, 0.55) : mixHex(STONE2, STONE, n) ;
  };
  // rocky plinth half in the sea
  K.add(new THREE.CylinderGeometry(13, 17, 9, 11, 2), stone, 0, [0, 3, 0]);
  K.add(new THREE.DodecahedronGeometry(5, 0), stone, 0, [-13, 2, 4]); K.add(new THREE.DodecahedronGeometry(4, 0), stone, 0, [12, 1.5, 5]);
  // legs (kneeling on one knee), hips, torso, belt
  K.seg([-4, 7, 0], [-5, 14, 3], 3.2, 3.6, stone); K.seg([5, 7, 2], [5, 12, 6], 3, 3.4, stone); K.seg([5, 12, 6], [5, 15, 1], 3.4, 3.6, stone);
  K.add(new THREE.CylinderGeometry(6.2, 6.8, 5, 10), stone, 0, [0, 16, 1]);
  K.add(new THREE.CylinderGeometry(8.6, 6.0, 13, 10), stone, 0, [0, 24, 1]);
  K.add(new THREE.TorusGeometry(6.6, 0.8, 6, 16), GOLD, 0.15, [0, 18.4, 1], [Math.PI / 2, 0, 0]);
  K.add(new THREE.BoxGeometry(4, 4, 1.2), GOLD, 0.25, [0, 18.4, 7.5]);                           // belt buckle (sun)
  // chest plate with an engraved sun
  K.add(new THREE.CylinderGeometry(5, 5, 1, 12), (px, py) => (Math.hypot(px, py - 25) < 2 ? [GOLD, 0.1] : STONE), 0, [0, 25, 8.2], [Math.PI / 2, 0, 0]);
  // shoulders, arms: left arm raised holding the great bow, right arm drawing the string back
  K.add(new THREE.SphereGeometry(4.2, 10, 8), stone, 0, [9, 29, 1]); K.add(new THREE.SphereGeometry(4.2, 10, 8), stone, 0, [-9, 29, 1]);
  K.seg([10, 29, 1], [17, 33, 3], 2.8, 2.4, stone); K.seg([17, 33, 3], [22, 37, 3], 2.4, 2.0, stone);
  K.add(new THREE.SphereGeometry(2.6, 8, 6), stone, 0, [22.5, 37.5, 3]);
  K.seg([-10, 29, 1], [-12, 33, 6], 2.8, 2.4, stone); K.seg([-12, 33, 6], [-2, 36, 6], 2.4, 2.0, stone);
  K.add(new THREE.SphereGeometry(2.4, 8, 6), stone, 0, [-1.5, 36, 6]);
  // the stone bow (vertical arc through the left fist) + taut string to the right fist
  K.add(new THREE.TorusGeometry(15, 1.0, 6, 22, Math.PI * 0.86), (px, py, pz, ny) => (Math.abs(py - 37) < 2 ? GOLD : stone(px, py, pz, ny)), 0, [11.5, 37, 3], [0, 0, -Math.PI * 0.43]);
  K.seg([24.4, 50.5, 3], [-1.5, 36, 6], 0.3, 0.3, 0xf4ead0); K.seg([-1.5, 36, 6], [24.4, 23.5, 3], 0.3, 0.3, 0xf4ead0);
  K.seg([-1.5, 36, 6], [27, 37, 4], 0.45, 0.45, 0x8a6a48);                                     // stone arrow
  K.add(new THREE.ConeGeometry(1.2, 3, 4), GOLD, 0.3, [28.5, 37, 4], [0, 0, -Math.PI / 2]);
  // head: helm, brow, nose, glowing eye slits and a golden sun crown of rays
  K.seg([0, 31, 1], [0, 34, 1], 3, 2.8, stone);
  K.add(new THREE.SphereGeometry(4.6, 12, 10), stone, 0, [0, 37.5, 1.5], null, [1, 1.12, 1]);
  K.add(new THREE.BoxGeometry(6.4, 1.1, 2), shift(STONE2, 0.9), 0, [0, 38.6, 5.4]);
  K.add(new THREE.ConeGeometry(0.9, 2.6, 4), STONE, 0, [0, 37, 6.0], [Math.PI / 2 + 0.3, 0, 0]);
  for (const s of [1, -1]) K.add(new THREE.BoxGeometry(1.8, 0.5, 0.6), [0xffe08a, 1.6], 0, [s * 1.6, 37.8, 5.8]);
  K.add(new THREE.TorusGeometry(4.9, 0.6, 6, 18), GOLD, 0.2, [0, 40.5, 1.5], [Math.PI / 2 - 0.15, 0, 0]);
  for (let i = 0; i < 9; i++) { const a = -1.25 + i * (2.5 / 8); K.add(new THREE.ConeGeometry(0.9, 4.5 - Math.abs(a) * 1.2, 5), [GOLD, 0.25], 0, [Math.sin(a) * 4.6, 42 + Math.cos(a) * 1.6, 1.5 + Math.cos(a) * 1.2], [0, 0, -a]); }
  // a cape of hanging vines from the shoulders
  for (let i = 0; i < 7; i++) K.seg([-8 + i * 2.6, 30, -2], [-8.5 + i * 2.7, 14 - h1(i) * 6, -3], 0.5, 0.25, MOSS);
  const mesh = K.build({ x, y, z, scale, shade: { y0: y + 6, h: 40, ao: 0.6, rim: 0xfff2d0, rimAmt: 0.4, tint: 0x4a88a8, tintAmt: 0.12 } });
  return { mesh, update() {} };
}

// -------------------------------------------------------------------------------------------------------------
/** Frostpeak: the skeleton of an ancient ice dragon arched over a glacier, eye sockets glowing cyan. */
export function dragonSkeleton({ x = 4, y = -9, z = -118, scale = 1.25 } = {}) {
  const K = kit(), BONE = 0xeef2f8, BONE2 = 0xc0cce0, ICE = 0x9fd8f4, ICE2 = 0x5aa8d8;
  const bone = (px, py, pz) => mixHex(BONE2, BONE, noise3(px * 1.4, py * 1.4, pz));
  const ice = (px, py, pz, ny) => (ny > 0.5 ? mixHex(0xffffff, 0xe0f4ff, noise3(px, py, pz)) : mixHex(ICE2, ICE, noise3(px * 0.5, py * 0.7, pz)));
  // glacier the bones are frozen into
  K.add(new THREE.SphereGeometry(30, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), ice, 0, [0, -1, 0], null, [1.3, 0.32, 0.6]);
  for (let i = 0; i < 6; i++) K.add(new THREE.OctahedronGeometry(3 + h1(i) * 3, 0), ice, 0.05, [-26 + i * 10, 7 + h1(i + 3) * 3, 7 - h1(i + 7) * 5], [h1(i) * 2, h1(i + 1) * 2, 0], [1, 1.8, 1]);
  // spine: an arch of vertebrae from the skull (left) up over the glacier and down into the tail (right)
  const spine = []; for (let i = 0; i <= 26; i++) { const t = i / 26; spine.push([-24 + t * 56, 13 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 17 - t * t * 8, Math.sin(t * 3) * 1.5]); }
  spine.forEach(([sx, sy, sz], i) => {
    const r = 1.9 - i * 0.045;
    K.add(new THREE.SphereGeometry(r, 8, 6), bone, 0, [sx, sy, sz], null, [1, 1.1, 1]);
    if (i % 2 === 0 && i < 22) K.add(new THREE.ConeGeometry(r * 0.45, r * 2.2, 5), bone, 0, [sx, sy + r * 1.6, sz]);          // dorsal spikes
  });
  // ribs: curved arcs hanging off the middle of the spine
  for (let i = 5; i <= 14; i++) {
    const [sx, sy, sz] = spine[i], L = 7 + Math.sin((i - 5) / 9 * Math.PI) * 6;
    for (const s of [1, -1]) K.tube([[sx, sy, sz], [sx + 1, sy - L * 0.35, sz + s * L * 0.55], [sx + 2.2, sy - L * 0.95, sz + s * L * 0.35]], 0.55, bone, 0, 10, 5);
  }
  // skull: long snout, jaw dropped open, swept horns, glowing sockets
  const [kx, ky] = spine[0];
  K.add(new THREE.SphereGeometry(4.2, 10, 8), bone, 0, [kx - 1, ky + 0.5, 0], null, [1.2, 0.9, 0.95]);
  K.add(new THREE.BoxGeometry(9, 2.6, 4.2), bone, 0, [kx - 7, ky - 0.4, 0], [0, 0, 0.12]);
  K.add(new THREE.BoxGeometry(8.5, 1.4, 3.4), bone, 0, [kx - 6.5, ky - 4.2, 0], [0, 0, -0.32]);
  for (let i = 0; i < 6; i++) for (const s of [1, -1]) {
    K.add(new THREE.ConeGeometry(0.35, 1.6, 4), 0xffffff, 0, [kx - 3.5 - i * 1.4, ky - 1.9, s * 1.6], [Math.PI, 0, 0]);
    K.add(new THREE.ConeGeometry(0.3, 1.3, 4), 0xffffff, 0, [kx - 3.2 - i * 1.3, ky - 3.2 - i * 0.35, s * 1.3], [0, 0, -0.32]);
  }
  for (const s of [1, -1]) {
    K.add(new THREE.SphereGeometry(1.15, 8, 6), [0x7ff8ff, 2.2], 0, [kx - 2.2, ky + 1.3, s * 2.9]);
    K.tube([[kx + 1, ky + 2.5, s * 2], [kx + 5, ky + 6, s * 3.5], [kx + 10, ky + 7, s * 3.8], [kx + 13, ky + 4.5, s * 3.2]], 0.7, bone, 0, 14, 5);
  }
  // wing bones fanning up from the shoulders, with torn frost membranes between the fingers
  const [wx, wy] = spine[7];
  for (const s of [1, -1]) {
    const el = [wx - 6, wy + 13, s * 6], fingers = [[wx - 18, wy + 20, s * 9], [wx - 8, wy + 25, s * 10], [wx + 4, wy + 24, s * 9]];
    K.seg([wx, wy, 0], el, 1.1, 0.8, bone);
    for (const f of fingers) K.seg(el, f, 0.6, 0.25, bone);
    for (let k = 0; k < 2; k++) {
      const a = fingers[k], b = fingers[k + 1], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...el, ...a, ...b, ...b, ...a, ...el], 3));
      K.add(g, (px, py) => [mixHex(0xbfe8ff, 0xffffff, (py - wy) / 25), 0.2]);
    }
  }
  // tail sinks into the ice; icicles hang from the ribs
  for (let i = 6; i < 15; i += 2) K.add(new THREE.ConeGeometry(0.5, 3.5, 5), ICE, 0.1, [spine[i][0] + 2, spine[i][1] - 12, spine[i][2]], [Math.PI, 0, 0]);
  const mesh = K.build({ x, y, z, scale, glowK: 1.8, shade: { y0: y, h: 36, ao: 0.6, rim: 0xd8f0ff, rimAmt: 0.55, tint: 0x5a6aa8, tintAmt: 0.25 } });
  return { mesh, update() {} };
}

// -------------------------------------------------------------------------------------------------------------
/** Ruins: the colossal head of a forgotten sun-king, half buried and tilted in the dunes, with a hand breaking
 *  the sand beside it. Striped royal headdress, kohl-lined eyes, a broken ceremonial beard. */
export function sunKingHead({ x = 8, y = -10, z = -118, scale = 1.3 } = {}) {
  const K = kit(), SAND = 0xf2c47a, STONE = 0xe8b070, STONE2 = 0xc8884e, BLUE = 0x2a5ab0, GOLD = 0xf2c14e;
  K.smooth = true;   // sculpted: smooth normals + bevelled blocks instead of flat-shaded facets
  const RB = (w, h, d, r = 0.45) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w * 0.45, h * 0.45, d * 0.45));
  // weathering: sun-bleached top, sand-stained base, darker streaks running down, worn paint; AO from the normal
  // (undersides, the eye sockets and under the brow/nose go dark), so the head reads as carved stone
  const weather = (hex, px, py, pz, ny, worn = 0) => {
    const g = Math.max(0, Math.min(1, (py - 3) / 22)), n = noise3(px * 0.35, py * 0.2, pz * 0.35);
    let c = mixHex(mixHex(0xa86a3a, hex, 0.55 + 0.45 * g), 0xfff0d0, 0.22 * g * g);
    if (worn) c = mixHex(c, mixHex(STONE2, STONE, n), worn * Math.max(0, n - 0.35) * 1.6);
    const streak = Math.max(0, Math.sin(px * 1.7 + Math.sin(pz * 0.9) * 2.0) - 0.82) * 3.5 * (1 - g * 0.6);
    const ao = 0.5 + 0.5 * Math.max(0, Math.min(1, 0.55 + ny * 0.6));
    return shift(c, ao * (1 - 0.22 * streak) * (0.92 + 0.12 * n));
  };
  const sst = (px, py, pz, ny = 0) => { const n = noise3(px * 0.7, py * 0.7, pz * 0.7); const crack = Math.abs(Math.sin(px * 0.9 + py * 1.3) * Math.cos(pz * 0.7 - py * 0.4)) < 0.03;
    return weather(crack ? shift(STONE2, 0.55) : mixHex(STONE2, STONE, n), px, py, pz, ny); };
  const W = (hex, worn = 0.5) => (px, py, pz, ny) => weather(hex, px, py, pz, ny, worn);
  const tilt = [0.06, 0.12, 0.14], P = (a) => { const v = new THREE.Vector3(...a).applyEuler(new THREE.Euler(...tilt)); return [v.x, v.y + 14, v.z]; };
  // dune it is buried in
  K.add(new THREE.SphereGeometry(26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), (px, py, pz) => mixHex(0xd89a58, SAND, 0.4 + py / 12 + 0.2 * Math.sin(px * 0.4 + pz * 0.3)), 0, [0, -1, 0], null, [1.4, 0.36, 0.7]);
  // face
  const head = (g, paint, pos, rot = [0, 0, 0], scl = null, glow = 0) => K.add(g, paint, glow, P(pos), [tilt[0] + rot[0], tilt[1] + rot[1], tilt[2] + rot[2]], scl);
  head(new THREE.SphereGeometry(8, 32, 24), sst, [0, 0, 0], [0, 0, 0], [0.85, 1.1, 0.9]);
  head(new THREE.SphereGeometry(5.2, 24, 16), sst, [0, -4.2, 3.2], [0, 0, 0], [0.92, 0.8, 0.85]);       // cheeks + jaw mass
  head(RB(2.2, 5, 2.4, 0.8), sst, [0, -1, 7.1], [-0.12, 0, 0]);                                      // nose
  head(new THREE.SphereGeometry(1.5, 16, 10), sst, [0, -3.6, 7.7], [0, 0, 0], [1.05, 0.7, 0.85]);       // nose tip + nostrils
  head(RB(6, 0.9, 1.4, 0.4), W(shift(STONE2, 0.85)), [0, -6.1, 7.0]);                                 // lips
  head(RB(5, 0.9, 1.4, 0.4), sst, [0, -7.0, 6.8]);
  head(RB(5.4, 0.35, 0.6, 0.15), W(0x5a3820, 0), [0, -6.6, 7.6]);                                     // mouth line
  for (const s of [1, -1]) {
    head(new THREE.SphereGeometry(2.1, 16, 10), W(shift(STONE2, 0.7), 0), [s * 2.9, 2.2, 6.0], [0, s * 0.25, 0], [1.05, 0.62, 0.6]);  // socket
    head(RB(3.6, 1.7, 1.2, 0.55), W(0xfaf0dc, 0.4), [s * 2.9, 2.3, 7.0], [0, s * 0.25, s * 0.08]);       // eye whites
    head(RB(1.4, 1.5, 0.6, 0.25), 0x1a1410, [s * 2.7, 2.3, 7.7], [0, s * 0.25, 0]);
    head(RB(5.2, 0.55, 1.4, 0.2), 0x1a1410, [s * 3.3, 3.25, 7.2], [0, s * 0.25, s * -0.08]);            // kohl line with wing
    head(RB(4.6, 1.0, 1.9, 0.45), sst, [s * 2.9, 4.6, 6.6], [0, s * 0.25, s * 0.12]);                    // brow
    // headdress lappets falling either side of the face, striped blue/gold (paint worn by the sand)
    head(RB(4, 13, 3.4, 1.0), (px, py, pz, ny) => weather(Math.floor(py * 0.9) % 2 ? BLUE : GOLD, px, py, pz, ny, 0.6), [s * 8.3, -3.5, 1.5], [0, 0, s * -0.08]);
  }
  // striped headdress dome + front band + cobra crest, and a crack missing a chunk of the crown
  head(new THREE.SphereGeometry(8.8, 36, 18, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.62), (px, py, pz, ny) => weather(Math.floor((Math.atan2(px, pz) + 3.2) * 4.0) % 2 ? BLUE : GOLD, px, py, pz, ny, 0.5), [0, 1.0, -0.6], [0, 0, 0], [0.86, 1.02, 0.96]);
  head(new THREE.TorusGeometry(8.2, 0.7, 6, 26, Math.PI), GOLD, [0, 4.4, 0], [Math.PI / 2 + 0.05, 0, Math.PI], null, 0.15);
  head(new THREE.ConeGeometry(1.0, 4, 6), [GOLD, 0.4], [0, 8.0, 7.4], [0.2, 0, 0]);
  head(new THREE.SphereGeometry(1.0, 8, 6), [0x3ad0c0, 1.4], [0, 6.6, 8.0]);
  head(RB(3.0, 5.5, 2.6, 0.7), (px, py, pz, ny) => weather(Math.floor(py * 1.6) % 2 ? shift(BLUE, 0.8) : shift(STONE2, 0.9), px, py, pz, ny, 0.4), [0, -10.2, 4.8], [0.2, 0, 0]);   // broken beard
  K.smooth = false;
  // fallen fragments and the giant hand breaking the sand
  K.add(new THREE.BoxGeometry(3.2, 3.2, 3.2), sst, 0, [-14, 1.5, 6], [0.4, 0.6, 0.3]);
  K.add(new THREE.BoxGeometry(2.4, 2.0, 2.0), (px, py) => (py > 1.8 ? BLUE : GOLD), 0, [-18, 0.8, 3], [0.2, 0.9, 0.5]);
  const hx = 18; K.add(new THREE.SphereGeometry(3.6, 10, 8), sst, 0, [hx, 2.5, 2], null, [1.3, 0.8, 0.8]);
  for (let f = 0; f < 4; f++) K.seg([hx - 3 + f * 2.0, 4, 2], [hx - 3.6 + f * 2.2, 9 - Math.abs(f - 1.5) * 0.9, 2.5 + f * 0.2], 0.9, 0.75, sst);
  K.seg([hx + 3.6, 3, 2], [hx + 6, 6, 3], 0.95, 0.8, sst);
  K.add(new THREE.TorusGeometry(2.4, 0.4, 5, 14), GOLD, 0.2, [hx, 1.6, 2], [Math.PI / 2, 0, 0]);
  const mesh = K.build({ x, y, z, scale, shade: { y0: y, h: 34, ao: 0.62, rim: 0xfff0c8, rimAmt: 0.5, tint: 0xc07850, tintAmt: 0.2 } });
  return { mesh, update() {} };
}

// -------------------------------------------------------------------------------------------------------------
/** Emberforge: a titan's anvil on a basalt pillar in the lava lake, its top white-hot, a giant hammer leaning on it
 *  and chains hanging from the horn. The hot parts pulse. */
export function giantAnvil({ x = -6, y = -9.3, z = -130, scale = 0.95 } = {}) {
  const K = kit(), IRON = 0x4e505e, IRON2 = 0x343642, BAS = 0x3a2a30, HOT = 0xff8a2a;
  const iron = (px, py, pz) => { const heat = Math.max(0, (py - 20) / 6); return heat > 0.6 ? [mixHex(HOT, 0xffe0a0, heat - 0.6), 1.4 * heat] : [mixHex(IRON2, IRON, noise3(px, py, pz)), 0]; };
  const bas = (px, py, pz) => { const seam = Math.abs(Math.sin(Math.atan2(pz, px) * 6)) < 0.08; const hot = py < 3 ? (3 - py) / 3 : 0;
    return seam ? [HOT, 0.9 + hot] : [mixHex(BAS, 0x5a4048, noise3(px, py * 0.5, pz)), hot * 0.6]; };
  // stepped basalt pillar rising from the lava, glowing at its foot
  K.add(new THREE.CylinderGeometry(9, 12, 6, 6), bas, 0, [0, 1, 0]);
  K.add(new THREE.CylinderGeometry(7.5, 9, 9, 6), bas, 0, [0, 8.5, 0], [0, 0.4, 0]);
  // anvil: foot, waist, face with a long horn and a heel
  K.add(new THREE.BoxGeometry(14, 3, 9), iron, 0, [0, 14.5, 0]);
  K.add(new THREE.BoxGeometry(8, 4, 6), iron, 0, [0, 18, 0]);
  K.add(new THREE.BoxGeometry(18, 4, 8), iron, 0, [0, 22, 0]);
  K.add(new THREE.ConeGeometry(4, 13, 10), iron, 0, [15.5, 22.5, 0], [0, 0, -Math.PI / 2], [1, 1, 0.9]);
  K.add(new THREE.BoxGeometry(4, 3, 7), iron, 0, [-10.5, 22.5, 0]);
  K.add(new THREE.BoxGeometry(11, 1.4, 5), [0xfff0b0, 2.2], 0, [-1, 24.6, 0]);                     // white-hot ingot
  // great hammer leaning against the anvil
  K.seg([-14, 5, 6], [-4, 30, 6], 1.1, 1.0, (px, py) => (Math.floor(py * 0.8) % 3 === 0 ? 0x2a1a14 : 0x6a4428));
  K.add(new THREE.BoxGeometry(10, 6, 6), (px, py, pz) => [mixHex(IRON2, IRON, noise3(px, py, pz)), 0], 0, [-3, 32, 6], [0, 0, -0.38]);
  K.add(new THREE.BoxGeometry(10.4, 1, 6.4), 0xb08a40, 0, [-3, 32, 6], [0, 0, -0.38]);
  // chains from the horn down into the lava
  for (let i = 0; i < 9; i++) K.add(new THREE.TorusGeometry(0.9, 0.3, 5, 10), (px, py) => (py < 4 ? [HOT, 1] : IRON2), 0, [19 + Math.sin(i * 0.5) * 0.6, 20 - i * 1.9, 1.5], [i % 2 ? 0 : Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0]);
  // runes glowing along the anvil face
  for (let i = 0; i < 5; i++) K.add(new THREE.BoxGeometry(0.6, 2, 0.4), [0xffb040, 1.6], 0, [-6 + i * 3, 22 + (i % 2) * 0.3, 4.1], [0, 0, (i % 2 ? 0.4 : -0.3)]);
  const mesh = K.build({ x, y, z, scale, glowK: 1.6, shade: { y0: y, h: 30, ao: 0.7, rim: 0xff9a50, rimAmt: 0.6 } });
  const mat = mesh.material, u = { uPulse: { value: 1 } }, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  mat.onBeforeCompile = (s, r) => { prev.call(mat, s, r); s.uniforms.uPulse = u.uPulse; s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPulse;').replace('* vGlow *', '* vGlow * uPulse *'); };
  mat.customProgramCacheKey = () => key + '|pulse';
  return { mesh, update(dt, t) { u.uPulse.value = 0.85 + 0.2 * Math.sin(t * 1.8) + 0.06 * Math.sin(t * 7.3); } };
}

// -------------------------------------------------------------------------------------------------------------
/** Neon: a giant neon "lucky cat" mascot sign on a steel lattice tower (waving paw, blinking eyes), plus an
 *  advertising blimp drifting over the skyline. Original mascot; no text or brands. */
export function luckyCatSign({ x = 6, y = -16, z = -88, scale = 0.85 } = {}) {
  const K = kit(), STEEL = 0x3a3a52, PINK = 0xff4fb8, CYAN = 0x3fe8ff, YEL = 0xffe040, BOARD = 0x120a24;
  // lattice tower
  const legs = [[-6, -3], [6, -3], [-6, 3], [6, 3]];
  for (const [lx, lz] of legs) K.seg([lx * 1.3, 0, lz * 1.3], [lx, 34, lz], 0.5, 0.4, STEEL);
  for (let k = 0; k < 6; k++) { const ya = k * 5.6, yb = ya + 5.6; for (const [a, b] of [[0, 1], [2, 3], [0, 2], [1, 3]]) {
    const A = legs[a], B = legs[b], ka = 1.3 - 0.3 * ya / 34, kb = 1.3 - 0.3 * yb / 34;
    K.seg([A[0] * ka, ya, A[1] * ka], [B[0] * kb, yb, B[1] * kb], 0.22, 0.22, STEEL); } }
  K.add(new THREE.BoxGeometry(16, 1.2, 9), STEEL, 0, [0, 34.5, 0]);
  // sign board (dark disc) with the cat drawn in neon tubes
  const cy = 50, tz = 1.6;  // (sign centre in local units)
  K.add(new THREE.CylinderGeometry(15, 15, 1.2, 28), BOARD, 0, [0, cy, 0], [Math.PI / 2, 0, 0]);
  K.add(new THREE.TorusGeometry(15, 0.45, 6, 40), [YEL, 2.4], 0, [0, cy, 0.8]);
  const neon = (c) => [c, 2.6];
  K.add(new THREE.TorusGeometry(8, 0.42, 6, 32), neon(PINK), 0, [0, cy - 1.5, tz]);                        // head
  K.tube([[-7, cy + 2, tz], [-6.5, cy + 9.5, tz], [-2.5, cy + 6.2, tz]], 0.42, neon(PINK), 0, 12);        // ears
  K.tube([[7, cy + 2, tz], [6.5, cy + 9.5, tz], [2.5, cy + 6.2, tz]], 0.42, neon(PINK), 0, 12);
  for (const s of [1, -1]) {
    K.add(new THREE.TorusGeometry(1.5, 0.35, 5, 14, Math.PI), neon(CYAN), 0, [s * 3.2, cy - 0.2, tz]);          // happy closed eyes
    for (const k of [-1, 1]) K.seg([s * 4.5, cy - 4 + k * 0.8, tz], [s * 11, cy - 3.5 + k * 1.8, tz], 0.22, 0.22, neon(CYAN));   // whiskers
  }
  K.tube([[-2.2, cy - 4.5, tz], [-1.1, cy - 5.6, tz], [0, cy - 4.6, tz], [1.1, cy - 5.6, tz], [2.2, cy - 4.5, tz]], 0.3, neon(YEL), 0, 14); // mouth
  K.add(new THREE.SphereGeometry(0.8, 8, 6), neon(PINK), 0, [0, cy - 3.3, tz]);                          // nose
  K.add(new THREE.TorusGeometry(2.0, 0.35, 5, 18), neon(YEL), 0, [0, cy - 9.2, tz]);                      // bell
  // raised waving paw (separate glow channel so it can blink between two positions)
  const paw = (ang, g) => { const px = 11 + Math.sin(ang) * 2, py = cy + 3 + Math.cos(ang) * 2; K.seg([8, cy - 4, tz], [px, py, tz], 0.4, 0.4, [YEL, g]); K.add(new THREE.TorusGeometry(1.8, 0.4, 5, 16), [YEL, g], 0, [px, py + 1.6, tz]); };
  paw(-0.5, 3.0); paw(0.5, 3.01);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.add(new THREE.OctahedronGeometry(0.6, 0), [i % 2 ? CYAN : PINK, 2.8], 0, [Math.cos(a) * 17.5, cy + Math.sin(a) * 17.5, 0.6]); }   // chaser bulbs
  K.add(new THREE.SphereGeometry(0.6, 6, 4), [0xff2040, 3], 0, [0, 66, 0]);                                  // aircraft beacon
  const mesh = K.build({ x, y, z, scale, glowK: 1.0 });
  const mat = mesh.material, u = { uT: { value: 0 } }, prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  // glow 3.0 / 3.01 = the two paw poses (alternate every 0.6 s); 2.8 = chaser bulbs; everything else steady
  mat.onBeforeCompile = (s, r) => {
    prev.call(mat, s, r); s.uniforms.uT = u.uT;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <emissivemap_fragment>', `float gk = vGlow;
        if (abs(vGlow - 3.0) < 0.004) gk = step(0.5, fract(uT * 0.8)) * 2.6;
        else if (abs(vGlow - 3.01) < 0.004) gk = (1.0 - step(0.5, fract(uT * 0.8))) * 2.6;
        else if (abs(vGlow - 2.8) < 0.01) gk = 0.6 + 2.2 * step(0.5, fract(uT * 2.0 + gl_FragCoord.x * 0.002));
        #include <emissivemap_fragment>`).replace('* vGlow *', '* gk *');
  };
  mat.customProgramCacheKey = () => key + '|cat';
  return { mesh, update(dt, t) { u.uT.value = t; } };
}

export function blimp({ y = 30, z = -165, scale = 1.3 } = {}) {
  const K = kit(), HULL = 0x8a84b0, HULL2 = 0x5a5488;
  K.add(new THREE.SphereGeometry(5, 18, 12), (px, py, pz) => (Math.abs(py) < 0.9 && pz > 0 ? [Math.floor(px * 0.5) % 2 ? 0x3fe8ff : 0xff4fb8, 2.2] : mixHex(HULL2, HULL, 0.5 + py / 10)), 0, [0, 0, 0], null, [3.2, 1, 1]);
  for (const [r, s] of [[0, 1], [Math.PI / 2, 1], [Math.PI, 1], [-Math.PI / 2, 1]]) K.add(new THREE.BoxGeometry(4, 3.2, 0.3), HULL2, 0, [-14.5, Math.cos(r) * 2.5, Math.sin(r) * 2.5], [r, 0, 0]);
  K.add(new THREE.BoxGeometry(5, 1.6, 2), 0x2a2840, 0, [1, -5.5, 0]);
  for (let i = 0; i < 4; i++) K.add(new THREE.BoxGeometry(0.7, 0.6, 0.2), [0xffd27a, 1.5], 0, [-0.8 + i * 1.2, -5.5, 1.05]);
  K.add(new THREE.SphereGeometry(0.4, 6, 4), [0xff2040, 3], 0, [0, 5.1, 0]); K.add(new THREE.SphereGeometry(0.4, 6, 4), [0x40ff80, 3], 0, [-16, 0, 0]);
  const mesh = K.build({ x: 0, y, z, scale, glowK: 1.0 });
  return { mesh, update(dt, t) { mesh.position.x = Math.sin(t * 0.02) * 120; mesh.position.y = Math.sin(t * 0.3) * 0.8; } };
}
