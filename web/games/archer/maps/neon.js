// Neon Heights — night-city rooftops with lit windows, neon trims and a glowing street far below (owner: Maps specialist).
import * as THREE from 'three';
import { MAT } from '../core/terrain.js';
import { rect, circle, polygon, stamp, safeSpawn, ensureHeightGap } from './shapes.js';
import { skyDome, cloudField, cityFloor, hazeLayer } from './sky.js';
import { luckyCatSign, blimp } from './landmarks.js';
import { cityLayer } from './backdrops.js';
import { createWeather } from './weather.js';
import { terrainClock, STYLE } from './terrainMaterial.js';

// rooftop heights for 6 buildings left -> right; outer spawn roofs differ by >= 4, a tall tower sits in the middle
const HSETS = [[3, 7, 13, 9.5, 4.5, 8], [9, 4, 6.5, 14, 2, 4.5], [5.5, 10, 4, 12.5, 7, 1.5], [1.5, 6, 12, 5, 9.5, 7], [8.5, 2.5, 13.5, 8, 5, 3.5]];
const MATS = [MAT.ROCK, MAT.BRICK, MAT.METAL];

export default {
  id: 'neon', name: 'Neon Heights', subtitle: 'Rooftop duel over the night city', music: 'battle',
  killY: -9.5, waterY: -11, fallVfx: 'street_impact', fallSfx: 'street_impact',
  bounds: { minX: -62, maxX: 62, minY: -12, maxY: 34 },
  palette: { style: STYLE.CITY, grass: 0x302e36, grass2: 0x403c46, dirt: 0x4a4458, rock: 0x7c7680, rock2: 0x66606e, deep: 0x2a2440,
    brick: 0x9a4a40, brick2: 0x7a3832, mortar: 0x3a2a2e, wood: 0x7a5a40, wood2: 0x5a3e2a, metal: 0x5e6874, glow: 0xff3fb0, glow2: 0x3fe8ff, brickSize: [0.7, 0.32], bump: 1.0 },
  lighting: { sun: 0xb8c4ff, sunIntensity: 2.3, sunDir: [-0.5, 0.7, 0.55], hemiSky: 0x9a7aff, hemiGround: 0xff5ab0, hemiIntensity: 1.3, fill: 0x5ae0ff, fillIntensity: 1.2,
    fog: 0x2e1a52, fogNear: 90, fogFar: 420, exposure: 1.12, saturation: 1.25, contrast: 1.06, warmth: [1.0, 0.98, 1.05] },
  sky: { top: 0x0c0a2e, mid: 0x3a1a6e, horizon: 0xff5aa8 },

  generate(T, rng) {
    const set = HSETS[Math.floor(rng() * HSETS.length)].slice(); if (rng() < 0.5) set.reverse();
    const B = [];
    let x = -60;
    const widths = []; for (let i = 0; i < 6; i++) widths.push(11 + rng() * 6);
    const gapsW = []; for (let i = 0; i < 5; i++) gapsW.push(3 + rng() * 3.5);
    const total = widths.reduce((a, b) => a + b, 0) + gapsW.reduce((a, b) => a + b, 0), k = 120 / total;
    for (let i = 0; i < 6; i++) {
      const w = widths[i] * k, top = set[i] + (rng() - 0.5) * 1.0, cx = x + w / 2, mat = MATS[(i + Math.floor(rng() * 3)) % 3];
      stamp(T, rect(cx, (top - 16) / 2, w, top + 16), mat);
      // setbacks / cornices that break up the silhouette
      if (rng() < 0.6) { const sy = top - 3 - rng() * 5; stamp(T, rect(cx, sy, w + 1.0, 0.5), MAT.METAL); }
      if (rng() < 0.5) { const side = rng() < 0.5 ? -1 : 1; stamp(T, rect(cx + side * (w / 2 - 1.2), top - 6 - rng() * 4, 2.6, 3.5), 0, 'subtract'); } // recessed balcony
      B.push({ x0: x, x1: x + w, cx, w, top, mat });
      x += w + (i < 5 ? gapsW[i] * k : 0);
    }
    const L = 0, R = 5;
    // --- rooftop structures: stair huts, a billboard frame on stilts, an antenna mast on the tallest roof ---
    let tall = 1; for (let i = 2; i < 5; i++) if (B[i].top > B[tall].top) tall = i;
    const TB = B[tall];
    stamp(T, rect(TB.cx + (rng() - 0.5) * 2, TB.top + 3.2, 0.4, 6.4), MAT.METAL);
    stamp(T, rect(TB.cx + (rng() < 0.5 ? -2.4 : 2.4), TB.top + 1.1, 2.6, 2.2), MAT.BRICK);
    for (let i = 1; i < 5; i++) {
      if (i === tall) continue;
      const b = B[i], r = rng();
      if (r < 0.45) {                                     // billboard frame: two posts and a panel you can shoot under
        const bx = b.cx + (rng() - 0.5) * b.w * 0.3, ph = 2.4 + rng() * 0.8;
        stamp(T, rect(bx - 1.7, b.top + ph / 2, 0.35, ph), MAT.METAL); stamp(T, rect(bx + 1.7, b.top + ph / 2, 0.35, ph), MAT.METAL);
        stamp(T, rect(bx, b.top + ph + 1.0, 5.2, 2.0), MAT.METAL);
        b.board = bx;
      } else if (r < 0.8) {                               // stair hut / lift room
        const hx = b.cx + (rng() - 0.5) * b.w * 0.4; stamp(T, rect(hx, b.top + 1.2, 2.8, 2.4), MAT.BRICK); stamp(T, rect(hx, b.top + 2.55, 3.3, 0.3), MAT.METAL);
        b.hut = hx;
      }
    }
    // --- steel catwalk across the alley between the two closest-height neighbours (not at the tower) ---
    let best = -1, bd = 3.8;
    for (let i = 0; i < 5; i++) { if (i === tall || i + 1 === tall) continue; const d = Math.abs(B[i].top - B[i + 1].top); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) {
      const A = B[best], C = B[best + 1], ax = A.x1 - 0.6, cx = C.x0 + 0.6, ay = A.top - 0.2, cy = C.top - 0.2, pts = [];
      for (let q = 0; q <= 6; q++) { const t = q / 6; pts.push([ax + (cx - ax) * t, ay + (cy - ay) * t]); }
      stamp(T, polygon(pts.concat(pts.slice().reverse().map(([px, py]) => [px, py - 0.35]))), MAT.METAL);
    }
    // a hovering neon sign-board (metal slab) high over one alley as a mid-air obstacle
    const g = 1 + Math.floor(rng() * 3), gx = (B[g].x1 + B[g + 1].x0) / 2, gy = Math.max(B[g].top, B[g + 1].top) + 4 + rng() * 3;
    stamp(T, rect(gx, gy, 3.6, 1.3), MAT.METAL);
    // --- spawns: outer roofs, parapet cover toward the enemy ---
    let sL = safeSpawn(T, B[L].cx + (rng() - 0.5) * B[L].w * 0.3, 5, { near: B[L].top });
    let sR = safeSpawn(T, B[R].cx + (rng() - 0.5) * B[R].w * 0.3, 5, { near: B[R].top });
    if (sL.y >= sR.y) sL = ensureHeightGap(T, sL, sR, 3, B[L].mat); else sR = ensureHeightGap(T, sR, sL, 3, B[R].mat);
    for (const [S, dir, b] of [[sL, 1, B[L]], [sR, -1, B[R]]]) {
      const px = dir > 0 ? b.x1 - 0.5 : b.x0 + 0.5;
      if (Math.abs(px - S.x) > 2.2) stamp(T, rect(px, T.topAt(px) + 0.5, 0.6, 1.2), MAT.METAL);   // parapet lip at the roof edge
      const cx2 = S.x + dir * (3.0 + rng() * 1.0);
      if ((dir > 0 ? b.x1 - cx2 : cx2 - b.x0) > 2.4) { const cy2 = T.topAt(cx2); stamp(T, rect(cx2, cy2 + 0.55, 1.4, 1.1), MAT.METAL); }       // AC crate cover
    }
    const b2 = B[tall === 1 ? 2 : 1], b3 = B[tall === 4 ? 3 : 4];
    const s2 = safeSpawn(T, b2.cx, b2.w / 2 - 1, { near: b2.top }), s3 = safeSpawn(T, b3.cx, b3.w / 2 - 1, { near: b3.top });
    return { spawns: [{ x: sL.x }, { x: sR.x }, { x: s2.x }, { x: s3.x }], B, tall, sp: [sL, sR] };
  },

  decorate(ctx) {
    const { rng, props, terrain: T, gen } = ctx;
    const nearSpawn = (x) => gen.sp.some((s) => Math.abs(s.x - x) < 1.5);
    const roofAt = (b, x) => { const y = T.topAt(x); return (!isNaN(y) && Math.abs(y - b.top) < 1.2) ? y : NaN; };
    const place = (b, type, x, z, o = {}) => { const y = roofAt(b, x); if (!isNaN(y) && !(z > -0.6 && nearSpawn(x))) props.add(type, x, y - 0.02, { z, ...o }); };
    for (const b of gen.B) {
      const r = () => b.x0 + 1.2 + rng() * (b.w - 2.4);
      place(b, 'acunit', r(), -1.4 + rng() * 0.6, { scale: 0.8 + rng() * 0.3, rotY: (rng() - 0.5) * 0.4 });
      place(b, 'vent', r(), rng() < 0.5 ? -1.0 : 1.3, { scale: 0.8 + rng() * 0.4 });
      place(b, 'acunit', r(), -1.9 + rng() * 0.4, { scale: 0.7 + rng() * 0.3, rotY: (rng() - 0.5) * 0.4 });
      place(b, 'vent', r(), -0.9 - rng() * 0.6, { scale: 0.7 + rng() * 0.4 });
      if (rng() < 0.5) place(b, 'vent', r(), 1.4, { scale: 0.6 + rng() * 0.3 });
      if (rng() < 0.6) place(b, rng() < 0.5 ? 'dish' : 'antenna', r(), -1.8, { scale: 0.8 + rng() * 0.3, rotY: rng() * 6 });
      if (rng() < 0.45) place(b, 'watertower', r(), -1.9, { scale: 0.85 + rng() * 0.25 });
      if (rng() < 0.55) place(b, 'neonsign', r(), -1.6, { scale: 0.9 + rng() * 0.3, rotY: (rng() - 0.5) * 0.3 });
    }
  },

  buildBackdrop() {
    const group = new THREE.Group();
    group.add(skyDome({ ...this.sky, sun: 0xfff0e0, sunDir: [0.45, 0.55, -1], sunSize: 0.5, stars: 1.0 }));
    // three lit skyline layers, each fading further into the violet haze (fog depth between layers)
    const far = cityLayer({ z: -330, count: 60, width: 1200, height: [50, 160], depth: [20, 40], bw: [16, 34], seed: 2, tint: 0x2a2a6a, haze: 0x4a2470, hazeAmt: 0.62, tile: 40, signs: 0.25, lit: 0.7 });
    const midL = cityLayer({ z: -190, count: 44, width: 760, height: [24, 90], depth: [12, 24], bw: [10, 22], seed: 7, tint: 0x3a347c, haze: 0x5a2a7a, hazeAmt: 0.42, tile: 26, signs: 0.4, lit: 0.9 });
    const near = cityLayer({ z: -95, count: 30, width: 440, height: [8, 34], depth: [8, 14], bw: [7, 14], y0: -16, seed: 13, tint: 0x4a3c8a, haze: 0x6a2a80, hazeAmt: 0.2, tile: 16, signs: 0.55 });
    group.add(far.mesh, midL.mesh, near.mesh);
    // fog banks between the skyline layers (depth), the mascot sign landmark and a drifting blimp
    group.add(hazeLayer({ z: -260, y0: -16, height: 90, color: 0x6a3a9a, alpha: 0.55 }), hazeLayer({ z: -140, y0: -16, height: 45, color: 0x7a3a9a, alpha: 0.45 }));
    // the cat sign sits LOW between the buildings (ring top ~y 12.5) and smaller, so it never rises into the HUD corners
    const cat = luckyCatSign({ x: 4, y: -20, z: -88, scale: 0.5 }), ship = blimp({ y: 24 });
    group.add(cat.mesh, ship.mesh);
    const clouds = cloudField({ count: 9, seed: 23, color: 0x7a4aa8, shade: 0x3a2060, zRange: [-200, -380], yRange: [50, 90], scale: [18, 34], speed: 0.7 });
    group.add(clouds.mesh);
    const street = cityFloor({ y: this.waterY });
    group.add(street.mesh);
    const rain = createWeather({ kind: 'rain', count: 360, seed: 6 }), motes = createWeather({ kind: 'neon', count: 90, seed: 9 });
    group.add(rain.mesh, motes.mesh);
    return {
      group,
      update(dt, t, cam, wind) { terrainClock.value = t; far.update(dt, t); midL.update(dt, t); near.update(dt, t); clouds.update(dt); street.update(dt, t); cat.update(dt, t); ship.update(dt, t); rain.update(dt, t, cam, wind); motes.update(dt, t, cam, wind); },
    };
  },
};
