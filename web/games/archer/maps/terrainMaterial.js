// Terrain surface shader (owner: Maps & terrain-art specialist).
// Consumes the mesher attributes from core/terrainMesh.js:
//   aInfo.x kind: 0 = front cap, 1 = wall (side/top/underside by normal), 2 = grass/snow drape
//   aInfo.y depth below the surface (cap) or drape v (0 top -> 1 tip)       aInfo.z material id (core/terrain.js MAT)
// Geometry is in world space, so position.xy are world coordinates (stable texturing through craters).
// Colour AND a procedural height (tH) are computed per material; tH bump-maps the normal so stones/bricks catch light.
// A per-biome `style` (uniform, one program for every map) changes tops, drapes and adds emissive detail (tEmit):
//   0 grass · 1 snow · 2 desert sand · 3 lava basalt (glowing cracks/veins) · 4 neon city (lit windows, neon trims)
import * as THREE from 'three';

export const STYLE = { GRASS: 0, SNOW: 1, DESERT: 2, LAVA: 3, CITY: 4 };

export const DEFAULT_PALETTE = {
  grass: 0x6fcf3a, grass2: 0xb6ec5a, dirt: 0x9a6a3c, rock: 0xc49a6c, rock2: 0xa37a55, deep: 0x5e3f2e,
  brick: 0xd8c3a0, brick2: 0xb59c78, mortar: 0x8c7a62, wood: 0x9a6438, wood2: 0x6e4425, ice: 0xbfefff, sand: 0xf0d590, metal: 0x8a96a8,
  glow: 0xff6a1a, glow2: 0x40e0ff, // emissive accents (lava cracks, neon) — only used by styles 3/4
  brickSize: [0.86, 0.42],         // brick width/height in world units
  snow: 0,  // legacy: 1 = style SNOW
  style: 0, // STYLE id
  bump: 1,  // bump strength multiplier
};

/** Shared animation clock for every terrain material (a map's backdrop.update sets terrainClock.value = t). */
export const terrainClock = { value: 0 };

