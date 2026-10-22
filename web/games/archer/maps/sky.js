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

/** Lit faceted low-poly mountain range (vertex colours: rock -> snow cap). Reads as sculpted 3D, not flat paper. */
export function mountains({ z = -140, count = 9, seed = 5, width = 520, height = [30, 60], radius = [22, 40], rock = 0x6a74a8, rock2 = 0x8a8fc0, snow = 0xffffff, capLine = 0.55, y0 = -14, x = 0 } = {}) {
  const rng = makeRng(seed), parts = [];
  const cR = new THREE.Color(rock), cR2 = new THREE.Color(rock2), cS = new THREE.Color(snow), tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const h = height[0] + rng() * (height[1] - height[0]), r = radius[0] + rng() * (radius[1] - radius[0]);
    let g = new THREE.ConeGeometry(r, h, 7, 4); g = g.toNonIndexed();
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k), t = (yy + h / 2) / h;
      if (t < 0.99) { const j = (1 - t) * 0.35 + 0.08; p.setX(k, p.getX(k) * (1 + (Math.sin(p.getX(k) * 3.1 + p.getZ(k) * 2.3 + i) * j))); p.setZ(k, p.getZ(k) * (1 + Math.cos(p.getZ(k) * 2.7 + i) * j)); p.setY(k, yy + Math.sin(p.getX(k) * 0.7 + i) * h * 0.04 * (1 - t)); }
    }
    g.computeVertexNormals();
    const col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k += 3) {
      const ty = ((p.getY(k) + p.getY(k + 1) + p.getY(k + 2)) / 3 + h / 2) / h;
      const line = capLine + Math.sin((p.getX(k) + p.getZ(k)) * 0.25 + i) * 0.08;
      if (ty > line) tmp.copy(cS); else tmp.copy(cR).lerp(cR2, rng() * 0.6);
      for (let q = 0; q < 3; q++) col.set([tmp.r, tmp.g, tmp.b], (k + q) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.translate(x - width / 2 + (i + 0.3 + rng() * 0.4) / count * width, y0 + h / 2, z - rng() * 40);
    parts.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  return mesh;
}

/** Distant floating islands with tree blobs and (optionally) animated waterfalls. Returns { group, update(dt,t) }. */
export function richIslands({ count = 6, seed = 7, top = 0x58c43a, rock = 0xc99060, rock2 = 0x9a6a44, foliage = [0x3faa3a, 0x6fd24a], zRange = [-70, -170], yRange = [0, 24], xRange = [-170, 170], falls = 3, waterY = -9 } = {}) {
  const rng = makeRng(seed), group = new THREE.Group(), parts = [], fallParts = [];
  const cT = new THREE.Color(top), cR = new THREE.Color(rock), cR2 = new THREE.Color(rock2), tmp = new THREE.Color();
  const colorize = (g, fn) => { const pp = g.attributes.position, c = new Float32Array(pp.count * 3); for (let k = 0; k < pp.count; k++) { fn(pp.getX(k), pp.getY(k), pp.getZ(k), tmp); c.set([tmp.r, tmp.g, tmp.b], k * 3); } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  for (let i = 0; i < count; i++) {
    const w = 6 + rng() * 10, d = w * (0.9 + rng() * 0.7), cx = xRange[0] + (i + rng() * 0.6) / count * (xRange[1] - xRange[0]), cy = yRange[0] + rng() * (yRange[1] - yRange[0]), cz = zRange[0] + rng() * (zRange[1] - zRange[0]);
    let body = new THREE.CylinderGeometry(w, w * 0.12, d, 10, 5).toNonIndexed(); body.translate(0, -d / 2, 0);
    const p = body.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); const n = Math.sin(p.getX(k) * 1.3 + i) * Math.cos(p.getZ(k) * 1.1 + y * 0.5); p.setX(k, p.getX(k) * (1 + n * 0.18)); p.setZ(k, p.getZ(k) * (1 + n * 0.18)); }
    body.computeVertexNormals();
    colorize(body, (x, y, z, c) => { const band = Math.floor((y + 50) / 1.6) % 2; c.copy(band ? cR : cR2).multiplyScalar(0.75 + 0.3 * Math.max(0, 1 + y / d)); });
    let cap = new THREE.CylinderGeometry(w * 1.05, w * 0.97, 0.9, 10).toNonIndexed(); cap.translate(0, 0.2, 0); colorize(cap, (x, y, z, c) => c.copy(cT));
    const geos = [body, cap];
    const trees = 2 + Math.floor(rng() * 4);
    for (let k = 0; k < trees; k++) {
      const r = 1.2 + rng() * 1.8, a = rng() * 6.28, rr = rng() * w * 0.7;
      const blob = new THREE.IcosahedronGeometry(r, 0); blob.translate(Math.cos(a) * rr, 0.6 + r * 0.8, Math.sin(a) * rr * 0.6);
      const fc = new THREE.Color(foliage[k % foliage.length]); colorize(blob, (x, y, z, c) => c.copy(fc).multiplyScalar(0.8 + 0.3 * rng()));
      geos.push(blob);
    }
    const m = mergeGeometries(geos); m.translate(cx, cy, cz); parts.push(m);
    if (i < falls) {
      const fw = 2.2 + rng() * 1.6, fh = cy - waterY + 2;
      const f = new THREE.PlaneGeometry(fw, fh, 1, 1); f.translate(cx + (rng() - 0.5) * w * 0.4, cy - fh / 2 - 0.2, cz + w * 0.95); fallParts.push(f);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  group.add(mesh);
  let fallMat = null;
  if (fallParts.length) {
    fallMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: `varying vec2 vUv; varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          float s = vn(vec2(vUv.x * 9.0, vUv.y * 3.0 + uTime * 2.2));
          vec3 c = mix(vec3(0.62, 0.86, 1.0), vec3(1.0), smoothstep(0.35, 0.8, s));
          float a = edge * (0.75 + 0.25 * s) * smoothstep(0.0, 0.06, vUv.y);
          gl_FragColor = vec4(c, a);
          #include <fog_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const fm = new THREE.Mesh(mergeGeometries(fallParts), fallMat); fm.renderOrder = 2; group.add(fm);
  }
  return { group, update(dt, t) { if (fallMat) fallMat.uniforms.uTime.value = t; } };
}

/** Distant castle silhouette (towers with cone roofs) for skyline storytelling. */
export function castle({ x = 0, y = 0, z = -150, scale = 1, wall = 0x8a86b0, roof = 0x5a4aa0, windows = 0xffd27a } = {}) {
  const parts = [], tmp = new THREE.Color();
  const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); tmp.set(c); for (let k = 0; k < n; k++) a.set([tmp.r, tmp.g, tmp.b], k * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const T = [[0, 22, 3.2], [-7, 15, 2.4], [7, 17, 2.6], [-13, 10, 2.0], [12, 11, 2.0]];
  for (const [tx, th, tr] of T) {
    const b = new THREE.CylinderGeometry(tr, tr * 1.1, th, 10).toNonIndexed(); b.translate(tx, th / 2, 0); parts.push(col(b, wall));
    const r = new THREE.ConeGeometry(tr * 1.35, tr * 2.6, 10).toNonIndexed(); r.translate(tx, th + tr * 1.3, 0); parts.push(col(r, roof));
    const w = new THREE.BoxGeometry(tr * 0.5, tr * 0.7, 0.2).toNonIndexed(); w.translate(tx, th * 0.75, tr * 0.98); parts.push(col(w, windows));
  }
  const wl = new THREE.BoxGeometry(26, 7, 3).toNonIndexed(); wl.translate(0, 3.5, -1); parts.push(col(wl, wall));
  const g = mergeGeometries(parts); g.scale(scale, scale, scale); g.translate(x, y, z);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, emissive: 0x000000 }));
}
