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
