// Emberforge — basalt islands and iron forge platforms over a lake of lava (owner: Maps specialist).
import * as THREE from 'three';
import { MAT } from '../core/terrain.js';
import { floatingIsland, rect, circle, polygon, tower, stamp, safeSpawn, ensureHeightGap } from './shapes.js';
import { skyDome, cloudField, castle, lavaSea } from './sky.js';
import { volcanoRange, smokePlumes, heatHaze } from './backdrops.js';
import { createWeather } from './weather.js';
import { terrainClock, STYLE } from './terrainMaterial.js';

// island tops left -> right (outer two host the spawns and differ by >= 4)
const HEIGHT_SETS = [[3, 10, 5.5, 12, 8.5], [11, 4.5, 9, 2.5, 6], [5, 12.5, 3, 8, 1], [9.5, 2, 12, 6, 3.5], [2, 7.5, 11, 4, 10.5]];
const AVOID = [MAT.BRICK, MAT.METAL, MAT.WOOD];
const LAVA_Y = -9.3;

/** Stepped basalt column from y=top down below the lava surface: half-width hw/2 at the top, ledges every ~2 units,
 *  widening into a talus skirt where it meets the lava. */
function basaltRoot(cx, top, w, rng) {
  const L = [], Rt = [], bot = -14, steps = Math.max(4, Math.round((top - bot) / 2.2));
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, y = top + (bot - top) * t;
    const flare = Math.max(0, (LAVA_Y + 2.2 - y) / 2.2);                    // skirt in the last 2 units above the lava
    const base = w / 2 * (1 - 0.18 * Math.sin(t * Math.PI)) + flare * flare * 2.6;
    L.push([cx - base - (rng() - 0.5) * 1.1, y]); Rt.push([cx + base + (rng() - 0.5) * 1.1, y]);
    if (k < steps && k > 0) { const y2 = y - 0.35; L.push([L[L.length - 1][0] + 0.45, y2]); Rt.push([Rt[Rt.length - 1][0] - 0.45, y2]); }   // ledge notch
  }
  return polygon(L.concat(Rt.reverse()));
}

