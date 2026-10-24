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

/** Depth shading for backdrop landforms: vertical AO gradient (dark at the base -> full colour at the top), a
 *  coloured rim light on silhouette edges, and a cool atmospheric tint toward the base. Wraps any existing patch. */
export function depthShade(mat, { y0 = -14, h = 50, ao = 0.55, rim = 0xfff0d8, rimAmt = 0.5, tint = null, tintAmt = 0.25 } = {}) {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.() ?? '';
  const u = { uDY0: { value: y0 }, uDH: { value: h }, uDAO: { value: ao }, uDRim: { value: new THREE.Color(rim) }, uDRimAmt: { value: rimAmt },
    uDTint: { value: new THREE.Color(tint ?? 0x000000) }, uDTintAmt: { value: tint === null ? 0 : tintAmt } };
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vDY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDY; uniform float uDY0, uDH, uDAO, uDRimAmt, uDTintAmt; uniform vec3 uDRim, uDTint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float k = smoothstep(uDY0, uDY0 + uDH, vDY); diffuseColor.rgb *= mix(uDAO, 1.0, k); diffuseColor.rgb = mix(diffuseColor.rgb, uDTint, uDTintAmt * (1.0 - k)); }`)
      .replace('#include <opaque_fragment>', `{ float fr = pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 3.0);
        outgoingLight += uDRim * fr * uDRimAmt * smoothstep(uDY0, uDY0 + uDH, vDY); }
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => prevKey + '|depthshade';
  return mat;
}

/** Far fog layer: a translucent band of haze rising from the horizon, placed between backdrop layers for depth. */
export function hazeLayer({ z = -200, y0 = -14, height = 60, width = 2000, color = 0xffffff, alpha = 0.55 } = {}) {
  const g = new THREE.PlaneGeometry(width, height, 1, 1); g.translate(0, y0 + height / 2, z);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
    uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: alpha } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uC; uniform float uA; varying vec2 vUv;
      void main(){ float a = uA * pow(1.0 - vUv.y, 1.6); gl_FragColor = vec4(uC, a);
        #include <colorspace_fragment>
      }` });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 1; return m;
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
export function mountains({ z = -140, count = 9, seed = 5, width = 520, height = [30, 60], radius = [22, 40], rock = 0x6a74a8, rock2 = 0x8a8fc0, snow = 0xffffff, capLine = 0.55, y0 = -14, x = 0, rimColor = 0xffe8d8, baseTint = 0x4a5a8a } = {}) {
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
  const mat = depthShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), { y0, h: height[1] * 0.85, ao: 0.5, rim: rimColor, rimAmt: 0.55, tint: baseTint, tintAmt: 0.3 });
  return new THREE.Mesh(mergeGeometries(parts), mat);
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
      // curved sheet of water (bulges out over the lip, then drops), plus a splash/mist cloud where it meets the sea
      const fx = cx + (rng() - 0.5) * w * 0.4, fz = cz + w * 0.95;
      const f = new THREE.PlaneGeometry(fw, fh, 4, 16), fp = f.attributes.position;
      for (let k = 0; k < fp.count; k++) { const v = 0.5 - fp.getY(k) / fh, xx = fp.getX(k); fp.setXYZ(k, xx * (1 + v * 0.6), fp.getY(k), Math.sin(Math.min(1, v * 6) * 1.57) * 1.2 + (xx * xx) * -0.15); }
      f.translate(fx, cy - fh / 2 - 0.2, fz);
      const kind = new Float32Array(fp.count).fill(0); f.setAttribute('aKind', new THREE.BufferAttribute(kind, 1)); fallParts.push(f);
      for (let m = 0; m < 3; m++) {         // mist puffs: camera-facing-ish quads at the base, animated in the shader
        const ms = fw * (1.6 + m * 0.7), q = new THREE.PlaneGeometry(ms * 1.6, ms, 1, 1);
        q.translate(fx + (m - 1) * fw * 0.5, waterY + ms * 0.32, fz + 1.4 + m * 0.3);
        q.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count).fill(1 + m), 1)); fallParts.push(q);
      }
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  group.add(mesh);
  let fallMat = null;
  if (fallParts.length) {
    fallMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: `attribute float aKind; varying vec2 vUv; varying vec3 vW; varying float vK;
        #include <fog_pars_vertex>
        void main(){ vUv = uv; vK = aKind; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW; varying float vK;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 c; float a;
          if (vK < 0.5) {
            // falling water: fast streaks scrolling down in WORLD units, blue core / white foam edges, foam at the lip
            float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
            float s1 = vn(vec2(vUv.x * 14.0, vW.y * 0.35 + uTime * 5.5)), s2 = vn(vec2(vUv.x * 30.0 + 3.0, vW.y * 0.9 + uTime * 9.0));
            float foam = smoothstep(0.55, 0.85, s1 * 0.6 + s2 * 0.5) + (1.0 - edge) * 0.5 + smoothstep(0.9, 1.0, vUv.y);
            c = mix(vec3(0.35, 0.72, 0.95), vec3(1.0), clamp(foam, 0.0, 1.0));
            c *= 0.85 + 0.15 * s2;
            a = edge * (0.6 + 0.35 * s1) * smoothstep(0.0, 0.05, vUv.y) + (1.0 - edge) * 0.0;
          } else {
            // splash + mist: soft billowing puff that swells and fades on a loop
            vec2 q = vUv - vec2(0.5, 0.35); float t = fract(uTime * 0.35 + vK * 0.31);
            float r = length(q * vec2(1.0, 1.5)) / (0.38 + 0.12 * t);
            float n = vn(vUv * 6.0 + vec2(uTime * 0.4, -uTime * 0.6) + vK * 3.0);
            a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.5) * (0.55 - 0.15 * (vK - 1.0)) * (0.7 + 0.3 * sin(uTime * 2.0 + vK));
            c = mix(vec3(0.85, 0.95, 1.0), vec3(1.0), n);
          }
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

