// Arrow model kit (owner: Arrows/VFX/Audio specialist).
// Convention: TIP at the origin, shaft along -X, total length ~1.0 world units. Models are cached per id and cloned.
import * as THREE from 'three';

const cache = new Map();
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1 });

/** Shared builder: shaft + head + fletching + nock. opts: { shaft, head, fletch, fletch2, headShape: 'broad'|'tri'|'bulb', glow } */
export function buildArrow(o = {}) {
  const g = new THREE.Group();
  const shaftM = M(o.shaft ?? 0xc89a62, { rough: 0.6 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.86, 6), shaftM);
  shaft.rotation.z = Math.PI / 2; shaft.position.x = -0.55; g.add(shaft);
  const headM = M(o.head ?? 0xdfe6ee, { metal: 0.85, rough: 0.25, emissive: o.glow ?? 0x000000, ei: o.glow ? 1.4 : 0 });
  let head;
  if (o.headShape === 'tri') head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 3), headM);
  else if (o.headShape === 'bulb') head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), headM);
  else head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), headM);
  head.rotation.z = -Math.PI / 2; head.position.x = -0.1; head.scale.set(1, 1, 0.45); g.add(head);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(-0.22, 0.0); fl.lineTo(-0.26, 0.085); fl.lineTo(-0.06, 0.05); fl.closePath();
  const flGeo = new THREE.ExtrudeGeometry(fl, { depth: 0.006, bevelEnabled: false }); flGeo.translate(0, 0.012, -0.003);
  const f1 = M(o.fletch ?? 0xe8423f, { rough: 0.7 }), f2 = M(o.fletch2 ?? 0xffffff, { rough: 0.7 });
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(flGeo, i === 0 ? f2 : f1); f.position.x = -0.72; f.rotation.x = (i / 3) * Math.PI * 2 + 0.3; g.add(f);
  }
  const nock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6), M(o.nock ?? 0x2a2a32)); nock.rotation.z = Math.PI / 2; nock.position.x = -0.99; g.add(nock);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.scale.setScalar(1.3);
  return g;
}

/** Get a fresh instance of a cached model. build: () => Object3D. */
export function instance(id, build) {
  let proto = cache.get(id);
  if (!proto) { proto = build(); cache.set(id, proto); }
  return proto.clone();
}

export function addBomb(g, color = 0xd23a2a) {
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M(color, { rough: 0.35, metal: 0.2 }));
  body.scale.set(1.5, 1, 1); body.position.x = -0.26; g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 14), M(0x2a2a32, { metal: 0.6, rough: 0.4 }));
  band.rotation.y = Math.PI / 2; band.position.x = -0.26; g.add(band);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0xffd27a, { emissive: 0xffa040, ei: 3 }));
  spark.position.set(-0.3, 0.12, 0); g.add(spark);
  return g;
}
export function addRune(g, color) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 16), M(color, { emissive: color, ei: 2 }));
  r.rotation.y = Math.PI / 2; r.position.x = -0.32; g.add(r);
  return g;
}

// ---- special heads (built once per id, then cloned). Each hides the default steel head (children[1]). ----
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };

/** Bouncer: a rubbery lime ball with a white band in place of the head. */
export function addBall(g, color = 0x7dff4a) {
  g.children[1].visible = false;
  const ball = mesh(new THREE.SphereGeometry(0.13, 16, 12), M(color, { rough: 0.3, emissive: 0x2a8a10, ei: 0.6 }), -0.12);
  const band = mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 18), M(0xffffff, { rough: 0.4 }), -0.12);
  band.rotation.y = Math.PI / 2;
  const dot = mesh(new THREE.SphereGeometry(0.045, 8, 6), M(0xfff36a, { emissive: 0xffd000, ei: 1.5 }), -0.02, 0.06);
  g.add(ball, band, dot);
  return g;
}
/** Driller: a long spiralled auger bit. */
export function addDrill(g) {
  g.children[1].visible = false;
  const bit = mesh(new THREE.ConeGeometry(0.1, 0.42, 7), M(0xffb02a, { metal: 0.8, rough: 0.25, emissive: 0x5a2a00, ei: 0.6 }), -0.2);
  bit.rotation.z = Math.PI / 2; g.add(bit);
  const fluteM = M(0x3a2a22, { metal: 0.6, rough: 0.4 });
  for (let i = 0; i < 4; i++) {
    const t = mesh(new THREE.TorusGeometry(0.085 - i * 0.017, 0.012, 4, 10), fluteM, -0.34 + i * 0.09); t.rotation.y = Math.PI / 2 + 0.35; g.add(t);
  }
  const collar = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), M(0x2a2a32, { metal: 0.7, rough: 0.3 }), -0.44); collar.rotation.z = Math.PI / 2; g.add(collar);
  return g;
}
/** Frost: a faceted ice crystal head. */
export function addCrystal(g) {
  g.children[1].visible = false;
  const iceM = new THREE.MeshStandardMaterial({ color: 0xbff4ff, roughness: 0.1, metalness: 0.1, emissive: 0x3ab8ff, emissiveIntensity: 0.9, flatShading: true });
  const c = mesh(new THREE.OctahedronGeometry(0.13, 0), iceM, -0.1); c.scale.set(1.9, 0.9, 0.9); g.add(c);
  const s1 = mesh(new THREE.OctahedronGeometry(0.06, 0), iceM, -0.22, 0.07); s1.scale.set(1.6, 0.8, 0.8); s1.rotation.z = 0.6; g.add(s1);
  const s2 = mesh(new THREE.OctahedronGeometry(0.06, 0), iceM, -0.22, -0.07); s2.scale.set(1.6, 0.8, 0.8); s2.rotation.z = -0.6; g.add(s2);
  return g;
}
/** Lightning: a zig-zag bolt head with a violet glow core. */
export function addBolt(g) {
  g.children[1].visible = false;
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(-0.16, 0.09); s.lineTo(-0.14, 0.02); s.lineTo(-0.3, 0.07); s.lineTo(-0.18, -0.03); s.lineTo(-0.2, 0.02); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }); geo.translate(0, 0, -0.02);
  const b = mesh(geo, M(0xffe94a, { emissive: 0xffc800, ei: 2.2, rough: 0.3 })); b.scale.setScalar(1.3); g.add(b);
  g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), M(0xd8b0ff, { emissive: 0xa050ff, ei: 3 }), -0.3));
  return g;
}
/** Warp: a three-pronged magenta grapple hook. */
export function addHook(g) {
  g.children[1].visible = false;
  const hm = M(0xff5ad8, { metal: 0.7, rough: 0.25, emissive: 0x8a1070, ei: 1.0 });
  const stem = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), hm, -0.12); stem.rotation.z = Math.PI / 2; g.add(stem);
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.12, 6), hm, 0); tip.rotation.z = -Math.PI / 2; g.add(tip);
  for (let i = 0; i < 3; i++) {
    const prong = new THREE.Group(); prong.position.x = -0.2; prong.rotation.x = (i / 3) * Math.PI * 2;
    const arc = mesh(new THREE.TorusGeometry(0.08, 0.02, 5, 10, Math.PI * 0.9), hm, 0.04, 0.08); arc.rotation.z = Math.PI * 0.55;
    prong.add(arc); g.add(prong);
  }
  g.add(mesh(new THREE.OctahedronGeometry(0.05, 0), M(0xffffff, { emissive: 0xff7ae8, ei: 2.5 }), -0.3));
  return g;
}
