// Terrain surface shader (owner: Maps & terrain-art specialist).
// Consumes the mesher attributes from core/terrainMesh.js:
//   aInfo.x kind: 0 = front cap, 1 = wall (side/top/underside by normal), 2 = grass/snow drape
//   aInfo.y depth below the surface (cap) or drape v (0 top -> 1 tip)       aInfo.z material id (core/terrain.js MAT)
// Geometry is in world space, so position.xy are world coordinates (stable texturing through craters).
// Colour AND a procedural height (tH) are computed per material; tH bump-maps the normal so stones/bricks catch light.
import * as THREE from 'three';

export const DEFAULT_PALETTE = {
  grass: 0x6fcf3a, grass2: 0xb6ec5a, dirt: 0x9a6a3c, rock: 0xc49a6c, rock2: 0xa37a55, deep: 0x5e3f2e,
  brick: 0xd8c3a0, brick2: 0xb59c78, mortar: 0x8c7a62, wood: 0x9a6438, wood2: 0x6e4425, ice: 0xbfefff, sand: 0xf0d590, metal: 0x8a96a8,
  snow: 0, // 1 = drape & tops render as snow
  bump: 1, // bump strength multiplier
};

export function createTerrainMaterial(palette = {}) {
  const P = { ...DEFAULT_PALETTE, ...palette };
  const u = {};
  for (const k of ['grass', 'grass2', 'dirt', 'rock', 'rock2', 'deep', 'brick', 'brick2', 'mortar', 'wood', 'wood2', 'ice', 'sand', 'metal']) u['u_' + k] = { value: new THREE.Color(P[k]) };
  u.uSnow = { value: P.snow ? 1 : 0 }; u.uBump = { value: P.bump };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aInfo; varying vec3 vInfo; flat varying float vMat; varying vec3 vW; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInfo = aInfo; vMat = aInfo.z; vW = position; vWN = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vInfo; flat varying float vMat; varying vec3 vW; varying vec3 vWN;
        uniform vec3 u_grass, u_grass2, u_dirt, u_rock, u_rock2, u_deep, u_brick, u_brick2, u_mortar, u_wood, u_wood2, u_ice, u_sand, u_metal; uniform float uSnow, uBump;
        float tH;   // procedural height for bump mapping (set in color pass, used in normal pass)
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.03+7.1)*.3 + vn(p*4.11+3.7)*.2; }
        vec3 cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; float id = 0.;
          for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(x,y); vec2 o = vec2(h12(i+g), h12(i+g+17.3))*0.8+0.1; float d = length(g+o-f);
            if (d < d1){ d2 = d1; d1 = d; id = h12(i+g+3.1);} else if (d < d2) d2 = d; }
          return vec3(d1, d2 - d1, id); }
        vec3 rockCol(vec2 p, float depth){
          float warp = (vn(vec2(p.x * 0.09, 3.0)) - 0.5) * 3.0 + p.x * 0.05;
          float sy = (p.y + warp) / 1.15; float band = floor(sy); float bf = fract(sy);
          vec3 c = cells(vec2(p.x * 0.85 + band * 3.7, p.y * 1.5));
          vec3 col = mix(u_rock, u_rock2, c.z * 0.8 + 0.2 * h12(vec2(band, 1.0)));
          col *= mix(0.92, 1.08, h12(vec2(band, 7.0)));
          col *= 0.9 + 0.16 * vn(p * 2.7);
          float edge = smoothstep(0.015, 0.1, c.y);
          float ledge = smoothstep(0.0, 0.12, bf) * (1.0 - smoothstep(0.86, 1.0, bf));
          col *= mix(0.5, 1.0, edge);
          col = mix(col * 0.72, col, ledge);
          col = mix(col, col * 1.18, smoothstep(0.82, 0.97, bf));               // lit lip at the top of each layer
          tH = edge * 0.55 + (1.0 - c.x) * 0.35 + ledge * 0.35;
          col = mix(col, u_deep, smoothstep(0.8, 3.0, depth) * 0.7);
          return col; }
        vec3 brickCol(vec2 p, float depth){
          float row = floor(p.y / 0.42); vec2 q = vec2(p.x / 0.86 + row * 0.5, p.y / 0.42); vec2 id = floor(q), f = fract(q);
          float e = min(min(f.x, 1.0 - f.x) * 0.86 / 0.42, min(f.y, 1.0 - f.y));
          vec3 col = mix(u_brick, u_brick2, h12(id)); col *= 0.9 + 0.15 * vn(p * 4.0);
          float m = smoothstep(0.035, 0.075, e);
          col = mix(u_mortar, col, m);
          tH = m * (0.7 + 0.3 * smoothstep(0.0, 0.35, e)) - vn(p * 6.0) * 0.12 * m;
          return mix(col, col * 0.62, smoothstep(0.8, 3.0, depth) * 0.6); }
        vec3 woodCol(vec2 p){
          float plank = floor(p.y / 0.32); float f = fract(p.y / 0.32);
          vec3 col = mix(u_wood, u_wood2, h12(vec2(plank, floor(p.x / 2.2 + plank * 0.37))));
          col *= 0.85 + 0.2 * vn(vec2(p.x * 1.2, p.y * 30.0));
          float gap = smoothstep(0.02, 0.1, min(f, 1.0 - f));
          col *= mix(0.45, 1.0, gap);
          float nail = smoothstep(0.05, 0.03, length(vec2(fract(p.x / 2.2) - 0.05, f - 0.5) * vec2(2.2, 0.32)));
          tH = gap * 0.6 + vn(vec2(p.x * 1.2, p.y * 30.0)) * 0.1;
          return mix(col, vec3(0.25), nail); }
        vec3 iceCol(vec2 p, float depth){ vec3 c = cells(p * 0.8); vec3 col = mix(u_ice, u_ice * vec3(0.72, 0.86, 1.0), c.z);
          float e = smoothstep(0.01, 0.07, c.y);
          col *= mix(0.78, 1.0, e); col += 0.14 * smoothstep(0.6, 0.0, abs(fract((p.x + p.y) * 0.5) - 0.5) * 4.0);
          tH = e * 0.5 + (1.0 - c.x) * 0.3;
          return mix(col, col * vec3(0.55, 0.7, 0.9), smoothstep(0.5, 3.0, depth)); }
        vec3 topCol(vec2 p){
          if (uSnow > 0.5) { vec3 s = vec3(0.96, 0.98, 1.0); s *= 0.92 + 0.08 * vn(p * 2.0); tH = vn(p * 3.0) * 0.3; return s; }
          vec3 g = mix(u_grass, u_grass2, fbm(p * 0.5)); float bl = vn(p * vec2(9.0, 2.0)); g *= 0.88 + 0.18 * bl;
          tH = bl * 0.3;
          float fl = step(0.975, h12(floor(p * 2.5)));
          return mix(g, mix(vec3(1.0, 0.95, 0.55), vec3(1.0, 0.6, 0.75), h12(floor(p * 2.5) + 3.0)), fl * 0.8); }
        vec3 matCol(float m, vec2 p, float depth){
          if (m < 0.5) return rockCol(p, depth);
          if (m < 1.5) return brickCol(p, depth);
          if (m < 2.5) return woodCol(p);
          if (m < 3.5) return iceCol(p, depth);
          if (m < 4.5) { tH = vn(p * 3.0) * 0.2; return u_metal * (0.8 + 0.3 * vn(p * 3.0)); }
          tH = fbm(p * 2.0) * 0.3;
          return u_sand * (0.88 + 0.16 * fbm(p * 2.0)) * mix(1.0, 0.7, smoothstep(0.8, 3.0, depth)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float tRough = 0.9;
        {
          vec2 p = vW.xy; float kind = vInfo.x, depth = vInfo.y, m = floor(vMat + 0.5);
          vec3 N = normalize(vWN); vec3 col; tH = 0.0;
          if (kind > 1.5) {                       // drape
            float v = depth;
            if (uSnow > 0.5) { col = mix(vec3(1.0), vec3(0.8, 0.9, 1.0), v * 0.8); col *= 0.94 + 0.06 * vn(vec2(p.x * 6.0, v * 3.0)); tH = vn(vec2(p.x * 5.0, v * 2.0)) * 0.4; }
            else { float bl = vn(vec2(p.x * 16.0, 1.0)); col = mix(u_grass2, u_grass * 0.7, v); col *= 0.82 + 0.25 * bl; tH = bl * 0.8; }
          } else if (kind > 0.5) {                // walls
            float up = smoothstep(0.38, 0.62, N.y);
            vec3 side = matCol(m, vec2(p.x + vW.z * 0.7, p.y + vW.z * 0.3), 0.6);
            float hs = tH;
            side *= mix(1.0, 0.55, smoothstep(-0.2, -0.8, N.y));
            vec3 top = (m < 0.5 || m > 4.5 || (m > 2.5 && m < 3.5)) ? topCol(vec2(p.x, vW.z)) : matCol(m, vec2(p.x, vW.z), 0.0) * 1.08;
            tH = mix(hs, tH, up);
            col = mix(side, top, up);
          } else {                                // front cap
            col = matCol(m, p, depth);
            if (m < 0.5 || m > 4.5) {
              float soil = 1.0 - smoothstep(0.25, 0.65 + 0.25 * vn(vec2(p.x * 1.3, 0.0)), depth);
              col = mix(col, u_dirt * (0.85 + 0.2 * vn(p * 4.0)), soil);
              tH = mix(tH, vn(p * 5.0) * 0.3, soil);
              col *= mix(1.0, 0.7, smoothstep(0.55, 0.15, depth) * smoothstep(0.0, 0.18, depth)); // contact shade under the drape
              // moss / snow drips running down from the top edge
              float dl = 0.45 + vn(vec2(p.x * 2.3, 1.7)) * 1.5;
              float moss = (1.0 - smoothstep(dl - 0.22, dl, depth)) * smoothstep(0.42, 0.58, vn(vec2(p.x * 0.9, 5.0)));
              vec3 mc = uSnow > 0.5 ? vec3(0.93, 0.97, 1.0) * (0.9 + 0.1 * vn(p * 5.0)) : mix(u_grass, u_grass2, 0.3) * 0.72 * (0.85 + 0.3 * vn(p * 7.0));
              col = mix(col, mc, moss * 0.9); tH = mix(tH, 0.6 + vn(p * 8.0) * 0.3, moss);
            }
          }
          if (m > 2.5 && m < 3.5) tRough = 0.35;
          diffuseColor.rgb = col;
        }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 dH = vec2(dFdx(tH), dFdy(tH)) * 0.09 * uBump;
          vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition);
          vec3 R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
          vec3 g = sign(det) * (dH.x * R1 + dH.y * R2);
          normal = normalize(abs(det) * normal - g);
        }`);
  };
  mat.customProgramCacheKey = () => 'archer-terrain-v2';
  mat.userData.uniforms = u;
  return mat;
}