export function createTerrainMaterial(palette = {}) {
  const P = { ...DEFAULT_PALETTE, ...palette };
  const u = {};
  for (const k of ['grass', 'grass2', 'dirt', 'rock', 'rock2', 'deep', 'brick', 'brick2', 'mortar', 'wood', 'wood2', 'ice', 'sand', 'metal', 'glow', 'glow2']) u['u_' + k] = { value: new THREE.Color(P[k]) };
  const style = palette.style ?? (P.snow ? STYLE.SNOW : STYLE.GRASS);
  u.uSnow = { value: style === STYLE.SNOW ? 1 : 0 }; u.uStyle = { value: style }; u.uBump = { value: P.bump };
  u.uBrick = { value: new THREE.Vector2(P.brickSize[0], P.brickSize[1]) }; u.uTime = terrainClock;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aInfo; varying vec3 vInfo; flat varying float vMat; varying vec3 vW; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInfo = aInfo; vMat = aInfo.z; vW = position; vWN = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vInfo; flat varying float vMat; varying vec3 vW; varying vec3 vWN;
        uniform vec3 u_grass, u_grass2, u_dirt, u_rock, u_rock2, u_deep, u_brick, u_brick2, u_mortar, u_wood, u_wood2, u_ice, u_sand, u_metal, u_glow, u_glow2;
        uniform float uSnow, uBump, uStyle, uTime; uniform vec2 uBrick;
        float tH;   // procedural height for bump mapping (set in color pass, used in normal pass)
        vec3 tEmit; // procedural emissive (lava, neon, windows)
        bool isLava(){ return uStyle > 2.5 && uStyle < 3.5; }
        bool isCity(){ return uStyle > 3.5; }
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.03+7.1)*.3 + vn(p*4.11+3.7)*.2; }
        vec3 cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; float id = 0.;
          for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(x,y); vec2 o = vec2(h12(i+g), h12(i+g+17.3))*0.8+0.1; float d = length(g+o-f);
            if (d < d1){ d2 = d1; d1 = d; id = h12(i+g+3.1);} else if (d < d2) d2 = d; }
          return vec3(d1, d2 - d1, id); }
        // playable rooftops: a dashed warm/cyan LED strip just under the roof edge + a dark drip-edge flashing above it
        vec3 cityEdge(vec2 p, float depth, vec3 col){
          float flash = smoothstep(0.02, 0.05, depth) * smoothstep(0.2, 0.16, depth);
          col = mix(col, vec3(0.16, 0.16, 0.2), flash * 0.85);
          float strip = smoothstep(0.24, 0.27, depth) * smoothstep(0.38, 0.35, depth);
          float dash = smoothstep(0.08, 0.14, fract(p.x * 0.55)) * smoothstep(0.92, 0.86, fract(p.x * 0.55));
          vec3 lc = mix(vec3(1.0, 0.72, 0.32), u_glow2, step(0.55, h12(vec2(floor(p.x / 16.0), 1.0))));
          col = mix(col, lc, strip * dash); tEmit += lc * strip * dash * 2.2;
          tEmit += lc * 0.18 * smoothstep(0.38, 0.9, depth) * smoothstep(1.6, 0.38, depth) * dash;  // light spill on the wall below
          return col; }
        vec3 rockCol(vec2 p, float depth){
          if (isCity()) {                       // precast concrete panels (no windows: facades live in the backdrop)
            vec2 q = vec2(p.x / 2.4, p.y / 1.6); vec2 f = fract(q), id = floor(q);
            float joint = smoothstep(0.0, 0.025, f.x) * smoothstep(1.0, 0.975, f.x) * smoothstep(0.0, 0.04, f.y) * smoothstep(1.0, 0.96, f.y);
            vec3 col = mix(u_rock, u_rock2, h12(id)) * (0.88 + 0.14 * vn(p * 3.0));
            col *= 1.0 - 0.2 * smoothstep(0.55, 0.9, vn(vec2(p.x * 2.6, p.y * 0.22 + 4.0)));            // rain grime streaks
            vec2 th = (fract(q * 2.0) - 0.5) * vec2(2.4, 1.6); float tie = smoothstep(0.07, 0.035, length(th));
            col = mix(col * 0.55, col, joint); col = mix(col, col * 0.45, tie);
            tH = joint * 0.5 + vn(p * 5.0) * 0.12 - tie * 0.3;
            col = cityEdge(p, depth, col);
            return mix(col, col * 0.7, smoothstep(2.0, 3.0, depth) * 0.35); }
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
          // large-scale tint drift so big faces never read as one repeated tile
          float drift = fbm(p * 0.045 + 11.0);
          col *= mix(vec3(1.08, 0.95, 0.86), vec3(0.92, 0.98, 1.06), drift);
          // occasional smooth clay stratum with horizontal streaks
          float clay = step(0.78, h12(vec2(band, 21.0)));
          vec3 clayCol = mix(u_dirt, u_rock2, 0.35) * (0.86 + 0.18 * vn(vec2(p.x * 0.6, p.y * 9.0)));
          clayCol *= mix(0.75, 1.0, ledge);
          col = mix(col, clayCol, clay); tH = mix(tH, ledge * 0.5 + vn(vec2(p.x * 0.6, p.y * 9.0)) * 0.2, clay);
          // rare embedded gems / pebbles
          vec2 gq = p * 1.7; vec2 gid = floor(gq); float gh = h12(gid + 5.3);
          float gem = step(0.965, gh) * smoothstep(0.2, 0.12, length(fract(gq) - 0.5)) * (1.0 - clay);
          vec3 gemC = isLava() ? mix(vec3(0.9, 0.22, 0.04), vec3(1.0, 0.55, 0.12), step(0.983, gh)) : mix(vec3(0.45, 0.95, 1.0), vec3(1.0, 0.82, 0.3), step(0.983, gh)) * 1.25;
          if (isLava()) gem *= smoothstep(0.14, 0.08, length(fract(gq) - 0.5));        // lava: small glowing coals, not white pebbles
          col = mix(col, gemC, gem);
          tH += gem * 0.6;
          if (uStyle > 1.5 && uStyle < 2.5) {    // desert: wind-carved sandstone strata dominate the cells
            float sy2 = (p.y + warp * 0.6) / 0.72; float sb = floor(sy2), sf = fract(sy2);
            vec3 sc = mix(u_rock, u_rock2, h12(vec2(sb, 4.0)));
            sc = mix(sc, u_dirt * 1.08, step(0.68, h12(vec2(sb, 8.0))) * 0.75);
            sc *= 0.9 + 0.13 * vn(vec2(p.x * 0.7, p.y * 7.0));
            float seam = smoothstep(0.0, 0.16, sf) * smoothstep(1.0, 0.9, sf);
            sc *= mix(0.74, 1.0, seam);
            col = mix(sc, col, 0.3); tH = tH * 0.4 + seam * 0.45;
          }
          col = mix(col, u_deep, smoothstep(0.8, 3.0, depth) * 0.7);
          if (isLava()) {                       // chunky columnar basalt: vertical prisms with dark seams and lit faces
            float cxp = p.x / 1.15 + (vn(vec2(p.y * 0.12, 2.0)) - 0.5) * 0.7; float cid = floor(cxp), cf = fract(cxp);
            float cseam = smoothstep(0.0, 0.08, cf) * smoothstep(1.0, 0.9, cf);
            float facet = mix(0.78, 1.12, smoothstep(0.1, 0.9, cf)) * (0.86 + 0.24 * h12(vec2(cid, 5.0)));
            float joint = smoothstep(0.0, 0.05, abs(fract(p.y / (1.6 + h12(vec2(cid, 8.0)) * 1.4) + h12(vec2(cid, 3.0))) - 0.5) - 0.44);
            float colK = smoothstep(0.5, 1.2, depth);
            col = mix(col, col * facet * mix(0.45, 1.0, cseam) * mix(1.0, 0.7, joint), colK);
            tH = mix(tH, cseam * 0.7 + (1.0 - joint) * 0.2 + cf * 0.25, colK);
            // molten veins between the basalt cells, hotter with depth
            float vein = (1.0 - smoothstep(0.0, 0.06, c.y)) * smoothstep(0.7, 2.2, depth) * (1.0 - clay * 0.6);
            float pulse = 0.75 + 0.35 * sin(uTime * 1.6 + p.x * 0.6 + p.y * 0.9);
            col = mix(col, u_glow * 0.7, vein * 0.6); tEmit += u_glow * vein * pulse * 1.3;
            tEmit += mix(u_glow, vec3(1.0, 0.6, 0.2), 0.3) * gem * (0.6 + 0.4 * sin(uTime * 2.3 + gh * 40.0)); }
          return col; }
        vec3 brickCol(vec2 p, float depth){
          float row = floor(p.y / uBrick.y); vec2 q = vec2(p.x / uBrick.x + row * 0.5, p.y / uBrick.y); vec2 id = floor(q), f = fract(q);
          float e = min(min(f.x, 1.0 - f.x) * uBrick.x / uBrick.y, min(f.y, 1.0 - f.y));
          vec3 col = mix(u_brick, u_brick2, h12(id)); col *= 0.9 + 0.15 * vn(p * 4.0);
          col *= 0.92 + 0.14 * fbm(p * 0.35 + 4.0);                 // weathering drift
          float m = smoothstep(0.035, 0.075, e);
          col = mix(u_mortar, col, m);
          tH = m * (0.7 + 0.3 * smoothstep(0.0, 0.35, e)) - vn(p * 6.0) * 0.12 * m;
          // (no stamped window squares on playable brick: they read as z-fighting decals; facades live in the backdrop)
          if (isLava()) { float hot = smoothstep(0.06, 0.0, e) * smoothstep(1.2, 2.8, depth); tEmit += u_glow * hot * 0.9; }
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
        vec3 metalCol(vec2 p, float depth){
          vec2 q = vec2(p.x / 1.3, p.y / 0.85); vec2 id = floor(q), f = fract(q);
          float seam = smoothstep(0.0, 0.035, f.x) * smoothstep(1.0, 0.965, f.x) * smoothstep(0.0, 0.05, f.y) * smoothstep(1.0, 0.95, f.y);
          vec3 col = u_metal * (0.8 + 0.28 * h12(id)) * (0.88 + 0.18 * vn(p * vec2(1.5, 6.0)));
          col *= mix(0.5, 1.0, seam);
          col *= 0.92 + 0.16 * smoothstep(0.0, 1.0, f.y);                         // brushed sheen per plate
          vec2 rc = min(f, 1.0 - f); float rivet = smoothstep(0.07, 0.04, length((rc - vec2(0.08, 0.13)) * vec2(1.3, 0.85)));
          col = mix(col, u_metal * 1.45, rivet);
          tH = seam * 0.5 + rivet * 0.6;
          if (isCity()) {                          // corrugated steel sheeting with rust runs (playable rooftop metal)
            float rib = sin(p.x * 14.0); float sheet = fract(p.y / 2.2);
            vec3 sc = u_metal * (0.86 + 0.2 * h12(vec2(floor(p.x / 1.8), floor(p.y / 2.2)))) * (0.8 + 0.22 * (0.5 + 0.5 * rib));
            sc *= mix(0.55, 1.0, smoothstep(0.0, 0.03, sheet) * smoothstep(1.0, 0.97, sheet));
            float rust = smoothstep(0.62, 0.85, vn(vec2(p.x * 1.6, p.y * 0.18 + 2.0))) * (0.4 + 0.6 * vn(p * 4.0));
            sc = mix(sc, vec3(0.55, 0.3, 0.18), rust * 0.55);
            tH = 0.5 + 0.35 * rib + rust * 0.1;
            sc = cityEdge(p, depth, sc);
            return mix(sc, sc * 0.6, smoothstep(0.8, 3.0, depth) * 0.45); }
          if (isLava()) { float hz = step(0.5, fract((p.x + p.y) * 0.6)) * smoothstep(0.92, 0.97, f.y);   // hazard trim on plate tops
            col = mix(col, mix(vec3(0.95, 0.7, 0.1), vec3(0.08), hz), smoothstep(0.92, 0.97, f.y) * 0.85); }
          return mix(col, col * 0.6, smoothstep(0.8, 3.0, depth) * 0.5); }
        vec3 topCol(vec2 p){
          if (uSnow > 0.5) { vec3 s = vec3(0.96, 0.98, 1.0); s *= 0.92 + 0.08 * vn(p * 2.0); tH = vn(p * 3.0) * 0.3; return s; }
          if (uStyle > 1.5 && uStyle < 2.5) {     // desert: rippled sand
            vec3 s = mix(u_grass, u_grass2, fbm(p * 0.35)); float rip = sin(p.x * 4.5 + p.y * 1.7 + vn(p * 0.6) * 6.0);
            s *= 0.93 + 0.08 * rip; tH = rip * 0.25 + 0.25; return s; }
          if (isLava()) {                          // cooled basalt crust with glowing fissures
            vec3 c = cells(p * 0.85); float crack = 1.0 - smoothstep(0.0, 0.07, c.y);
            vec3 s = mix(u_grass, u_grass2, c.z * 0.7) * (0.85 + 0.2 * vn(p * 4.0));
            tH = smoothstep(0.0, 0.1, c.y) * 0.6;
            tEmit += u_glow * crack * (0.9 + 0.35 * sin(uTime * 2.0 + c.z * 20.0));
            return mix(s, u_glow, crack * 0.7); }
          if (isCity()) {                          // roof tiles / tar
            vec2 q = p / 0.9; vec2 f = fract(q); float tile = smoothstep(0.0, 0.05, f.x) * smoothstep(0.0, 0.05, f.y);
            vec3 s = mix(u_grass, u_grass2, h12(floor(q)) * 0.6) * (0.85 + 0.2 * vn(p * 6.0)) * mix(0.72, 1.0, tile);
            tH = tile * 0.3; return s; }
          vec3 g = mix(u_grass, u_grass2, fbm(p * 0.5)); float bl = vn(p * vec2(9.0, 2.0)); g *= 0.88 + 0.18 * bl;
          tH = bl * 0.3;
          float fl = step(0.975, h12(floor(p * 2.5)));
          return mix(g, mix(vec3(1.0, 0.95, 0.55), vec3(1.0, 0.6, 0.75), h12(floor(p * 2.5) + 3.0)), fl * 0.8); }
        vec3 matCol(float m, vec2 p, float depth){
          if (m < 0.5) return rockCol(p, depth);
          if (m < 1.5) return brickCol(p, depth);
          if (m < 2.5) return woodCol(p);
          if (m < 3.5) return iceCol(p, depth);
          if (m < 4.5) return metalCol(p, depth);
          tH = fbm(p * 2.0) * 0.3;
          vec3 sc = u_sand * (0.88 + 0.16 * fbm(p * 2.0));
          float strat = smoothstep(0.4, 0.5, fract(p.y * 0.9 + fbm(p * 0.2) * 1.5)) * 0.08;  // wind-laid layers
          return (sc * (1.0 - strat)) * mix(1.0, 0.7, smoothstep(0.8, 3.0, depth)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float tRough = 0.9;
        {
          vec2 p = vW.xy; float kind = vInfo.x, depth = vInfo.y, m = floor(vMat + 0.5);
          vec3 N = normalize(vWN); vec3 col; tH = 0.0; tEmit = vec3(0.0);
          if (kind > 1.5) {                       // drape
            float v = depth;
            if (uSnow > 0.5) { col = mix(vec3(1.0), vec3(0.8, 0.9, 1.0), v * 0.8); col *= 0.94 + 0.06 * vn(vec2(p.x * 6.0, v * 3.0)); tH = vn(vec2(p.x * 5.0, v * 2.0)) * 0.4; }
            else if (uStyle > 1.5 && uStyle < 2.5) {   // desert: drape trimmed to a short, blocky broken sandstone lip
              float bx = floor(p.x / 0.9); float lim = 0.18 + floor(h12(vec2(bx, 5.0)) * 3.0) * 0.1;
              if (v > lim) discard;
              col = mix(u_grass2, mix(u_sand, u_rock, 0.45), smoothstep(lim * 0.4, lim, v)); col *= 0.93 + 0.08 * vn(vec2(p.x * 3.0, v * 2.0));
              col *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.06, min(fract(p.x / 0.9), 1.0 - fract(p.x / 0.9))));
              tH = vn(vec2(p.x * 4.0, v * 3.0)) * 0.3; }
            else if (isLava()) { col = mix(u_grass2, u_grass * 0.55, v); float hot = smoothstep(0.5, 1.0, v); col = mix(col, u_glow, hot * 0.75);
              tEmit = u_glow * hot * (1.0 + 0.3 * sin(uTime * 2.5 + p.x * 1.7)); tH = vn(vec2(p.x * 7.0, v * 2.0)) * 0.5; }
            else if (isCity()) { float band = smoothstep(0.06, 0.12, v) * smoothstep(0.42, 0.34, v);
              vec3 nc = h12(vec2(floor(p.x / 9.0), 2.0)) > 0.5 ? u_glow : u_glow2;
              col = mix(mix(vec3(0.62, 0.64, 0.72), vec3(0.22, 0.22, 0.3), smoothstep(0.4, 0.6, v)), nc, band);
              tEmit = nc * band * 1.7; tH = band * 0.3; }
            else { float bl = vn(vec2(p.x * 16.0, 1.0)); col = mix(u_grass2, u_grass * 0.7, v); col *= 0.82 + 0.25 * bl; tH = bl * 0.8; }
          } else if (kind > 0.5) {                // walls
            float up = smoothstep(0.38, 0.62, N.y);
            vec3 side = matCol(m, vec2(p.x + vW.z * 0.7, p.y + vW.z * 0.3), 0.6);
            float hs = tH; vec3 es = tEmit; tEmit = vec3(0.0);
            side *= mix(1.0, 0.55, smoothstep(-0.2, -0.8, N.y));
            vec3 top = (m < 0.5 || m > 4.5 || (m > 2.5 && m < 3.5)) ? topCol(vec2(p.x, vW.z)) : matCol(m, vec2(p.x, vW.z), 0.0) * 1.08;
            tH = mix(hs, tH, up); tEmit = mix(es, tEmit, up);
            col = mix(side, top, up);
          } else {                                // front cap
            col = matCol(m, p, depth);
            if ((m < 0.5 || m > 4.5) && !isCity()) {
              float soil = 1.0 - smoothstep(0.25, 0.65 + 0.25 * vn(vec2(p.x * 1.3, 0.0)), depth);
              col = mix(col, u_dirt * (0.85 + 0.2 * vn(p * 4.0)), soil);
              tH = mix(tH, vn(p * 5.0) * 0.3, soil); tEmit *= 1.0 - soil;
              col *= mix(1.0, 0.7, smoothstep(0.55, 0.15, depth) * smoothstep(0.0, 0.18, depth)); // contact shade under the drape
              if (uStyle > 1.5 && uStyle < 2.5) {    // desert: a crumbling sandstone lip of broken blocks, no drips
                float bw = 0.7 + 0.5 * h12(vec2(floor(p.x / 1.1), 7.0)), bx = floor(p.x / bw), fx2 = fract(p.x / bw);
                float dl = 0.3 + floor(h12(vec2(bx, 3.0)) * 4.0) * 0.11;                // stepped block heights
                float lip = 1.0 - smoothstep(dl - 0.012, dl + 0.012, depth);
                float under = smoothstep(dl - 0.01, dl + 0.02, depth) * (1.0 - smoothstep(dl + 0.06, dl + 0.22, depth));
                float seam = 1.0 - smoothstep(0.0, 0.05, min(fx2, 1.0 - fx2));
                vec3 lc = mix(u_sand, u_rock, 0.35) * (0.9 + 0.14 * vn(p * 6.0)) * (1.0 - seam * 0.35) * mix(1.12, 0.92, depth / max(dl, 0.01));
                col = mix(col, lc, lip); col *= 1.0 - under * 0.4;
                tH = mix(tH, 0.85 - seam * 0.5, lip) - under * 0.3;
              } else {
              // moss / snow / sand drips running down from the top edge
              float cx = floor(p.x * 2.2), fx = fract(p.x * 2.2);
              float dl = 0.4 + h12(vec2(cx, 3.0)) * 1.4 * step(0.35, h12(vec2(cx, 9.0)));
              float tip = dl - 0.18 * (1.0 - pow(abs(fx - 0.5) * 2.0, 2.0));          // rounded drip ends
              float zone = smoothstep(0.38, 0.5, vn(vec2(p.x * 0.7, 5.0)));
              float moss = (1.0 - smoothstep(tip - 0.03, tip + 0.03, depth)) * zone;
              float rim = moss * smoothstep(tip - 0.16, tip - 0.02, depth);
              vec3 mc = uSnow > 0.5 ? vec3(0.95, 0.98, 1.0) * (0.92 + 0.08 * vn(p * 5.0)) : mix(u_grass, u_grass2, 0.2 + 0.3 * vn(p * 6.0)) * 0.82;
              col = mix(col, mc * (1.0 - rim * 0.25), moss); tH = mix(tH, 0.9 - rim * 0.5, moss);
              if (isLava()) tEmit += u_glow * rim * 0.9;                            // molten crust lips
              }
            }
          }
          if (isLava()) {
            tEmit += u_glow * 0.3 * smoothstep(-2.0, -9.0, vW.y) * (0.6 + 0.4 * smoothstep(0.2, -0.6, N.y)); // lava bounce light
            // glowing lava rim where the rock meets the lake: molten band + licking flames up the cliff
            float lick = 1.2 + 0.9 * vn(vec2(p.x * 0.9, uTime * 0.8)) + 0.4 * sin(p.x * 2.3 + uTime * 2.0);
            float rim = smoothstep(-9.3 + lick, -9.3, vW.y);
            col = mix(col, mix(u_glow, vec3(1.0, 0.85, 0.35), rim * rim), rim * 0.85);
            tEmit += mix(u_glow, vec3(1.0, 0.82, 0.3), rim) * rim * (1.3 + 0.3 * sin(uTime * 3.0 + p.x));
          }
          if (m > 2.5 && m < 3.5) tRough = 0.35;
          if (m > 3.5 && m < 4.5) tRough = 0.55;
          diffuseColor.rgb = col;
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += tEmit;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 dH = vec2(dFdx(tH), dFdy(tH)) * 0.2 * uBump;
          vec3 sX = dFdx(-vViewPosition), sY = dFdy(-vViewPosition);
          vec3 R1 = cross(sY, normal), R2 = cross(normal, sX); float det = dot(sX, R1);
          vec3 g = sign(det) * (dH.x * R1 + dH.y * R2);
          normal = normalize(abs(det) * normal - g);
        }`);
  };
  mat.customProgramCacheKey = () => 'archer-terrain-v5';
  mat.userData.uniforms = u;
  return mat;
}
