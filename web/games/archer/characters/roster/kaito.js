// Kaito — Shadow Fang (male). Lean masked ninja: spiky ink-black hair, topknot, long crimson scarf. Owner: Characters specialist.
import { ball, blade, torus, xf, drape } from '../parts.js';
import { hairCap } from "../body.js";

export default {
  id: 'kaito', name: 'Kaito', title: 'Shadow Fang', gender: 'm', price: 1500,
  blurb: 'Quick feet, quicker eyes. Never misses a weak spot.',
  stats: { hp: 90, move: 1.15, windResist: 0.05, drawSpeed: 1.06 },
  palette: { skin: 0xe9b58c, hair: 0x1b1626, hair2: 0x3a3058, eyes: 0xe0a22a, brow: 0x1b1626, scarf: 0xe0303c, scarf2: 0xff6a4a },
  outfits: ['kaito_shinobi', 'kaito_oni', 'kaito_monk'],
  bow: { wood: 0x1d1f2e, trim: 0xe0303c, grip: 0xd8d2c4, length: 0.62 },
  body: {
    legLen: 1.04, hipW: 0.11, thighLen: 0.48, shinLen: 0.48,
    thighR: [0.118, 0.07], shinR: [0.074, 0.045],
    footL: 0.24, footW: 0.1, footH: 0.095,
    waistY: 1.3, shoulderY: 1.6, shoulderW: 0.26, neckY: 1.69, neckLen: 0.09, neckR: 0.066,
    upperArm: 0.31, foreArm: 0.29, upperArmR: [0.07, 0.052], foreArmR: [0.06, 0.04], deltR: 0.088, handR: 0.056,
    shape: { bicep: 0.55, tricep: 0.4, fore: 0.6, quad: 0.5, ham: 0.35, calf: 0.6, knee: 0.18 },   // lean, wiry, defined
    headR: 0.225, bodyR: 0.22,
    torso: [
      [0.94, 0.08, 0.07, 0], [1.0, 0.16, 0.12, 0], [1.08, 0.17, 0.122, 0], [1.18, 0.155, 0.115, 0.005],
      [1.28, 0.15, 0.112, 0.01], [1.38, 0.178, 0.12, 0.015], [1.47, 0.22, 0.135, 0.015], [1.54, 0.24, 0.136, 0.01],
      [1.6, 0.22, 0.12, 0], [1.65, 0.15, 0.1, -0.01], [1.71, 0.07, 0.066, -0.005],
    ],
    extras: [['torso', [0.085, 1.47, 0.09], [0.1, 0.07, 0.05], 'top'], ['torso', [-0.085, 1.47, 0.09], [0.1, 0.07, 0.05], 'top']],
  },
  face: { eyeSize: 0.23, eyeTall: 0.9, eyeSpread: 0.37, eyeY: 0.04, browThick: 0.55, browY: 1.3, browTilt: -0.36, jawX: 0.68, jawY: 0.55, jawZ: 0.72, chin: true, mouthW: 0.36, smirk: 0.3, nose: 1.05 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    const hat = !!C.hatOn;                                  // outfits with headgear skip the spikes
    // hair cap
    let g = null; hairCap(ctx, (x, y) => (y > hy + R * 0.85 ? C.hair2 : C.hair), { cover: 1.5, tilt: -0.45 });
    if (!hat) {
      // back-swept spikes
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) / 3;
        g = blade(R * (1.05 - Math.abs(a) * 0.3), R * 0.36, R * 0.22, -0.15);
        xf(g, [hx + a * R * 0.62, hy + R * 0.7, hz - R * 0.05 - Math.abs(a) * R * 0.1], [-0.75 - Math.abs(a) * 0.25, 0, -a * 0.75]);
        ctx.add('head', g, i % 2 ? C.hair : C.hair2, { rough: 0.5 });
      }
      // topknot
      g = ball(R * 0.26, R * 0.3, R * 0.26, 12); g.translate(hx, hy + R * 1.08, hz - R * 0.5); ctx.add('head', g, C.hair, { rough: 0.5 });
      g = torus(R * 0.2, R * 0.06, 14, 6); xf(g, [hx, hy + R * 0.95, hz - R * 0.45], [Math.PI / 2 + 0.5, 0, 0]); ctx.add('head', g, C.scarf, { rough: 0.6 });
      g = blade(R * 0.9, R * 0.3, R * 0.16, 0.3); xf(g, [hx, hy + R * 1.15, hz - R * 0.65], [-2.3, 0, 0]); ctx.add('head', g, C.hair2, { rough: 0.5 });
    }
    // fringe spikes over the forehead
    for (let i = 0; i < 3; i++) {
      const a = (i - 1);
      g = blade(R * 0.62, R * 0.3, R * 0.14, 0.1);
      xf(g, [hx + a * R * 0.42, hy + R * 0.82, hz + R * 0.52], [2.25, 0, a * 0.45 + 0.15]);
      ctx.add('head', g, C.hair, { rough: 0.5 });
    }
    // crimson scarf: wrap + two long trailing tails (identity piece)
    const ny = B.neckY;
    g = torus(B.neckR * 1.55, 0.05, 20, 8); xf(g, [0, ny + 0.015, -0.005], [Math.PI / 2, 0, 0]); ctx.add('neck', g, C.scarf, { rough: 0.7 });
    g = torus(B.neckR * 1.75, 0.045, 20, 8); xf(g, [0, ny - 0.04, 0.0], [Math.PI / 2 + 0.12, 0, 0]); ctx.add('chest', g, C.scarf2, { rough: 0.7 });
    g = ball(0.06, 0.05, 0.05, 10); g.translate(0.07, ny - 0.03, -0.11); ctx.add('chest', g, C.scarf, { rough: 0.7 });
    for (const [sx, len, tw] of [[0.06, 0.95, 0.12], [0.11, 0.75, -0.18]]) {
      g = drape(0.11, 0.08, len, 0.018, 0.0, 0.32, 3, 12); xf(g, [sx, ny - 0.02, -0.12], [0.18, tw, 0.22]);
      ctx.add('chest', g, (x, y) => (y < ny - len + 0.12 ? C.scarf2 : C.scarf), { rough: 0.7 });
    }
  },
};