export default {
  id: 'emberforge', name: 'Emberforge', subtitle: 'Iron forges over a lava lake', music: 'battle',
  killY: -9.5, waterY: -9.3, fallVfx: 'lava_plunge', fallSfx: 'lava_plunge',
  bounds: { minX: -62, maxX: 62, minY: -12, maxY: 34 },
  palette: { style: STYLE.LAVA, grass: 0x4a3c44, grass2: 0x6a5660, dirt: 0x5a3a34, rock: 0x5e4a52, rock2: 0x463840, deep: 0x1e1418,
    brick: 0x7a4a40, brick2: 0x5e3832, mortar: 0x2a1a1a, wood: 0x6a4a34, wood2: 0x4a3224, metal: 0x7a8296, glow: 0xff6a1a, brickSize: [0.9, 0.45], bump: 1.2 },
  lighting: { sun: 0xffb27a, sunIntensity: 2.6, sunDir: [0.5, 0.62, 0.6], hemiSky: 0x9a7ab8, hemiGround: 0xff7a3a, hemiIntensity: 1.35, fill: 0xff8a4a, fillIntensity: 1.1,
    fog: 0x5a2a38, fogNear: 90, fogFar: 430, exposure: 1.08, saturation: 1.2, contrast: 1.08, warmth: [1.06, 0.98, 0.95] },
  sky: { top: 0x1c0c30, mid: 0x6a2048, horizon: 0xff8a4a },

  generate(T, rng) {
    const set = HEIGHT_SETS[Math.floor(rng() * HEIGHT_SETS.length)].slice();
    if (rng() < 0.5) set.reverse();
    const isl = [];
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 22 + (rng() - 0.5) * 4, top = set[i] + (rng() - 0.5) * 1.0, w = 12 + rng() * 5, depth = 8 + rng() * 5;
      isl.push({ x, top, w, depth });
      stamp(T, floatingIsland(x, top, w, depth, 300 + i * 11 + Math.floor(rng() * 100), { rough: 1.3, lump: 0.35, shoulder: 0.9 }), MAT.ROCK);
      // chunky basalt root from under the island down into the lava lake, stepped like columnar basalt and flaring
      // into a talus skirt at the waterline — islands read as land rising out of the lava, never as empty lava
      stamp(T, basaltRoot(x + (rng() - 0.5) * w * 0.12, top - 1.2, w * (0.5 + rng() * 0.12), rng), MAT.ROCK);
      // jagged basalt stalactites under each island
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const sx = x + (rng() - 0.5) * w * 0.55, sy = top - depth * (0.45 + rng() * 0.3), sw = 0.9 + rng() * 1.1, sl = 2 + rng() * 3;
        stamp(T, polygon([[sx - sw, sy + 1.5], [sx + sw, sy + 1.5], [sx + (rng() - 0.5) * 0.6, sy - sl]]), MAT.ROCK);
      }
    }
    // spawn islands: outer ones, must differ in height
    const L = 0, R = 4;
    // --- the central forge: iron deck, brick furnace with a glowing mouth and a tall chimney ---
    const mid = isl[2], fx = mid.x + (rng() - 0.5) * mid.w * 0.25, fb = mid.top - 0.5;
    stamp(T, rect(fx, fb + 0.25, 9.5, 0.7), MAT.METAL);
    const fh = 4.2 + rng() * 1.5;
    for (const sh of tower(fx, fb + 0.6, 4.4, fh, 3)) stamp(T, sh, MAT.BRICK);
    stamp(T, rect(fx + (rng() < 0.5 ? -1.3 : 1.3), fb + fh + 2.4, 1.1, 3.2), MAT.BRICK);   // chimney stack
    stamp(T, rect(fx, fb + 1.5, 1.6, 1.6), 0, 'subtract'); stamp(T, circle(fx, fb + 2.3, 0.8), 0, 'subtract');
    // --- iron catwalks between neighbours of similar height (walkable, carvable) ---
    for (let i = 0; i < 4; i++) {
      const A = isl[i], B = isl[i + 1]; if (Math.abs(A.top - B.top) > 4.2 || i === 1 && rng() < 0.5) continue;
      const ax = A.x + A.w * 0.42, bx = B.x - B.w * 0.42, ay = A.top - 0.25, by = B.top - 0.25, pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]); }
      stamp(T, polygon(pts.concat(pts.slice().reverse().map(([x, y]) => [x, y - 0.4]))), MAT.METAL);
    }
    // --- hanging iron grate platforms and basalt spires in the gaps ---
    for (let i = 0; i < 4; i++) {
      const A = isl[i], B = isl[i + 1]; if (rng() < 0.3) continue;
      const gx = (A.x + A.w / 2 + B.x - B.w / 2) / 2 + (rng() - 0.5) * 2, gy = Math.max(A.top, B.top) + 2.5 + rng() * 4.5;
      if (rng() < 0.55) stamp(T, rect(gx, gy, 4 + rng() * 1.5, 0.5), MAT.METAL);
      else stamp(T, floatingIsland(gx, gy, 3 + rng() * 1.6, 2.5 + rng() * 2, 500 + i, { lump: 0.2, shoulder: 0.6, rough: 1 }), MAT.ROCK);
    }
    // basalt spire as an obstacle on one of the inner islands
    const spI = isl[rng() < 0.5 ? 1 : 3], spx = spI.x + (rng() - 0.5) * spI.w * 0.3, sph = 4 + rng() * 2.5;
    stamp(T, polygon([[spx - 1.6, spI.top - 0.8], [spx + 1.6, spI.top - 0.8], [spx + 0.7, spI.top + sph * 0.6], [spx + 0.2, spI.top + sph], [spx - 0.5, spI.top + sph * 0.7]]), MAT.ROCK);
    // --- spawns ---
    let sL = safeSpawn(T, isl[L].x + (rng() - 0.5) * isl[L].w * 0.3, 5, { avoid: AVOID });
    let sR = safeSpawn(T, isl[R].x + (rng() - 0.5) * isl[R].w * 0.3, 5, { avoid: AVOID });
    if (sL.y >= sR.y) sL = ensureHeightGap(T, sL, sR, 3); else sR = ensureHeightGap(T, sR, sL, 3);
    // low iron barricades toward the enemy
    for (const [S, dir, I] of [[sL, 1, isl[L]], [sR, -1, isl[R]]]) {
      const wx = Math.min(I.x + I.w * 0.4, Math.max(I.x - I.w * 0.4, S.x + dir * (3.2 + rng() * 1.2))), wy = T.topAt(wx);
      if (!isNaN(wy)) { stamp(T, rect(wx, wy + 0.5, 0.55, 1.6 + rng() * 0.6), MAT.METAL); stamp(T, rect(wx, wy + 0.1, 1.6, 0.5), MAT.METAL); }
    }
    const s2 = safeSpawn(T, isl[1].x, 5, { avoid: AVOID }), s3 = safeSpawn(T, isl[3].x, 5, { avoid: AVOID });
    return { spawns: [{ x: sL.x }, { x: sR.x }, { x: s2.x }, { x: s3.x }], isl, forge: { x: fx, base: fb, h: fh }, sp: [sL, sR] };
  },

  decorate(ctx) {
    const { rng, props, terrain: T, gen } = ctx, isl = gen.isl;
    const ok = (x) => { const y = T.topAt(x); return (!isNaN(y) && y > -6 && T.matAt(x, y - 0.3) === MAT.ROCK) ? y : NaN; };
    const nearSpawn = (x) => gen.sp.some((s) => Math.abs(s.x - x) < 1.4);
    const place = (type, x, z, o = {}) => { const y = ok(x); if (!isNaN(y) && !(z > -0.5 && nearSpawn(x))) props.add(type, x, y - 0.05, { z, ...o }); };
    for (const I of isl) {
      place('deadtree', I.x + (rng() - 0.5) * I.w * 0.7, -1.3 - rng() * 0.9, { scale: 0.9 + rng() * 0.5, rotY: rng() * 6 });
      for (let k = 0; k < 2; k++) place('lavarock', I.x + (rng() - 0.5) * I.w * 0.8, (rng() - 0.5) * 3, { scale: 0.5 + rng() * 0.6, rotY: rng() * 6 });
      for (let k = 0; k < 2; k++) place('obsidian', I.x + (rng() - 0.5) * I.w * 0.8, rng() < 0.5 ? -1.2 : 1.1, { scale: 0.6 + rng() * 0.5, rotY: rng() * 6 });
    }
    for (const S of gen.sp) { place('spikes', S.x + (rng() < 0.5 ? -2.4 : 2.4), -1.4, { rotY: (rng() - 0.5) * 0.4 }); place('brazier', S.x + (rng() < 0.5 ? -1.6 : 1.6), -0.9); }
    const F = gen.forge;
    props.add('anvil', F.x - 3.6, F.base + 0.6, { z: 0.9, rotY: 0.3 });
    props.add('chimney', F.x + 3.8, F.base + 0.6, { z: -1.4, scale: 0.9 });
    place('chimney', isl[rng() < 0.5 ? 1 : 3].x + (rng() - 0.5) * 4, -1.6, { scale: 0.8 });
  },

  buildBackdrop() {
    const group = new THREE.Group();
    group.add(skyDome({ ...this.sky, sun: 0xff9a50, sunDir: [0.4, 0.08, -1], sunSize: 2.4, stars: 0.4 }));
    const farV = volcanoRange({ z: -300, count: 5, seed: 5, width: 820, height: [80, 130], radius: [60, 90], rock: 0x3a2434, rock2: 0x553040, ash: 0x6a5060 });
    const nearV = volcanoRange({ z: -175, count: 4, seed: 9, width: 560, height: [34, 60], radius: [30, 44] });
    group.add(farV.mesh, nearV.mesh);
    const big = farV.peaks.slice().sort((a, b) => b.h - a.h).slice(0, 3);
    const plumes = smokePlumes(big, { per: 12, rise: 110 });
    group.add(plumes.mesh);
    const haze = heatHaze({ y: this.waterY, z: -110 });
    group.add(haze.mesh);
    group.add(castle({ x: -60, y: -6, z: -140, scale: 0.8, wall: 0x3a2a34, roof: 0x24161e, windows: 0xffa040 }));
    const smoke = cloudField({ count: 12, seed: 17, color: 0x3e2c38, shade: 0xb04a24, zRange: [-130, -300], yRange: [28, 70], scale: [16, 30], speed: 0.5 });
    group.add(smoke.mesh);
    const lava = lavaSea({ y: this.waterY });
    group.add(lava.mesh);
    const embers = createWeather({ kind: 'embers', count: 260, seed: 3 }), ash = createWeather({ kind: 'ash', count: 200, seed: 8 });
    group.add(embers.mesh, ash.mesh);
    return { group, update(dt, t, cam, wind) { terrainClock.value = t; smoke.update(dt); farV.update(dt, t); nearV.update(dt, t); plumes.update(dt, t, wind); haze.update(dt, t); lava.update(dt, t); embers.update(dt, t, cam, wind); ash.update(dt, t, cam, wind); } };
  },
};
