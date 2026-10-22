// Sunspire Isles — tropical floating islands over a turquoise sea (owner: Maps specialist).
import * as THREE from 'three';
import { MAT } from '../core/terrain.js';
import { floatingIsland, rect, circle, polygon, tower, wall, stamp } from './shapes.js';
import { skyDome, cloudField, sea, farIslands } from './sky.js';
import { createWeather } from './weather.js';

const HEIGHT_SETS = [[4, 11, 1.5, 12.5, 6], [10.5, 3.5, 8, 2, 11.5], [6, 12.5, 3.5, 9, 2.5], [2.5, 8.5, 12, 4, 10], [11, 6, 2, 13, 4.5]];

export default {
  id: 'sunspire', name: 'Sunspire Isles', subtitle: 'Tropical sky islands', music: 'battle',
  killY: -9.5, waterY: -9.0,
  bounds: { minX: -62, maxX: 62, minY: -12, maxY: 34 },
  palette: { grass: 0x58c43a, grass2: 0xb4f05a, dirt: 0xa86a3a, rock: 0xd9a46a, rock2: 0xb98454, deep: 0x7a4a34, brick: 0xe8d6b0, brick2: 0xc9b088, mortar: 0x9a8668, wood: 0xa86c3c, wood2: 0x7a4a26, sand: 0xf6dc96 },
  lighting: { sun: 0xfff0d2, sunIntensity: 3.3, sunDir: [-0.45, 0.82, 0.55], hemiSky: 0xbfe6ff, hemiGround: 0xb08a5c, hemiIntensity: 1.15, fill: 0xa8dcff, fillIntensity: 0.8, fog: 0xbfe8f6, fogNear: 110, fogFar: 520, exposure: 1.02, saturation: 1.18, contrast: 1.06 },
  sky: { top: 0x2a78e0, mid: 0x6cc0f5, horizon: 0xd8f4ff },

  generate(T, rng) {
    const set = HEIGHT_SETS[Math.floor(rng() * HEIGHT_SETS.length)].slice();
    if (rng() < 0.5) set.reverse();
    const isl = [];
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 22 + (rng() - 0.5) * 5, top = set[i] + (rng() - 0.5) * 1.2, w = 13 + rng() * 5, depth = 7 + rng() * 5;
      isl.push({ x, top, w, depth });
      stamp(T, floatingIsland(x, top, w, depth, i * 7 + Math.floor(rng() * 100)), MAT.ROCK);
    }
    // spawn islands: one of the two outer islands per side, must differ in height
    const L = rng() < 0.5 ? 0 : 1; let R = rng() < 0.5 ? 4 : 3;
    if (Math.abs(isl[L].top - isl[R].top) < 2.5) R = R === 4 ? 3 : 4;
    const sxL = isl[L].x + (rng() - 0.5) * isl[L].w * 0.3, sxR = isl[R].x + (rng() - 0.5) * isl[R].w * 0.3;
    // central brick tower (the main obstacle), with a gate arch
    const mid = isl[2], tx = mid.x + (rng() - 0.5) * mid.w * 0.3, th = 6 + rng() * 2.5;
    for (const s of tower(tx, mid.top - 0.6, 2.6, th, 3)) stamp(T, s, MAT.BRICK);
    stamp(T, rect(tx, mid.top + 0.6, 1.2, 1.6), 0, 'subtract');
    stamp(T, circle(tx, mid.top + 1.4, 0.6), 0, 'subtract');
    // low ruined walls as cover on the spawn islands, on the side facing the enemy
    for (const [k, dir, sx] of [[L, 1, sxL], [R, -1, sxR]]) {
      const I = isl[k], wx = Math.min(I.x + I.w * 0.42, Math.max(I.x - I.w * 0.42, sx + dir * (3.2 + rng() * 1.2)));
      for (const s of wall(wx - 0.8, wx + 0.8, I.top - 0.5, 1.2 + rng() * 0.8, 0.4)) stamp(T, s, MAT.BRICK);
    }
    // wooden bridge between the two islands with the closest heights (not touching spawns' cover)
    let best = null;
    for (let i = 0; i < 4; i++) { const dy = Math.abs(isl[i].top - isl[i + 1].top); if (dy < 4.5 && (!best || dy < best.dy)) best = { i, dy }; }
    if (best) {
      const A = isl[best.i], B = isl[best.i + 1], ax = A.x + A.w * 0.45, bx = B.x - B.w * 0.45;
      const ay = A.top - 0.25, by = B.top - 0.25, sag = 0.8;
      const pts = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(Math.PI * t) * sag]); }
      const poly = pts.concat(pts.slice().reverse().map(([x, y]) => [x, y - 0.45]));
      stamp(T, polygon(poly), MAT.WOOD);
    }
    // small floating rocks in the gaps (obstacles / ricochet bait)
    for (let i = 0; i < 4; i++) {
      const A = isl[i], B = isl[i + 1]; if (rng() < 0.35) continue;
      const gx = (A.x + A.w / 2 + B.x - B.w / 2) / 2, gy = Math.max(A.top, B.top) + 2 + rng() * 5;
      stamp(T, floatingIsland(gx, gy, 2.6 + rng() * 1.8, 2 + rng() * 2, 100 + i, { lump: 0.2, shoulder: 0.6 }), MAT.ROCK);
    }
    return { spawns: [{ x: sxL }, { x: sxR }, { x: isl[L === 0 ? 1 : 0].x }, { x: isl[R === 4 ? 3 : 4].x }], isl, tower: { x: tx, top: mid.top - 0.6 + th + 1.2 } };
  },

  decorate(ctx) {
    const { rng, props, terrain: T, gen } = ctx, isl = gen.isl;
    const place = (type, x, z, o = {}) => { const y = T.topAt(x); if (!isNaN(y) && T.matAt(x, y - 0.3) !== MAT.BRICK) props.add(type, x, y - 0.05, { z, ...o }); };
    for (const I of isl) {
      const n = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < n; k++) place('palm', I.x + (rng() - 0.5) * I.w * 0.7, -1.4 - rng() * 0.8, { scale: 0.9 + rng() * 0.35, rotY: rng() * 6 });
      for (let k = 0; k < 3; k++) place('bush', I.x + (rng() - 0.5) * I.w * 0.8, -1.8 + rng() * 0.6, { scale: 0.7 + rng() * 0.5, rotY: rng() * 6 });
      for (let k = 0; k < 2; k++) place('rock', I.x + (rng() - 0.5) * I.w * 0.8, (rng() - 0.5) * 2.5, { scale: 0.5 + rng() * 0.6, rotY: rng() * 6 });
      for (let k = 0; k < 6; k++) place('grass', I.x + (rng() - 0.5) * I.w * 0.85, 1.4 + rng() * 0.9, { scale: 0.8 + rng() * 0.5, rotY: rng() * 6 });
      for (let k = 0; k < 3; k++) place('flowers', I.x + (rng() - 0.5) * I.w * 0.8, 0.9 + rng() * 1.2, { scale: 0.9 + rng() * 0.4 });
    }
    const hutIsland = isl[Math.floor(rng() * 5)];
    place('hut', hutIsland.x + (rng() - 0.5) * 3, -1.6, { scale: 1.0, rotY: (rng() - 0.5) * 0.6 });
    props.add('flag', gen.tower.x, gen.tower.top - 0.05, { z: -0.4, scale: 1.1 });
  },

  buildBackdrop(ctx) {
    const group = new THREE.Group();
    group.add(skyDome({ ...this.sky, sunDir: [-0.5, 0.42, -1] }));
    const clouds = cloudField({ count: 18, seed: 3, zRange: [-110, -300], yRange: [-6, 50], scale: [12, 26] });
    const low = cloudField({ count: 10, seed: 8, zRange: [-30, -80], yRange: [-10, -5], scale: [5, 9], shade: 0xb8d8f0, speed: 0.6 });
    group.add(clouds.mesh, low.mesh);
    group.add(farIslands({ count: 10, seed: 7, top: 0x58c43a, rock: 0xc99060, zRange: [-60, -170], yRange: [-2, 26] }));
    const water = sea({ y: this.waterY, shallow: 0x3cd6dc, deep: 0x1f86c8 });
    group.add(water.mesh);
    const motes = createWeather({ kind: 'motes', count: 120, seed: 5 });
    group.add(motes.mesh);
    return {
      group,
      update(dt, t, cam, wind) { clouds.update(dt); low.update(dt); water.update(dt, t); motes.update(dt, t, cam, wind); },
    };
  },
};
