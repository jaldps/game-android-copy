// Frostpeak Keep — snowy cliffs, a frozen chasm and stone fortifications at golden hour (owner: Maps specialist).
import * as THREE from 'three';
import { MAT } from '../core/terrain.js';
import { groundMass, rect, ellipse, polygon, tower, wall, stamp, floatingIsland } from './shapes.js';
import { skyDome, cloudField, sea, ridge, mountains, castle, hazeLayer } from './sky.js';
import { dragonSkeleton } from './landmarks.js';
import { createWeather } from './weather.js';
import { fbm1 } from '../core/util.js';

export default {
  id: 'frostpeak', name: 'Frostpeak Keep', subtitle: 'Snowbound fortress cliffs', music: 'battle',
  killY: -9.5, waterY: -9.2,
  bounds: { minX: -62, maxX: 62, minY: -12, maxY: 34 },
  palette: { grass: 0xe8f2ff, grass2: 0xffffff, dirt: 0x8a8fa8, rock: 0x8d9bbb, rock2: 0x73809f, deep: 0x3b4060, brick: 0xb8b0a8, brick2: 0x988f88, mortar: 0x6e6862, wood: 0x8a5a36, wood2: 0x5e3c22, ice: 0xbfefff, snow: 1 },
  lighting: { sun: 0xffc690, sunIntensity: 3.0, sunDir: [-0.62, 0.55, 0.56], hemiSky: 0xb8c8ff, hemiGround: 0x7a7098, hemiIntensity: 1.2, fill: 0x9fb0ff, fillIntensity: 1.0, fog: 0xd8c8e8, fogNear: 90, fogFar: 460, exposure: 1.0, saturation: 1.12, contrast: 1.05, warmth: [1.04, 1.0, 1.0] },
  sky: { top: 0x3a4a9a, mid: 0xb08ac8, horizon: 0xffc8a0 },

  generate(T, rng) {
    const s = Math.floor(rng() * 1000);
    const hR = 3.5 + rng() * 2.5, hL = hR + 4.5 + rng() * 2.5, hM = 1.5 + rng() * 2.5;
    const flip = rng() < 0.5;
    const A = flip ? hR : hL, C = flip ? hL : hR;
    const gap1 = -18 + (rng() - 0.5) * 4, gap2 = 17 + (rng() - 0.5) * 4;
    // three massifs separated by chasms down to the icy water
    stamp(T, groundMass(-60, gap1 - 3, (x) => A + (fbm1(x * 0.12, s) - 0.5) * 2.2 - Math.max(0, x - (gap1 - 9)) * 0.35, -15), MAT.ROCK);
    stamp(T, groundMass(gap1 + 3, gap2 - 3, (x) => hM + (fbm1(x * 0.15, s + 3) - 0.5) * 2.5 + Math.cos((x - (gap1 + gap2) / 2) * 0.12) * 1.5, -15), MAT.ROCK);
    stamp(T, groundMass(gap2 + 3, 60, (x) => C + (fbm1(x * 0.12, s + 6) - 0.5) * 2.2 - Math.max(0, (gap2 + 9) - x) * 0.35, -15), MAT.ROCK);
    // cave arch through the middle hill
    stamp(T, ellipse((gap1 + gap2) / 2 + (rng() - 0.5) * 6, hM - 3.2, 2.6, 1.6), 0, 'subtract');
    // ice bridge spanning one chasm
    const gx = rng() < 0.5 ? gap1 : gap2;
    const leftTop = T.topAt(gx - 4), rightTop = T.topAt(gx + 4);
    if (!isNaN(leftTop) && !isNaN(rightTop)) {
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([gx - 4.5 + 9 * t, leftTop + (rightTop - leftTop) * t + Math.sin(Math.PI * t) * 1.2 - 0.2]); }
      stamp(T, polygon(pts.concat(pts.slice().reverse().map(([x, y]) => [x, y - 0.55]))), MAT.ICE);
    }
    // floating ice chunk above the other chasm
    const ox = gx === gap1 ? gap2 : gap1;
    stamp(T, floatingIsland(ox, Math.max(A, C) + 3 + rng() * 3, 3.5, 2.5, s + 11, { lump: 0.2, shoulder: 0.5 }), MAT.ICE);
    // fortress: tall tower + wall on the high side, ruined wall on the low side
    const sxL = -40 + (rng() - 0.5) * 6, sxR = 40 + (rng() - 0.5) * 6;
    const tL = T.topAt(-52), tR = T.topAt(52);
    for (const sh of tower(-52, tL - 0.5, 3.0, 7 + rng() * 2, 3)) stamp(T, sh, MAT.BRICK);
    for (const sh of tower(52, tR - 0.5, 3.0, 6 + rng() * 2, 3)) stamp(T, sh, MAT.BRICK);
    const wl = T.topAt(sxL + 4), wr = T.topAt(sxR - 4);
    for (const sh of wall(sxL + 3.2, sxL + 5.0, wl - 0.4, 1.6, 0.45)) stamp(T, sh, MAT.BRICK);
    for (const sh of wall(sxR - 5.0, sxR - 3.2, wr - 0.4, 1.4, 0.45)) stamp(T, sh, MAT.BRICK);
    // a wooden scaffold platform on the middle hill
    const mx = (gap1 + gap2) / 2 + (rng() < 0.5 ? -6 : 6), mt = T.topAt(mx);
    stamp(T, rect(mx, mt + 3.2, 4.2, 0.45), MAT.WOOD);
    stamp(T, rect(mx - 1.7, mt + 1.5, 0.35, 3.2), MAT.WOOD); stamp(T, rect(mx + 1.7, mt + 1.5, 0.35, 3.2), MAT.WOOD);
    return { spawns: [{ x: sxL }, { x: sxR }, { x: -28 }, { x: 28 }], g: { gap1, gap2, sxL, sxR, mx, mt } };
  },

  decorate(ctx) {
    const { rng, props, terrain: T, gen } = ctx, G = gen.g;
    const place = (type, x, z, o = {}) => { const y = T.topAt(x); if (!isNaN(y) && y > -6 && T.matAt(x, y - 0.3) === MAT.ROCK) props.add(type, x, y - 0.05, { z, ...o }); };
    for (let x = -58; x < 58; x += 1.6 + rng() * 1.8) {
      const r = rng();
      if (r < 0.4) place('pine', x, -1.2 - rng() * 1.4, { scale: 0.8 + rng() * 0.7, rotY: rng() * 6 });
      else if (r < 0.62) place('snowrock', x, (rng() - 0.5) * 3, { scale: 0.5 + rng() * 0.7, rotY: rng() * 6 });
      else if (r < 0.7) place('crystal', x, -1.0 - rng() * 1.0, { scale: 0.6 + rng() * 0.5, rotY: rng() * 6 });
    }
    place('brazier', G.sxL + 2.2, -1.0); place('brazier', G.sxR - 2.2, -1.0);
    place('banner', G.sxL - 3, -1.6); place('banner', G.sxR + 3, -1.6, { rotY: Math.PI });
    for (let k = 0; k < 3; k++) place('crystal', (rng() - 0.5) * 30, -1.3 + rng() * 2.6, { scale: 0.7 + rng() * 0.6, rotY: rng() * 6 });
    place('crate', G.sxL - 1.5, -1.5, { rotY: 0.3 }); place('crate', G.sxR + 1.6, -1.4, { rotY: -0.4 });
  },

  buildBackdrop(ctx) {
    const group = new THREE.Group();
    group.add(skyDome({ ...this.sky, sun: 0xffd8a8, sunDir: [-0.7, 0.12, -1], sunSize: 1.6, stars: 0.6 }));
    group.add(ridge({ z: -260, y0: -10, height: 70, peaks: 12, seed: 4, color: 0x8a86c0, cap: 0xf4e8ff, capLine: 0.55 }));
    group.add(mountains({ z: -170, count: 10, seed: 9, width: 560, height: [45, 80], radius: [30, 48], rock: 0x6f78b0, rock2: 0x8c90c8, capLine: 0.5 }));
    group.add(mountains({ z: -95, count: 12, seed: 13, width: 380, height: [18, 34], radius: [14, 24], rock: 0x58648f, rock2: 0x75809f, capLine: 0.58 }));
    group.add(hazeLayer({ z: -215, y0: -12, height: 70, color: 0xe8e0ff, alpha: 0.55 }));
    group.add(hazeLayer({ z: -130, y0: -12, height: 40, color: 0xe0e8ff, alpha: 0.4 }));
    const dragon = dragonSkeleton({ y: this.waterY, z: -86, scale: 1.05 });
    group.add(dragon.mesh);
    group.add(castle({ x: 46, y: 2, z: -160, scale: 0.75 }));
    group.add(castle({ x: -120, y: 6, z: -210, scale: 0.6 }));
    const clouds = cloudField({ count: 12, seed: 21, color: 0xffe8f0, shade: 0xa898c8, zRange: [-140, -320], yRange: [20, 70], scale: [14, 28], speed: 0.8 });
    group.add(clouds.mesh);
    const water = sea({ y: this.waterY, shallow: 0x5aa8c8, deep: 0x2a5a88, ice: 0.85 });
    group.add(water.mesh);
    const snow = createWeather({ kind: 'snow', count: 700, seed: 2 });
    group.add(snow.mesh);
    return { group, update(dt, t, cam, wind) { clouds.update(dt); water.update(dt, t); snow.update(dt, t, cam, wind); } };
  },
};
