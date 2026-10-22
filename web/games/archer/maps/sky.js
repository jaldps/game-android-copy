// Backdrop kit: sky dome, toon clouds, sea, distant floating islands, mountain ridges (owner: Maps specialist).
// All builders return THREE objects; the map's buildBackdrop() composes them and returns { group, update(dt, t, cam) }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../core/util.js';

export function skyDome({ top = 0x2f7fe0, mid = 0x7cc4f2, horizon = 0xdff4ff, sun = 0xfff1c8, sunDir = [-0.45, 0.35, -1], sunSize = 0.9, stars = 0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uHor: { value: new THREE.Color(horizon) }, uSun: { value: new THREE.Color(sun) },
      uSunDir: { value: new THREE.Vector3(...sunDir).normalize() }, uSunSize: { value: sunSize }, uStars: { value: stars } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uMid, uHor, uSun, uSunDir; uniform float uSunSize, uStars; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float y = vD.y;
        vec3 c = mix(uHor, uMid, smoothstep(-0.05, 0.22, y));
        c = mix(c, uTop, smoothstep(0.2, 0.75, y));
        float s = max(dot(vD, uSunDir), 0.0);
        c += uSun * (pow(s, 600.0 / uSunSize) * 3.0 + pow(s, 40.0) * 0.35 + pow(s, 6.0) * 0.12);
        if (uStars > 0.0) { vec3 q = floor(vD * 300.0); float st = step(0.9965, h(q)) * smoothstep(0.1, 0.5, y); c += st * uStars * vec3(1.0, 0.95, 0.9); }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

/** Instanced toon cloud field. Returns { mesh, update(dt) }. */
export function cloudField({ count = 16, seed = 3, color = 0xffffff, shade = 0xc8dcf0, zRange = [-90, -240], yRange = [10, 60], xRange = [-220, 220], scale = [10, 22], speed = 1.2 } = {}) {
  const rng = makeRng(seed);
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.SphereGeometry(1, 14, 10);
    const r = i === 0 ? 1 : 0.45 + rng() * 0.45;
    g.scale(r, r * 0.85, r * 0.8); g.translate((i === 0 ? 0 : (rng() - 0.5) * 2.6), (i === 0 ? 0 : (rng() - 0.3) * 0.7) + r * 0.3, (rng() - 0.5) * 0.6);
    parts.push(g);
  }
  const base = new THREE.SphereGeometry(1, 14, 8); base.scale(2.0, 0.45, 0.8); base.translate(0, -0.15, 0); parts.push(base);
  const geo = mergeGeometries(parts);
  // vertex colour: bright tops, bluish bellies
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), a = new THREE.Color(color), b = new THREE.Color(shade), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { t.copy(b).lerp(a, THREE.MathUtils.smoothstep(pos.getY(i), -0.4, 0.6)); col.set([t.r, t.g, t.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.18 });
  const mesh = new THREE.InstancedMesh(geo, mat, count); mesh.frustumCulled = false;
  const data = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const sc = scale[0] + rng() * (scale[1] - scale[0]);
    data.push({ x: xRange[0] + rng() * (xRange[1] - xRange[0]), y: yRange[0] + rng() * (yRange[1] - yRange[0]), z: zRange[0] + rng() * (zRange[1] - zRange[0]), s: sc, v: speed * (0.6 + rng() * 0.8) });
  }
  const write = () => { for (let i = 0; i < data.length; i++) { const d = data[i]; p.set(d.x, d.y, d.z); s.set(d.s, d.s, d.s); m4.compose(p, q, s); mesh.setMatrixAt(i, m4); } mesh.instanceMatrix.needsUpdate = true; };
  write();
  return {
    mesh,
    update(dt) { for (const d of data) { d.x += d.v * dt; if (d.x > xRange[1]) d.x = xRange[0]; } write(); },
  };
}