// ---------------------------------------------------------------------------------------------------------------
// Biome backdrop pieces (desert, lava, city). Each is ONE draw call.

/** Lit, flat-shaded vertex-colour material whose `aGlow` attribute (0..n) makes parts self-lit (lava, windows). */
export function glowStdMaterial(k = 1.6) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * ${k.toFixed(2)};`);
  };
  mat.customProgramCacheKey = () => 'archer-glowstd-' + k.toFixed(2);
  return mat;
}
const _c = new THREE.Color();
/** Writes `color` + `aGlow` attributes: fn(x, y, z, faceIndex) -> [hex, glow]. Geometry must be non-indexed. */
function paintGlow(g, fn) {
  const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3), gl = new Float32Array(n);
  for (let i = 0; i < n; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const [hex, glow] = fn(cx, cy, cz, i / 3); _c.set(hex);
    for (let q = 0; q < 3; q++) { c.set([_c.r, _c.g, _c.b], (i + q) * 3); gl[i + q] = glow; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1));
  return g;
}

/** Flat-topped, strata-banded desert buttes (and optional stepped pyramids). */
export function mesas({ z = -150, count = 8, seed = 4, width = 560, height = [18, 40], radius = [12, 26], bands = [0xd98a4a, 0xc0703e, 0xe8a868, 0xb05a34], top = 0xf2c98a, y0 = -14, x = 0, pyramids = [], rimColor = 0xfff0c8, baseTint = 0x9a5a48 } = {}) {
  const rng = makeRng(seed), parts = [];
  for (let i = 0; i < count; i++) {
    const h = height[0] + rng() * (height[1] - height[0]), r = radius[0] + rng() * (radius[1] - radius[0]);
    const g = new THREE.CylinderGeometry(r * (0.62 + rng() * 0.2), r, h, 9, 7).toNonIndexed();
    const p = g.attributes.position, ph = rng() * 10;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k), t = (yy + h / 2) / h, a = Math.atan2(p.getZ(k), p.getX(k));
      const step = 1 + 0.12 * Math.sin(a * 3 + ph) + 0.1 * Math.round(Math.sin(t * 9 + ph) * 1.5) / 1.5;
      if (Math.abs(yy - h / 2) > 0.01) { p.setX(k, p.getX(k) * step); p.setZ(k, p.getZ(k) * step); }
    }
    g.computeVertexNormals();
    const bandH = h / (5 + Math.floor(rng() * 3));
    paintGlow(g, (cx, cy) => [cy > h / 2 - 0.01 ? top : bands[Math.floor((cy + h / 2) / bandH + i) % bands.length], 0]);
    g.translate(x - width / 2 + (i + 0.2 + rng() * 0.6) / count * width, y0 + h / 2, z - rng() * 50);
    parts.push(g);
  }
  for (const P of pyramids) {
    const s = P.size, steps = 7;
    for (let k = 0; k < steps; k++) {
      const w = s * (1 - k / steps), hh = s * 0.62 / steps;
      const g = new THREE.BoxGeometry(w * 2, hh, w * 2).toNonIndexed();
      paintGlow(g, (cx, cy, cz) => [cy > hh / 2 - 0.01 ? (P.top ?? 0xf6d7a0) : (k % 2 ? (P.color ?? 0xe0b070) : (P.color2 ?? 0xcf9a5a)), 0]);
      g.rotateY(Math.PI / 4); g.translate(P.x, P.y + hh * (k + 0.5), P.z); parts.push(g);
    }
    const cap = new THREE.ConeGeometry(s * 0.2, s * 0.25, 4).toNonIndexed(); paintGlow(cap, () => [0xffd860, 0.6]);
    cap.translate(P.x, P.y + s * 0.62 + s * 0.1, P.z); parts.push(cap);
  }
  return new THREE.Mesh(mergeGeometries(parts), depthShade(glowStdMaterial(), { y0, h: height[1] * 0.9, ao: 0.55, rim: rimColor, rimAmt: 0.5, tint: baseTint, tintAmt: 0.25 }));
}

/** Volcano range with glowing craters and lava rivers. */
export function volcanoes({ z = -170, count = 6, seed = 3, width = 520, height = [40, 80], radius = [28, 46], rock = 0x3a2a30, rock2 = 0x55383a, lava = 0xff6a1a, y0 = -14, x = 0 } = {}) {
  const rng = makeRng(seed), parts = [];
  for (let i = 0; i < count; i++) {
    const h = height[0] + rng() * (height[1] - height[0]), r = radius[0] + rng() * (radius[1] - radius[0]), rt = r * 0.14;
    const g = new THREE.CylinderGeometry(rt, r, h, 11, 6, true).toNonIndexed();
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k), t = (yy + h / 2) / h;
      if (t < 0.99) { const j = (1 - t) * 0.25 + 0.05; const a = Math.atan2(p.getZ(k), p.getX(k)); const f = 1 + Math.sin(a * 5 + i * 2.3 + t * 4) * j; p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); }
    }
    g.computeVertexNormals();
    const streams = 2 + Math.floor(rng() * 2), ph = rng() * 6;
    paintGlow(g, (cx, cy, cz) => {
      const t = (cy + h / 2) / h, a = Math.atan2(cz, cx);
      const s = Math.abs(Math.sin(a * streams * 0.5 + ph + t * 1.2));
      if (s < 0.16 && t > 0.2 && cz > -r * 0.2) return [t > 0.7 ? 0xffb040 : lava, 1.2];
      return [(Math.floor(t * 7) % 2) ? rock : rock2, t > 0.92 ? 0.25 : 0];
    });
    const crater = new THREE.CircleGeometry(rt * 1.05, 11).toNonIndexed(); crater.rotateX(-Math.PI / 2); crater.translate(0, h / 2 - 0.4, 0);
    paintGlow(crater, () => [0xffc050, 1.6]);
    const vx = x - width / 2 + (i + 0.2 + rng() * 0.6) / count * width, vz = z - rng() * 60;
    for (const q of [g, crater]) { q.translate(vx, y0 + h / 2, vz); parts.push(q); }
  }
  return new THREE.Mesh(mergeGeometries(parts), glowStdMaterial(1.8));
}

/** Night skyline layer: boxes with lit windows, rooftop neon blocks and antenna beacons (custom fogged shader). */
export function skyline({ z = -120, count = 34, width = 520, height = [14, 50], depth = [8, 18], bw = [7, 16], y0 = -14, x = 0, seed = 1,
  color = 0x2a2458, color2 = 0x3c2f78, lit = 0xffd890, neon = 0xff3fb0, neon2 = 0x3fe8ff, win = [1.6, 2.1], density = 0.45 } = {}) {
  const rng = makeRng(seed), parts = [];
  const push = (g, s) => { const n = g.attributes.position.count, a = new Float32Array(n).fill(s); g.setAttribute('aS', new THREE.BufferAttribute(a, 1)); parts.push(g); };
  let cx = x - width / 2;
  for (let i = 0; i < count && cx < x + width / 2; i++) {
    const w = bw[0] + rng() * (bw[1] - bw[0]), h = height[0] + rng() * (height[1] - height[0]), d = depth[0] + rng() * (depth[1] - depth[0]);
    const zz = z - rng() * 30, s = 0.05 + rng() * 0.9;
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(cx + w / 2, y0 + h / 2, zz); push(g, s);
    if (rng() < 0.45) { const cw = w * (0.4 + rng() * 0.3), ch = h * (0.15 + rng() * 0.2); const c = new THREE.BoxGeometry(cw, ch, d * 0.7).toNonIndexed(); c.translate(cx + w / 2, y0 + h + ch / 2, zz); push(c, s); }
    if (rng() < 0.4) { const sg = new THREE.BoxGeometry(w * 0.6, 1.6 + rng() * 1.5, 0.4).toNonIndexed(); sg.translate(cx + w / 2, y0 + h * (0.55 + rng() * 0.3), zz + d / 2 + 0.3); push(sg, rng() < 0.5 ? -1 : -2); }
    if (rng() < 0.35) { const a = new THREE.CylinderGeometry(0.15, 0.25, 6 + rng() * 6, 5).toNonIndexed(); a.translate(cx + w / 2, y0 + h + 4, zz); push(a, s);
      const b = new THREE.SphereGeometry(0.6, 6, 4).toNonIndexed(); b.translate(cx + w / 2, y0 + h + 7.5, zz); push(b, -3); }
    cx += w + rng() * 4;
  }
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC1: { value: new THREE.Color(color) }, uC2: { value: new THREE.Color(color2) }, uLit: { value: new THREE.Color(lit) },
      uN1: { value: new THREE.Color(neon) }, uN2: { value: new THREE.Color(neon2) }, uWin: { value: new THREE.Vector2(win[0], win[1]) }, uDen: { value: density }, uY0: { value: y0 }, uTime: { value: 0 } }]),
    vertexShader: `attribute float aS; varying float vS; varying vec3 vW; varying vec3 vN;
      #include <fog_pars_vertex>
      void main(){ vS = aS; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uC1, uC2, uLit, uN1, uN2; uniform vec2 uWin; uniform float uDen, uY0, uTime; varying float vS; varying vec3 vW; varying vec3 vN;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 c;
        if (vS < -2.5) c = vec3(1.0, 0.25, 0.3) * (0.6 + 0.6 * step(0.5, fract(uTime * 0.7 + vW.x * 0.01)));
        else if (vS < -1.5) c = uN2 * 1.25;
        else if (vS < -0.5) c = uN1 * 1.25;
        else {
          vec3 base = mix(uC1, uC2, vS) * (0.75 + 0.35 * smoothstep(uY0, uY0 + 60.0, vW.y));
          if (vN.y > 0.5) c = base * 0.8;
          else {
            vec2 p = abs(vN.z) > 0.5 ? vW.xy : vec2(vW.z, vW.y);
            float sh = abs(vN.z) > 0.5 ? 1.0 : 0.7;
            vec2 q = p / uWin; vec2 id = floor(q), f = fract(q);
            float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.78);
            float r = h(id + vS * 31.7);
            float lit = step(1.0 - uDen, r) * step(0.3, h(vec2(floor(id.x / 4.0), floor(id.y / 3.0)) + vS * 7.0));
            vec3 lc = r > 0.985 ? uN1 : (r > 0.97 ? uN2 : uLit * (0.7 + 0.3 * r));
            c = mix(base * sh, lc, win * lit);
            c = mix(c, base * sh * 0.7, win * (1.0 - lit) * 0.6);
          }
        }
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
  return { mesh, update(dt, t) { mat.uniforms.uTime.value = t; } };
}

