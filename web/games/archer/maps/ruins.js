// Amberdune Ruins — sandstone mesas split by deep canyons, a ruined desert temple and a sea of dunes below
// (owner: Maps specialist).
import * as THREE from 'three';
import { MAT } from '../core/terrain.js';
import { rect, circle, ellipse, polygon, gable, wall, mesa, stamp, floatingIsland, safeSpawn, ensureHeightGap } from './shapes.js';
import { skyDome, cloudField, mesas, duneSea } from './sky.js';
import { createWeather } from './weather.js';
import { terrainClock, STYLE } from './terrainMaterial.js';
import { fbm1, noise1 } from '../core/util.js';

// mesa top heights left -> right; the outer two are the spawn mesas and always differ by >= 4
const HSETS = [[9, 3, 6.5, 2], [1.5, 7, 4, 9.5], [10, 5, 1, 5], [3, 9.5, 6, -0.5], [7.5, 1.5, 9, 2.5]];
const AVOID = [MAT.BRICK, MAT.WOOD, MAT.METAL];

export default {
  id: 'ruins', name: 'Amberdune Ruins', subtitle: 'Desert temple canyons', music: 'battle',
  killY: -9.5, waterY: -9.4,
  bounds: { minX: -62, maxX: 62, minY: -12, maxY: 34 },
  palette: { style: STYLE.DESERT, grass: 0xf2c47a, grass2: 0xffe2a4, dirt: 0xd8945a, rock: 0xe0904e, rock2: 0xc46e3e, deep: 0x8a3e2a,
    brick: 0xf0d2a0, brick2: 0xd8b07a, mortar: 0xa87a50, wood: 0x9a6438, wood2: 0x6e4425, sand: 0xf6d290, metal: 0x9a8a78, brickSize: [1.25, 0.62] },
  lighting: { sun: 0xfff0c8, sunIntensity: 3.5, sunDir: [-0.4, 0.8, 0.5], hemiSky: 0xa8d8ff, hemiGround: 0xe0905a, hemiIntensity: 1.15, fill: 0xffd0a0, fillIntensity: 0.7,
    fog: 0xf4dcb4, fogNear: 150, fogFar: 760, exposure: 1.0, saturation: 1.2, contrast: 1.07, warmth: [1.05, 1.0, 0.94] },
  sky: { top: 0x1f6ed8, mid: 0x72bdf0, horizon: 0xffe6b0 },

  generate(T, rng) {
    const s = Math.floor(rng() * 1000);
    const set = HSETS[Math.floor(rng() * HSETS.length)].slice(); if (rng() < 0.5) set.reverse();
    const tops = set.map((h) => h + (rng() - 0.5) * 1.2);
    const gaps = [-29 + (rng() - 0.5) * 6, (rng() - 0.5) * 6, 29 + (rng() - 0.5) * 6], gw = gaps.map(() => 4.5 + rng() * 2.5);
    const M = [];
    for (let i = 0; i < 4; i++) {
      const a = i === 0 ? -62 : gaps[i - 1] + gw[i - 1] / 2, b = i === 3 ? 62 : gaps[i] - gw[i] / 2;
      const cx = (a + b) / 2, hw = (b - a) / 2, top = tops[i], sd = s + i * 13;
      const topFn = (x) => top + (fbm1(x * 0.13, sd) - 0.5) * 1.3 - Math.pow(Math.max(0, Math.abs(x - cx) - (hw - 1.6)), 2) * 0.35;
      // stepped, eroded cliff walls: ledges come and go with height, a wider foot near the canyon floor
      // caprock lip, undercut below it, then a talus flare toward the canyon floor (kept narrower than the canyon)
      const flareMax = Math.min(i > 0 ? gw[i - 1] : 9, i < 3 ? gw[i] : 9) / 2 - 1.2;
      const ledge = (y) => (y > top - 1.6 ? 0.5 : -0.7) + Math.min(flareMax, Math.max(0, top - 4 - y) * 0.16) + (noise1(y * 0.5, sd) - 0.5) * 1.4;
      stamp(T, mesa(cx, hw, topFn, ledge, -16), MAT.ROCK);
      // sand cap and a dune drift on the top
      stamp(T, { x0: a, x1: b, y0: top - 3, y1: top + 3, sdf: (x, y) => topFn(x) - 0.8 - (fbm1(x * 0.4, sd + 2) - 0.5) * 0.5 - y }, MAT.SAND, 'paint');
      const dx = cx + (rng() - 0.5) * hw, dw = 3 + rng() * 3, dh = 0.7 + rng() * 0.8;
      stamp(T, { x0: dx - dw - 1, x1: dx + dw + 1, y0: top - 2, y1: top + 2.5, sdf: (x, y) => y - (topFn(x) + Math.max(0, 1 - ((x - dx) / dw) ** 2) * dh) }, MAT.SAND);
      // wind-eroded alcoves in the cliff faces (overhangs, ledges to hide under)
      for (const side of [-1, 1]) if (rng() < 0.7) {
        const ey = top - 3 - rng() * 6; stamp(T, ellipse(cx + side * (hw + 0.6), ey, 1.6 + rng() * 1.4, 1.0 + rng() * 0.6), 0, 'subtract');
      }
      M.push({ a, b, cx, hw, top, topFn });
    }
    // spawn mesas are the outer two; the higher middle mesa carries the temple, the other a ruined arch
    const sideL = M[0], sideR = M[3];
    const tIdx = M[1].top >= M[2].top ? 1 : 2, aIdx = 3 - tIdx;
    // --- temple portico on the high middle mesa (columns with gaps you can shoot through) ---
    const TM = M[tIdx], tx = TM.cx + (rng() - 0.5) * TM.hw * 0.3, tb = TM.topFn(tx) - 0.4;
    stamp(T, rect(tx, tb + 0.3, 10.5, 0.9), MAT.BRICK); stamp(T, rect(tx, tb + 0.95, 8.8, 0.6), MAT.BRICK);
    const colH = 3.4 + rng() * 0.8, cb = tb + 1.2, broken = Math.floor(rng() * 4);
    for (let k = 0; k < 4; k++) {
      const cxk = tx - 3.3 + k * 2.2, h = k === broken ? colH * (0.35 + rng() * 0.25) : colH;
      stamp(T, rect(cxk, cb + h / 2, 0.85, h), MAT.BRICK); stamp(T, rect(cxk, cb + 0.15, 1.2, 0.3), MAT.BRICK);
      if (k !== broken) stamp(T, rect(cxk, cb + h - 0.15, 1.15, 0.3), MAT.BRICK);
    }
    // architrave + pediment, collapsed over the broken column
    const ab = cb + colH;
    const archL = broken === 0 ? tx - 1.4 : tx - 4.1, archR = broken === 3 ? tx + 1.4 : tx + 4.1;
    stamp(T, rect((archL + archR) / 2, ab + 0.3, archR - archL, 0.6), MAT.BRICK);
    stamp(T, gable((archL + archR) / 2, ab + 0.6, (archR - archL) / 2, ab + 2.2), MAT.BRICK);
    stamp(T, circle(broken < 2 ? archL + 0.3 : archR - 0.3, ab + 0.9, 1.1), 0, 'subtract');
    // --- ruined arch on the other middle mesa ---
    const AM = M[aIdx], ax = AM.cx + (rng() - 0.5) * AM.hw * 0.4, abase = AM.topFn(ax) - 0.4, ah = 3.6 + rng() * 1.2;
    stamp(T, rect(ax - 2.3, abase + ah / 2, 1.2, ah), MAT.BRICK); stamp(T, rect(ax + 2.3, abase + ah / 2, 1.2, ah), MAT.BRICK);
    stamp(T, rect(ax, abase + ah + 0.5, 6.2, 1.4), MAT.BRICK);
    stamp(T, circle(ax, abase + ah - 1.0, 1.6), 0, 'subtract');
    stamp(T, circle(ax + (rng() < 0.5 ? -3 : 3), abase + ah + 1.2, 1.0), 0, 'subtract');
    // --- floating temple fragments above the canyons (obstacles / ricochet bait) ---
    for (let g = 0; g < 3; g++) {
      if (rng() < 0.35) continue;
      const fx = gaps[g] + (rng() - 0.5) * 2, fy = Math.max(M[g].top, M[g + 1].top) + 3.5 + rng() * 4;
      stamp(T, floatingIsland(fx, fy, 3.2 + rng() * 1.6, 2.4 + rng() * 1.5, s + 40 + g, { lump: 0.15, shoulder: 0.5 }), MAT.ROCK);
      stamp(T, rect(fx, fy + 0.35, 2.2, 0.6), MAT.BRICK);
    }
    // --- a sagging stone bridge over the canyon between the two closest-height neighbours ---
    let best = -1, bd = 3.5;
    for (let g = 0; g < 3; g++) { const d = Math.abs(M[g].top - M[g + 1].top); if (d < bd) { bd = d; best = g; } }
    if (best >= 0) {
      const A = M[best], B = M[best + 1], x0 = A.b - 1.2, x1 = B.a + 1.2, y0 = A.topFn(x0) - 0.25, y1 = B.topFn(x1) - 0.25, pts = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 0.4]); }
      stamp(T, polygon(pts.concat(pts.slice().reverse().map(([x, y]) => [x, y - 0.6]))), MAT.BRICK);
      stamp(T, circle((x0 + x1) / 2 + (rng() - 0.5) * 2, (y0 + y1) / 2 - 0.4, 0.55), 0, 'subtract'); // cracked
    }
    // --- spawns: outer mesas, cover wall toward the enemy, validated + height gap enforced ---
    let sL = safeSpawn(T, sideL.cx + (rng() - 0.5) * sideL.hw * 0.5, 7, { avoid: AVOID });
    let sR = safeSpawn(T, sideR.cx + (rng() - 0.5) * sideR.hw * 0.5, 7, { avoid: AVOID });
    if (sL.y >= sR.y) sL = ensureHeightGap(T, sL, sR, 3, MAT.SAND); else sR = ensureHeightGap(T, sR, sL, 3, MAT.SAND);
    for (const [S, dir, Mx] of [[sL, 1, sideL], [sR, -1, sideR]]) {
      const wx = Math.max(Mx.a + 1.5, Math.min(Mx.b - 1.5, S.x + dir * (3.4 + rng() * 1.2))), wy = T.topAt(wx);
      for (const sh of wall(wx - 0.9, wx + 0.9, wy - 0.4, 1.1 + rng() * 0.7, 0.5)) stamp(T, sh, MAT.BRICK);
      stamp(T, circle(wx + dir * 0.6, wy + 1.6, 0.6), 0, 'subtract');                 // chipped corner
    }
    const s2 = safeSpawn(T, M[aIdx].cx + (rng() < 0.5 ? -1 : 1) * M[aIdx].hw * 0.55, 5, { avoid: AVOID });
    const s3 = safeSpawn(T, M[tIdx].cx + (tx > M[tIdx].cx ? -1 : 1) * M[tIdx].hw * 0.7, 4, { avoid: AVOID });
    const left = s2.x < s3.x ? s2 : s3, right = left === s2 ? s3 : s2;
    return { spawns: [{ x: sL.x }, { x: sR.x }, { x: left.x }, { x: right.x }], M, temple: { x: tx, base: tb }, arch: { x: ax }, sp: [sL, sR] };
  },

  decorate(ctx) {
    const { rng, props, terrain: T, gen } = ctx;
    const ok = (x) => { const y = T.topAt(x); if (isNaN(y) || y < -6) return NaN; const m = T.matAt(x, y - 0.3); return (m === MAT.SAND || m === MAT.ROCK) ? y : NaN; };
    const nearSpawn = (x) => gen.sp.some((s) => Math.abs(s.x - x) < 1.4);
    const place = (type, x, z, o = {}) => { const y = ok(x); if (!isNaN(y) && !(z > -0.5 && nearSpawn(x))) props.add(type, x, y - 0.05, { z, ...o }); };
    for (const Mx of gen.M) {
      const span = Mx.b - Mx.a - 3;
      for (let k = 0; k < 2; k++) place('cactus', Mx.a + 1.5 + rng() * span, -1.3 - rng() * 1.0, { scale: 0.8 + rng() * 0.45, rotY: rng() * 6 });
      for (let k = 0; k < 3; k++) place('shrub', Mx.a + 1.5 + rng() * span, 0.6 + rng() * 1.2, { scale: 0.8 + rng() * 0.5, rotY: rng() * 6 });
      for (let k = 0; k < 2; k++) place('sandrock', Mx.a + 1.5 + rng() * span, (rng() - 0.5) * 3, { scale: 0.5 + rng() * 0.7, rotY: rng() * 6 });
      place('pillar', Mx.a + 1.5 + rng() * span, -1.5 - rng() * 0.6, { scale: 0.9 + rng() * 0.4, rotY: rng() * 6 });
      if (rng() < 0.6) place('skull', Mx.a + 1.5 + rng() * span, 1.2 + rng() * 0.6, { scale: 0.8 + rng() * 0.3, rotY: (rng() - 0.5) * 1.5 });
    }
    for (const S of gen.sp) {
      place('urn', S.x - 1.8, -0.9, { scale: 0.9, rotY: rng() * 6 }); place('urn', S.x + 1.9, -1.2, { scale: 0.75, rotY: rng() * 6 });
      place('banner', S.x + (rng() < 0.5 ? -2.6 : 2.6), -1.7, { scale: 0.9 });
    }
    const AM = gen.M.find((m) => Math.abs(m.cx - gen.arch.x) < m.hw);
    if (AM) place('obelisk', AM.cx + (gen.arch.x > AM.cx ? -1 : 1) * AM.hw * 0.6, -1.9, { scale: 1.0 });
    props.add('brazier', gen.temple.x - 5.6, gen.temple.base + 0.2, { z: -0.9 });
    props.add('brazier', gen.temple.x + 5.6, gen.temple.base + 0.2, { z: -0.9 });
  },

  buildBackdrop() {
    const group = new THREE.Group();
    group.add(skyDome({ ...this.sky, sun: 0xfff2c0, sunDir: [-0.45, 0.5, -1], sunSize: 2.2 }));
    group.add(mesas({ z: -280, count: 9, seed: 6, width: 760, height: [40, 75], radius: [26, 44], bands: [0xe8a874, 0xd8946a, 0xf0bc88, 0xc98060], top: 0xf6d2a0,
      pyramids: [{ x: -90, y: -14, z: -330, size: 70 }, { x: 150, y: -14, z: -360, size: 48 }] }));
    group.add(mesas({ z: -150, count: 8, seed: 11, width: 520, height: [22, 44], radius: [14, 26] }));
    group.add(mesas({ z: -95, count: 6, seed: 19, width: 380, height: [5, 12], radius: [6, 11], y0: -12, bands: [0xc8703e, 0xb05a34, 0xd8864e, 0x9a4a2c], top: 0xf2c47a }));
    const clouds = cloudField({ count: 7, seed: 31, color: 0xfff6e8, shade: 0xf0c8a0, zRange: [-180, -340], yRange: [40, 80], scale: [16, 30], speed: 0.6 });
    group.add(clouds.mesh);
    const dunes = duneSea({ y: this.waterY });
    group.add(dunes.mesh);
    const dust = createWeather({ kind: 'dust', count: 260, seed: 4 });
    group.add(dust.mesh);
    return { group, update(dt, t, cam, wind) { terrainClock.value = t; clouds.update(dt); dunes.update(dt, t); dust.update(dt, t, cam, wind); } };
  },
};
