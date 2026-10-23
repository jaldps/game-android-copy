// Biome backdrop pieces, second generation (owner: Maps specialist):
//   volcanoRange  — concave, ridged volcanoes with strata, glowing crack network, animated lava flows down the gullies,
//                   glowing craters and a base heat-shimmer wobble (1 draw call per range)
//   smokePlumes   — rising, expanding ash columns from the biggest craters, lit orange from below (1 instanced draw)
//   heatHaze      — additive rising-heat glow band over the lava horizon (1 draw)
//   cityLayer     — layered night skyline: setback towers, spires, slanted crowns, rooftop billboards and wall signs,
//                   facades + signs from ONE canvas atlas (no per-window quads), two-tone rim light, roof trims,
//                   haze toward the horizon (1 draw call per layer)
// Every builder returns { mesh, update(dt, t, wind?) }.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from '../core/util.js';

const NOISE_GLSL = `
  float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.03+7.1)*.3 + vn(p*4.11+3.7)*.2; }`;

// ---------------------------------------------------------------------------------------------------------------
/** Volcano range. Concave profile, radial ridges + gullies, lava flows painted down the gullies (aGlow), cracks
 *  and strata in the shader, a crater bowl with a molten pool. Returns { mesh, update, peaks: [{x,y,z,r}] }. */