/** Glowing lava sea with drifting dark crust plates. */
export function lavaSea({ y = -9, hot = 0xffc23a, mid = 0xff4a12, crust = 0x2a0e0a } = {}) {
  const g = new THREE.PlaneGeometry(3000, 1600, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uHot: { value: new THREE.Color(hot) }, uMid: { value: new THREE.Color(mid) }, uCrust: { value: new THREE.Color(crust) } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uHot, uMid, uCrust; varying vec3 vW;
      #include <fog_pars_fragment>
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = vW.xz;
        vec2 fl = vec2(uTime * 0.25, uTime * 0.06);
        float n1 = vn(p * 0.09 + fl), n2 = vn(p * 0.23 - fl * 1.3 + n1 * 1.5), n3 = vn(p * 0.6 + fl * 2.0);
        float heat = n1 * 0.55 + n2 * 0.35 + n3 * 0.1;
        vec3 c = mix(uMid, uHot, smoothstep(0.45, 0.8, heat));
        float cr = smoothstep(0.42, 0.36, heat + (n3 - 0.5) * 0.08);
        c = mix(c, uCrust * (0.8 + 0.4 * n3), cr * 0.9);
        c += uHot * smoothstep(0.02, 0.0, abs(heat - 0.4)) * 0.6;       // bright rim around crust plates
        c *= mix(1.0, 0.65, smoothstep(-20.0, -200.0, vW.z));
        gl_FragColor = vec4(c * 1.15, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.y = y;
  return { mesh: m, update(dt, t) { mat.uniforms.uTime.value = t; } };
}

/** Night street grid far below the rooftops: dark asphalt, street lamps and moving car-light streaks. */
export function cityFloor({ y = -11, base = 0x14102a, lamp = 0xffc870, car = 0xff4060, car2 = 0xfff0d0, neon = 0x3fe8ff } = {}) {
  const g = new THREE.PlaneGeometry(3000, 1600, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uBase: { value: new THREE.Color(base) }, uLamp: { value: new THREE.Color(lamp) }, uCar: { value: new THREE.Color(car) }, uCar2: { value: new THREE.Color(car2) }, uNeon: { value: new THREE.Color(neon) } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uBase, uLamp, uCar, uCar2, uNeon; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 p = vW.xz; vec3 c = uBase;
        vec2 blk = p / vec2(26.0, 18.0); vec2 f = fract(blk), id = floor(blk);
        float road = max(smoothstep(0.1, 0.06, abs(f.y - 0.5) - 0.38), smoothstep(0.08, 0.04, abs(f.x - 0.5) - 0.42));
        c = mix(c * 1.6, c * 0.7, road);
        float lane = abs(fract(blk.y) - 0.5) - 0.44;
        float lx = fract(p.x * 0.18 + uTime * 0.35 * (h(vec2(id.y, 1.0)) > 0.5 ? 1.0 : -1.0) + h(vec2(id.y, 3.0)));
        float cars = smoothstep(0.012, 0.0, abs(lane + 0.015)) * smoothstep(0.75, 0.95, lx);
        float cars2 = smoothstep(0.012, 0.0, abs(lane - 0.03)) * smoothstep(0.8, 0.96, fract(p.x * 0.15 - uTime * 0.3 + h(id)));
        c += uCar * cars * 2.0 + uCar2 * cars2 * 1.6;
        vec2 lq = fract(p / vec2(6.5, 9.0)) - 0.5; float lamp = smoothstep(0.12, 0.0, length(lq)) * step(0.3, h(floor(p / vec2(6.5, 9.0))));
        c += uLamp * lamp * 1.4;
        float sign = step(0.93, h(id + 7.0)) * smoothstep(0.08, 0.0, abs(f.x - 0.3)) * step(f.y, 0.4);
        c += uNeon * sign;
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.y = y;
  return { mesh: m, update(dt, t) { mat.uniforms.uTime.value = t; } };
}

/** Rippled sand sea (the desert's "void"): wind-blown ripples and slow drifting sand sheen. */
export function duneSea({ y = -9.4, light = 0xf6d08a, dark = 0xc98a4c } = {}) {
  const g = new THREE.PlaneGeometry(3000, 1600, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uL: { value: new THREE.Color(light) }, uD: { value: new THREE.Color(dark) } }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uL, uD; varying vec3 vW;
      #include <fog_pars_fragment>
      float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = vW.xz;
        float dune = vn(p * vec2(0.03, 0.05)) * 0.7 + vn(p * 0.09) * 0.3;
        float slope = sin(p.x * 0.08 + dune * 9.0);
        float rip = sin(p.x * 1.6 + p.y * 0.4 + vn(p * 0.25) * 5.0);
        vec3 c = mix(uD, uL, 0.35 + 0.65 * smoothstep(-0.9, 0.9, slope));
        c *= 0.95 + 0.05 * rip;
        float drift = vn(p * 0.4 + vec2(uTime * 0.8, 0.0));
        c += uL * 0.08 * smoothstep(0.65, 0.9, drift);
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.position.y = y;
  return { mesh: m, update(dt, t) { mat.uniforms.uTime.value = t; } };
}