/** Stylized sea plane at height y. */
export function sea({ y = -9, shallow = 0x3fd0d8, deep = 0x1478b8, foam = 0xffffff, ice = 0 } = {}) {
  const g = new THREE.PlaneGeometry(3000, 1600, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uShallow: { value: new THREE.Color(shallow) }, uDeep: { value: new THREE.Color(deep) }, uFoam: { value: new THREE.Color(foam) }, uIce: { value: ice } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime, uIce; uniform vec3 uShallow, uDeep, uFoam; varying vec3 vW;
      #include <fog_pars_fragment>
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = vW.xz;
        float w1 = vn(p * 0.12 + vec2(uTime * 0.12, uTime * 0.05)), w2 = vn(p * 0.31 - vec2(uTime * 0.1, -uTime * 0.16));
        float waves = w1 * 0.6 + w2 * 0.4;
        vec3 c = mix(uShallow, uDeep, smoothstep(-5.0, -120.0, vW.z));
        c *= 0.88 + 0.22 * waves;
        float cl = smoothstep(0.47, 0.5, abs(fract(waves * 5.0 + uTime * 0.05) - 0.5));
        c = mix(c, uFoam, cl * 0.18);
        vec2 sc = p * 0.6; vec2 sf = fract(sc) - 0.5;
        float sp = step(0.985, h12(floor(sc) + floor(uTime * 1.3))) * smoothstep(0.25, 0.0, length(sf));
        c += sp * 0.5;
        if (uIce > 0.0) { float fl = smoothstep(0.55, 0.6, vn(p * 0.08 + 3.0)); c = mix(c, vec3(0.86, 0.95, 1.0) * (0.9 + 0.1 * w2), fl * uIce); }
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.y = y; m.receiveShadow = false;
  return { mesh: m, update(dt, t) { mat.uniforms.uTime.value = t; } };
}

/** Distant floating islands (cheap, fogged). */
export function farIslands({ count = 8, seed = 7, top = 0x6fcf3a, rock = 0xc49a6c, zRange = [-50, -150], yRange = [-2, 22], xRange = [-160, 160] } = {}) {
  const rng = makeRng(seed), parts = [];
  const cT = new THREE.Color(top), cR = new THREE.Color(rock), tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const w = 4 + rng() * 9, d = w * (0.7 + rng() * 0.6);
    const g = new THREE.CylinderGeometry(w, w * 0.08, d, 9, 3); g.translate(0, -d / 2, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) * (1 + (rng() - 0.5) * 0.25)); p.setZ(k, p.getZ(k) * (1 + (rng() - 0.5) * 0.25)); if (y > -0.01) p.setY(k, y + rng() * 0.6); }
    const cap = new THREE.CylinderGeometry(w * 1.04, w * 0.98, 0.7, 9); cap.translate(0, 0.2, 0);
    const col = (geo, fn) => { const pp = geo.attributes.position, c = new Float32Array(pp.count * 3); for (let k = 0; k < pp.count; k++) { fn(pp.getY(k), tmp); c.set([tmp.r, tmp.g, tmp.b], k * 3); } geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); };
    col(g, (y) => tmp.copy(cR).multiplyScalar(0.7 + 0.3 * Math.max(0, 1 + y / d)));
    col(cap, () => tmp.copy(cT));
    const m = mergeGeometries([g.toNonIndexed(), cap.toNonIndexed()]); m.computeVertexNormals();
    m.translate(xRange[0] + rng() * (xRange[1] - xRange[0]), yRange[0] + rng() * (yRange[1] - yRange[0]), zRange[0] + rng() * (zRange[1] - zRange[0]));
    parts.push(m);
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  return mesh;
}

/** Jagged mountain ridge silhouette layer (vertex-coloured, optional snow caps). */
export function ridge({ z = -120, y0 = -12, height = 30, width = 700, peaks = 14, seed = 11, color = 0x7a8fb0, cap = 0xffffff, capLine = 0.62, x = 0 } = {}) {
  const rng = makeRng(seed), pts = [];
  for (let i = 0; i <= peaks * 2; i++) { const t = i / (peaks * 2); pts.push([x - width / 2 + t * width, y0 + (i % 2 ? height * (0.55 + rng() * 0.45) : height * (0.15 + rng() * 0.3))]); }
  const pos = [], colA = [], c1 = new THREE.Color(color), c2 = new THREE.Color(cap), tmp = new THREE.Color();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    pos.push(ax, y0 - 40, z, bx, y0 - 40, z, bx, by, z, ax, y0 - 40, z, bx, by, z, ax, ay, z);
    for (const yy of [y0 - 40, y0 - 40, by, y0 - 40, by, ay]) { const k = (yy - y0) / height; tmp.copy(c1).multiplyScalar(0.75 + 0.35 * Math.max(0, k)); if (cap !== null && k > capLine) tmp.copy(c2); colA.push(tmp.r, tmp.g, tmp.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3)); g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
}