export function volcanoRange({ z = -170, count = 6, seed = 3, width = 520, height = [40, 80], radius = [28, 46], rock = 0x3a2630, rock2 = 0x5a3a40,
  ash = 0x6a5a62, lava = 0xff5a14, hot = 0xffc040, y0 = -14, x = 0 } = {}) {
  const rng = makeRng(seed), parts = [], peaks = [];
  const cR = new THREE.Color(rock), cR2 = new THREE.Color(rock2), cA = new THREE.Color(ash), tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const h = height[0] + rng() * (height[1] - height[0]), r = radius[0] + rng() * (radius[1] - radius[0]), rt = r * (0.12 + rng() * 0.05);
    const RS = 44, HS = 18, g = new THREE.CylinderGeometry(1, 1, 1, RS, HS, true);
    const p = g.attributes.position, n = p.count, glow = new Float32Array(n), col = new Float32Array(n * 3);
    const ph = rng() * 6, ridges = 7 + Math.floor(rng() * 4), streams = [rng() * 6.28, rng() * 6.28, rng() * 6.28].slice(0, 2 + Math.floor(rng() * 2));
    const notch = rng() * 6.28;
    for (let k = 0; k < n; k++) {
      const t = p.getY(k) + 0.5, a = Math.atan2(p.getZ(k), p.getX(k));
      // concave volcano profile: steep near the top, flaring skirt at the base
      let rad = rt + (r - rt) * Math.pow(1 - t, 1.9);
      const ridge = Math.sin(a * ridges + ph + Math.sin(t * 5 + a * 2) * 0.6);
      rad *= 1 + 0.07 * ridge * (1 - t * 0.6) + 0.05 * Math.sin(a * 3 + ph * 2) * (1 - t);
      let yy = t * h;
      if (t > 0.97) yy -= h * 0.05 * Math.max(0, Math.cos(a - notch)) ** 4;          // broken crater rim
      p.setXYZ(k, Math.cos(a) * rad, yy, Math.sin(a) * rad);
      // lava flows down gullies (ridge troughs) from the crater, fading toward the base
      let fl = 0;
      for (const s of streams) { const d = Math.abs(Math.atan2(Math.sin(a - s - t * 0.4), Math.cos(a - s - t * 0.4))); fl = Math.max(fl, 1 - d / (0.07 + 0.05 * (1 - t))); }
      fl = Math.max(0, fl) * (t > 0.15 ? 1 : t / 0.15) * (Math.sin(a) > -0.2 ? 1 : 0.0);  // only on the faces we can see
      glow[k] = Math.max(fl > 0 ? Math.min(1, fl * 1.6) : 0, t > 0.92 ? (t - 0.92) / 0.08 * 0.95 : 0);   // + molten crater lip
      tmp.copy(cR).lerp(cR2, 0.5 + 0.5 * ridge).lerp(cA, Math.max(0, t - 0.55) * 0.9);
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    }
    g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    // crater bowl + molten pool
    const bowl = new THREE.CylinderGeometry(rt * 0.95, rt * 0.35, h * 0.06, 24, 1, true); bowl.translate(0, h * 0.97, 0);
    const bp = bowl.attributes.position, bg = new Float32Array(bp.count).fill(0.25), bc = new Float32Array(bp.count * 3);
    for (let k = 0; k < bp.count; k++) { bc[k * 3] = 0.12; bc[k * 3 + 1] = 0.05; bc[k * 3 + 2] = 0.05; }
    bowl.setAttribute('aGlow', new THREE.BufferAttribute(bg, 1)); bowl.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    const pool = new THREE.CircleGeometry(rt * 0.42, 20); pool.rotateX(-Math.PI / 2); pool.translate(0, h * 0.945, 0);
    const pp = pool.attributes.position; pool.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(pp.count).fill(2.0), 1));
    const pc = new Float32Array(pp.count * 3); for (let k = 0; k < pp.count; k++) { pc[k * 3] = 1; pc[k * 3 + 1] = 0.6; pc[k * 3 + 2] = 0.2; } pool.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const vx = x - width / 2 + (i + 0.2 + rng() * 0.6) / count * width, vz = z - rng() * 60;
    for (const q of [g, bowl, pool]) { q.deleteAttribute('uv'); q.translate(vx, y0, vz); parts.push(q); }
    peaks.push({ x: vx, y: y0 + h * 0.96, z: vz, r: rt, h });
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const u = { uTime: { value: 0 }, uLava: { value: new THREE.Color(lava) }, uHot: { value: new THREE.Color(hot) }, uY0: { value: y0 } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow; varying vec3 vWP; uniform float uTime, uY0;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGlow = aGlow;
        float hb = clamp((transformed.y - uY0) / 18.0, 0.0, 1.0);          // heat shimmer: wobble near the hot base
        transformed.x += sin(transformed.y * 0.35 + uTime * 3.1 + transformed.z * 0.05) * 0.5 * (1.0 - hb);
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
        varying float vGlow; varying vec3 vWP; uniform float uTime, uY0; uniform vec3 uLava, uHot; ${NOISE_GLSL}
        vec3 vEmit;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 q = vec2(vWP.x + vWP.z * 0.7, vWP.y);
          float strata = 0.86 + 0.14 * sin(vWP.y * 0.55 + fbm(q * 0.04) * 6.0);
          float grain = 0.82 + 0.3 * fbm(q * 0.35);
          diffuseColor.rgb *= strata * grain;
          // crack network (ridged noise), glowing more toward the base and near flows
          float n = fbm(q * vec2(0.16, 0.09) + 3.0);
          float hk = 1.0 - clamp((vWP.y - uY0) / 90.0, 0.0, 1.0);
          float crack = (1.0 - smoothstep(0.0, 0.012 + 0.01 * hk, abs(n - 0.5))) * smoothstep(0.35, 0.6, fbm(q * 0.03 + 9.0));
          float pulse = 0.75 + 0.25 * sin(uTime * 1.7 + n * 20.0);
          vEmit = mix(uLava, uHot, 0.3) * crack * (0.2 + 0.8 * hk) * pulse;
          diffuseColor.rgb = mix(diffuseColor.rgb, uLava * 0.6, crack * 0.4);
          // lava flows: bright core, flowing streaks moving downhill
          float flow = smoothstep(0.05, 0.6, vGlow);
          float streak = 0.6 + 0.4 * sin(vWP.y * 0.9 + uTime * 4.0 + fbm(q * 0.3) * 4.0);
          vec3 lc = mix(uLava, uHot, smoothstep(0.6, 1.0, vGlow) * streak);
          diffuseColor.rgb = mix(diffuseColor.rgb, lc, flow);
          vEmit += lc * flow * (1.3 + 0.5 * streak) + uHot * smoothstep(1.2, 2.0, vGlow) * 1.6;
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit;');
  };
  mat.customProgramCacheKey = () => 'archer-volcano-v1';
  const mesh = new THREE.Mesh(mergeGeometries(parts.map((q) => (q.index ? q.toNonIndexed() : q))), mat);
  return { mesh, peaks, update(dt, t) { u.uTime.value = t; } };
}

// ---------------------------------------------------------------------------------------------------------------
/** Rising ash plumes from crater positions. One InstancedMesh; puffs rise, swell and darken, lit orange from below. */
export function smokePlumes(peaks, { per = 12, rise = 90, color = 0x4a3a42, glow = 0xff7a3a, speed = 0.06 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position, c = new Float32Array(pos.count * 3), lo = new THREE.Color(glow), hi = new THREE.Color(0xffffff), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); t.copy(lo).lerp(hi, THREE.MathUtils.smoothstep(y, -0.7, 0.4)); c.set([t.r, t.g, t.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false, emissive: 0x2a0c04, emissiveIntensity: 1 });
  const N = peaks.length * per, mesh = new THREE.InstancedMesh(g, mat, N); mesh.frustumCulled = false;
  const P = [], base = new THREE.Color(color), dark = new THREE.Color(color).multiplyScalar(0.55), cc = new THREE.Color();
  for (let i = 0; i < N; i++) P.push({ k: Math.floor(i / per), ph: (i % per) / per + Math.random() * 0.05, jx: (Math.random() - 0.5) * 2, jz: (Math.random() - 0.5) * 2 });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  let drift = 0;
  const write = () => {
    for (let i = 0; i < N; i++) {
      const d = P[i], pk = peaks[d.k], f = d.ph, sc = pk.r * (0.7 + f * 3.2);
      v.set(pk.x + d.jx * pk.r * 0.4 + f * f * (28 + drift * 30), pk.y + f * rise * (pk.h / 100 + 0.5), pk.z + d.jz * pk.r * 0.4);
      s.set(sc, sc * 0.85, sc); m4.compose(v, q, s); mesh.setMatrixAt(i, m4);
      cc.copy(base).lerp(dark, f); mesh.setColorAt(i, cc);
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  write();
  return { mesh, update(dt, time, wind = 0) { drift += ((wind || 0) - drift) * Math.min(1, dt * 0.5); for (let i = 0; i < N; i++) { const d = P[i]; d.ph += dt * speed; if (d.ph > 1) d.ph -= 1; } write(); } };
}

// ---------------------------------------------------------------------------------------------------------------
/** Additive rising-heat glow band over the lava horizon (fake heat shimmer: wavy, upward-scrolling streaks). */
export function heatHaze({ y = -9.3, z = -105, width = 1400, height = 46, color = 0xff6a2a } = {}) {
  const g = new THREE.PlaneGeometry(width, height, 1, 1); g.translate(0, y + height / 2, z);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: { value: 0 }, uC: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; uniform vec3 uC; varying vec2 vUv; varying vec3 vW; ${NOISE_GLSL}
      void main(){
        float v = vUv.y;
        float wav = vn(vec2(vW.x * 0.035 + sin(v * 9.0 + uTime) * 0.3, v * 3.0 - uTime * 0.45));
        float streak = smoothstep(0.45, 0.85, vn(vec2(vW.x * 0.12 + wav * 2.0, v * 6.0 - uTime * 0.9)));
        float a = pow(1.0 - v, 2.2) * (0.16 + 0.22 * wav) + streak * pow(1.0 - v, 3.0) * 0.12;
        gl_FragColor = vec4(uC * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 2;
  return { mesh, update(dt, t) { mat.uniforms.uTime.value = t; } };
}

// ---------------------------------------------------------------------------------------------------------------
// City atlas: 4x4 tiles of 256 px. Tiles 0..11 facade patterns (window grids of different rhythms and light
// temperatures, office strips, residential, glass curtain wall), tiles 12..15 neon signs (fake glyph rows).
let _atlas = null;
function cityAtlas() {
  if (_atlas) return _atlas;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4;
  const x = cv.getContext('2d'), rng = makeRng(91);
  const warm = ['#ffd27a', '#ffe0a0', '#ffc860', '#fff0c8'], cool = ['#bfe8ff', '#9fd8ff', '#e6f6ff'], neon = ['#ff4fb8', '#3fe8ff', '#ffe040', '#7dff6a', '#b06aff'];
  for (let tIdx = 0; tIdx < 16; tIdx++) {
    const ox = (tIdx % 4) * S, oy = Math.floor(tIdx / 4) * S;
    x.save(); x.beginPath(); x.rect(ox, oy, S, S); x.clip();
    if (tIdx < 12) {
      const kind = tIdx % 4, lit = [0.32, 0.45, 0.25, 0.55][Math.floor(tIdx / 4) % 3] + (kind === 3 ? 0.1 : 0), pal = tIdx % 3 === 1 ? cool : warm;
      // facade base: mid grey (tinted per layer in the shader), floor slabs, pilasters
      x.fillStyle = '#5a5a66'; x.fillRect(ox, oy, S, S);
      const cols = [8, 6, 4, 10][kind], rows = [8, 10, 6, 12][kind], cw = S / cols, rh = S / rows;
      for (let r = 0; r < rows; r++) { x.fillStyle = r % 2 ? '#646472' : '#565662'; x.fillRect(ox, oy + r * rh, S, rh * 0.18); }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const wx = ox + c * cw + cw * (kind === 2 ? 0.08 : 0.2), wy = oy + r * rh + rh * 0.3, ww = cw * (kind === 2 ? 0.84 : 0.6), wh = rh * (kind === 1 ? 0.6 : 0.5);
        const on = rng() < lit * (rng() < 0.15 ? 2 : 1);
        if (on) {
          const col = rng() < 0.06 ? neon[Math.floor(rng() * neon.length)] : pal[Math.floor(rng() * pal.length)];
          const gr = x.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, col); gr.addColorStop(1, '#ffffff');
          x.fillStyle = gr; x.fillRect(wx, wy, ww, wh);
          if (rng() < 0.4) { x.fillStyle = 'rgba(40,30,50,0.55)'; x.fillRect(wx + ww * (0.2 + rng() * 0.5), wy, ww * 0.1, wh); }   // blind / frame
        } else {
          const gr = x.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#141a34'); gr.addColorStop(1, '#232b52');
          x.fillStyle = gr; x.fillRect(wx, wy, ww, wh);
        }
      }
      if (kind === 3) { x.fillStyle = 'rgba(20,24,50,0.5)'; for (let c = 0; c <= cols; c++) x.fillRect(ox + c * cw - 1, oy, 2, S); }
    } else {
      // neon sign: dark panel, frame, 2 rows of glowing pseudo-glyphs
      const nc = neon[(tIdx - 12) % neon.length], nc2 = neon[(tIdx - 9) % neon.length];
      x.fillStyle = '#0a0614'; x.fillRect(ox, oy, S, S);
      x.strokeStyle = nc2; x.lineWidth = 8; x.shadowColor = nc2; x.shadowBlur = 18; x.strokeRect(ox + 10, oy + 10, S - 20, S - 20);
      x.shadowColor = nc; x.shadowBlur = 22; x.fillStyle = nc;
      for (let row = 0; row < 2; row++) {
        let gx = ox + 30; const gy = oy + 40 + row * 100;
        while (gx < ox + S - 50) {
          const gw = 26 + rng() * 18;
          for (let b = 0; b < 3; b++) { const vert = rng() < 0.5; x.fillRect(gx + (vert ? rng() * gw * 0.7 : 0), gy + (vert ? 0 : rng() * 60), vert ? 8 : gw, vert ? 70 : 8); }
          gx += gw + 14;
        }
      }
      x.shadowBlur = 0;
    }
    x.restore();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  _atlas = tex; return tex;
}

/** One layer of night skyline. tint = facade colour, haze = colour + amount it fades toward, scale = world size of a
 *  facade tile. mode attribute: 0 facade (world-mapped atlas tile), 1 sign (uv-mapped atlas tile), 2 beacon. */
export function cityLayer({ z = -120, count = 34, width = 520, height = [14, 50], depth = [8, 18], bw = [7, 16], y0 = -14, x = 0, seed = 1,
  tint = 0x3a3470, haze = 0x6a2a8a, hazeAmt = 0.25, rimA = 0xff4fb8, rimB = 0x3fe8ff, tile = 22, signs = 0.45, lit = 1.0 } = {}) {
  const rng = makeRng(seed), parts = [];
  const push = (g, mode, tileIdx, cx, hw, top) => {
    g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count;
    const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) a.set([mode, tileIdx, cx, hw], i * 4);
    const b = new Float32Array(n * 2); for (let i = 0; i < n; i++) b.set([top, rng()], i * 2);
    g.setAttribute('aInfo', new THREE.BufferAttribute(a, 4)); g.setAttribute('aTop', new THREE.BufferAttribute(b, 2)); parts.push(g);
  };
  let cx = x - width / 2;
  for (let i = 0; i < count && cx < x + width / 2; i++) {
    const w = bw[0] + rng() * (bw[1] - bw[0]), h = height[0] + rng() * (height[1] - height[0]), d = depth[0] + rng() * (depth[1] - depth[0]);
    const zz = z - rng() * 30, bx = cx + w / 2, ti = Math.floor(rng() * 12);
    let top = y0 + h;
    const b = new THREE.BoxGeometry(w, h, d); b.translate(bx, y0 + h / 2, zz); push(b, 0, ti, bx, w / 2, top);
    const r = rng();
    if (r < 0.35) {                                                         // setback tower on top
      const w2 = w * (0.55 + rng() * 0.2), h2 = h * (0.2 + rng() * 0.3), b2 = new THREE.BoxGeometry(w2, h2, d * 0.75);
      b2.translate(bx, top + h2 / 2, zz); push(b2, 0, (ti + 1) % 12, bx, w2 / 2, top + h2); top += h2;
      if (rng() < 0.6) { const sp = new THREE.ConeGeometry(w2 * 0.18, h * 0.25, 4); sp.translate(bx, top + h * 0.125, zz); push(sp, 0, ti, bx, w2 * 0.18, top + h * 0.25);
        const bc = new THREE.SphereGeometry(Math.max(0.5, w * 0.04), 6, 4); bc.translate(bx, top + h * 0.25 + 0.6, zz); push(bc, 2, 0, bx, 1, top); }
    } else if (r < 0.55) {                                                  // slanted crown
      const cr = new THREE.CylinderGeometry(0.01, w * 0.62, h * 0.18, 4, 1); cr.rotateY(Math.PI / 4); cr.scale(1, 1, d / w); cr.translate(bx, top + h * 0.09, zz);
      push(cr, 0, ti, bx, w / 2, top + h * 0.18);
    } else if (r < 0.75) {                                                  // rooftop billboard on stilts
      const bw2 = w * (0.7 + rng() * 0.25), bh = Math.min(h * 0.3, bw2 * 0.45), pole = new THREE.BoxGeometry(w * 0.05, bh * 0.6, w * 0.05);
      for (const s of [-0.35, 0.35]) { const pg = pole.clone(); pg.translate(bx + s * bw2, top + bh * 0.3, zz + d * 0.2); push(pg, 0, ti, bx, w / 2, top); }
      const bb = new THREE.BoxGeometry(bw2, bh, 0.6); bb.translate(bx, top + bh * 0.6 + bh * 0.5, zz + d * 0.2); push(bb, 1, 12 + Math.floor(rng() * 4), bx, bw2 / 2, top + bh * 1.1);
    }
    if (rng() < signs) {                                                    // vertical wall sign on the front face
      const sw = Math.max(1.2, w * 0.14), sh = Math.min(h * 0.5, sw * 4.5), sg = new THREE.BoxGeometry(sw, sh, 0.5);
      const sx = bx + (rng() < 0.5 ? -1 : 1) * (w / 2 - sw * 0.9), sy = y0 + h * (0.35 + rng() * 0.35);
      sg.translate(sx, sy, zz + d / 2 + 0.6); push(sg, 1, 12 + Math.floor(rng() * 4), sx, sw / 2, sy + sh / 2);
    }
    cx += w + rng() * 3;
  }
  const geo = mergeGeometries(parts.map((g) => { g.deleteAttribute('normal'); return g; }).map((g) => { g.computeVertexNormals(); return g; }));
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTint: { value: new THREE.Color(tint) }, uHaze: { value: new THREE.Color(haze) }, uHazeAmt: { value: hazeAmt },
      uRimA: { value: new THREE.Color(rimA) }, uRimB: { value: new THREE.Color(rimB) }, uTile: { value: tile }, uY0: { value: y0 }, uLit: { value: lit }, uTime: { value: 0 } }]),
    vertexShader: `attribute vec4 aInfo; attribute vec2 aTop; varying vec4 vInfo; varying vec2 vTop; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){ vInfo = aInfo; vTop = aTop; vN = normal; vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D uAtlas; uniform vec3 uTint, uHaze, uRimA, uRimB; uniform float uHazeAmt, uTile, uY0, uLit, uTime;
      varying vec4 vInfo; varying vec2 vTop; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      #include <fog_pars_fragment>
      vec3 tileSample(vec2 uv, float idx, vec2 dx, vec2 dy){
        vec2 cell = vec2(mod(idx, 4.0), 3.0 - floor(idx / 4.0));
        return textureGrad(uAtlas, (cell + 0.02 + fract(uv) * 0.96) / 4.0, dx * 0.24, dy * 0.24).rgb; }
      void main(){
        float mode = vInfo.x, idx = vInfo.y, cx = vInfo.z, hw = vInfo.w, top = vTop.x;
        vec3 N = normalize(vN), c;
        if (mode > 1.5) { c = vec3(1.0, 0.2, 0.25) * (0.5 + 1.5 * step(0.5, fract(uTime * 0.6 + vTop.y))); }
        else if (mode > 0.5) {
          vec2 uv = abs(N.z) > 0.5 ? vUv : vec2(0.5);
          c = tileSample(uv, idx, dFdx(vUv), dFdy(vUv)) * 1.6 * (abs(N.z) > 0.5 ? 1.0 : 0.25);
          c *= 0.85 + 0.15 * sin(uTime * 3.0 + vTop.y * 40.0);
        } else {
          float side = abs(N.x) > 0.5 ? 1.0 : 0.0;
          if (N.y > 0.5) c = uTint * 0.35;                                   // roofs
          else {
            vec2 uv = vec2((side > 0.5 ? vW.z : vW.x) / uTile, (vW.y - uY0) / (uTile * 1.25));
            vec3 t = tileSample(uv, idx, dFdx(uv), dFdy(uv));
            float l = dot(t, vec3(0.333));
            float win = smoothstep(0.45, 0.62, l) * uLit;
            c = mix(t * uTint * 1.25, t * 1.35, win) * (side > 0.5 ? 0.62 : 1.0);
          }
          // two-tone rim light: magenta on right edges / side faces, cyan on left, strongest high up
          float hk = smoothstep(uY0, top, vW.y);
          float edge = 1.0 - smoothstep(0.0, max(1.0, hw * 0.12), hw - abs(vW.x - cx));
          vec3 rim = vW.x > cx ? uRimA : uRimB;
          c += rim * (edge * (1.0 - side) * 0.55 + side * 0.22) * (0.25 + hk * hk);
          // roofline trim
          c += mix(uRimA, uRimB, step(0.5, fract(cx * 0.013))) * smoothstep(0.9, 0.0, top - vW.y) * 0.9 * step(N.y, 0.5);
        }
        // haze: whole layer drifts toward the horizon colour, more at street level (glowing ground fog)
        float low = 1.0 - smoothstep(uY0, uY0 + 40.0, vW.y);
        c = mix(c, uHaze, clamp(uHazeAmt + low * 0.35, 0.0, 0.85));
        gl_FragColor = vec4(c, 1.0);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mat.uniforms.uAtlas = { value: cityAtlas() };
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, update(dt, t) { mat.uniforms.uTime.value = t; } };
}
