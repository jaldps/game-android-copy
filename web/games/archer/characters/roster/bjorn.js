// Bjorn — Stormbeard (male). Barrel-chested viking: huge braided ginger beard, rosy cheeks, short sturdy legs.
// Owner: Characters specialist.
import { ball, blade, torus, tube, xf, tint } from '../parts.js';

export default {
  id: 'bjorn', name: 'Bjorn', title: 'Stormbeard', gender: 'm', price: 1800,
  blurb: 'Built like a longship. Laughs at crosswinds.',
  stats: { hp: 118, move: 0.88, windResist: 0.15, drawSpeed: 0.92 },
  palette: { skin: 0xf2b48c, hair: 0xe0862a, hair2: 0xffb648, eyes: 0x3a8ad8, brow: 0xc0641a, cheek: 0xf28a7a, braid: 0xf2c14e },
  outfits: ['bjorn_raider', 'bjorn_skald', 'bjorn_beach'],
  bow: { wood: 0x5a3a22, trim: 0xc8d2de, grip: 0x8a2a1e, length: 0.66 },
  scale: 1.22,
  body: {
    legLen: 0.9, hipW: 0.14, thighLen: 0.42, shinLen: 0.4,
    thighR: [0.168, 0.108], shinR: [0.11, 0.072],
    footL: 0.29, footW: 0.135, footH: 0.115,
    waistY: 1.2, shoulderY: 1.52, shoulderW: 0.37, neckY: 1.62, neckLen: 0.06, neckR: 0.115,
    upperArm: 0.32, foreArm: 0.3, upperArmR: [0.124, 0.094], foreArmR: [0.108, 0.07], deltR: 0.15, handR: 0.084,
    shape: { bicep: 0.55, tricep: 0.45, fore: 0.65, quad: 0.6, ham: 0.45, calf: 0.7, knee: 0.1, def: 0.7 },   // barrel-chested strongman
    headR: 0.232, bodyR: 0.34,
    torso: [
      [0.8, 0.1, 0.08, 0], [0.87, 0.22, 0.17, 0], [0.96, 0.26, 0.2, 0.02], [1.06, 0.28, 0.23, 0.05], [1.16, 0.285, 0.235, 0.06],
      [1.26, 0.3, 0.24, 0.055], [1.36, 0.335, 0.255, 0.06], [1.45, 0.36, 0.24, 0.04], [1.52, 0.345, 0.205, 0.01], [1.58, 0.25, 0.15, -0.02], [1.64, 0.13, 0.115, -0.01],
    ],
    extras: [['torso', [0.15, 1.585, -0.03], [0.15, 0.08, 0.12], 'skin'], ['torso', [-0.15, 1.585, -0.03], [0.15, 0.08, 0.12], 'skin']],
  },
  face: { eyeSize: 0.21, eyeTall: 1.0, eyeSpread: 0.38, eyeY: 0.1, browThick: 0.62, browY: 1.3, browTilt: -0.2, mouth: false, nose: 1.3, jawX: 0.86, jawY: 0.6, jawZ: 0.8, chin: false, mouthW: 0.4, smirk: 0.05 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    const streak = (x, y, z) => tint(Math.sin(x * 140 + z * 40) > 0.2 ? C.hair : C.hair2, 1 + 0.08 * Math.sin(y * 90));
    // full braided beard that starts BELOW the mouth line (the grin stays visible), darker than the skin
    const beardC = (x, y, z) => tint(streak(x, y, z), 0.82 + 0.2 * Math.max(0, Math.min(1, (y - hy + R * 1.8) / (R * 1.4))));
    let g = ball(R * 0.98, R * 0.8, R * 0.74, 20); g.translate(hx, hy - R * 0.98, hz + R * 0.28); ctx.add('head', g, beardC, { rough: 0.75 });
    for (const s of [1, -1]) { g = ball(R * 0.42, R * 0.55, R * 0.5, 14); g.translate(hx + s * R * 0.62, hy - R * 0.55, hz + R * 0.3); ctx.add('head', g, beardC, { rough: 0.75 }); }   // sideburn bulk
    g = ball(R * 0.62, R * 0.55, R * 0.46, 14); g.translate(hx, hy - R * 1.62, hz + R * 0.48); ctx.add('head', g, beardC, { rough: 0.75 });
    for (const s of [1, -1]) {
      // braids hang on the chest (bound to chest so they never swing through it when the head turns)
      g = tube([[hx + s * R * 0.3, hy - R * 1.6, hz + R * 0.9], [hx + s * R * 0.36, hy - R * 2.05, hz + R * 1.25], [hx + s * R * 0.3, hy - R * 2.5, hz + R * 1.38]], R * 0.17, R * 0.07, 10, 8);
      ctx.add('chest', g, (x, y) => (Math.sin(y * 110) > 0 ? C.hair : C.hair2), { rough: 0.75 });
      g = torus(R * 0.15, R * 0.05, 12, 6); xf(g, [hx + s * R * 0.35, hy - R * 2.05, hz + R * 1.25], [Math.PI / 2 - 0.5, 0, 0]); ctx.add('chest', g, C.braid, { metal: 0.9, rough: 0.25 });
      // walrus moustache: thick lobes from under the nose sweeping out and DOWN past the mouth corners
      const mx = hx + s * R * 0.2, my2 = hy - R * 0.42;
      g = ball(R * 0.26, R * 0.11, R * 0.12, 12); xf(g, [mx, my2, ctx.faceZ(mx, my2) + R * 0.02], [0, s * 0.3, s * -0.35]); ctx.add('head', g, C.hair2, { rough: 0.7 });
      g = blade(R * 0.5, R * 0.14, R * 0.1, 0.1); xf(g, [hx + s * R * 0.38, hy - R * 0.5, ctx.faceZ(hx + s * R * 0.38, hy - R * 0.5) + R * 0.0], [0, 0, s * 2.75]); ctx.add('head', g, C.hair2, { rough: 0.7 });
    }
    // big laughing mouth under the moustache: dark opening, upper teeth, lower lip
    const my = hy - R * 0.6, mz = Math.max(ctx.faceZ(hx, my), hz + R * 1.0);
    g = ball(R * 0.2, R * 0.1, R * 0.05, 14); g.translate(hx, my, mz); ctx.add('head', g, (x, y) => (y > my + R * 0.02 ? 0x3a0e14 : 0x8a2a30), { rough: 0.5, outline: 0 });
    g = ball(R * 0.16, R * 0.032, R * 0.03, 12); g.translate(hx, my + R * 0.05, mz + R * 0.03); ctx.add('head', g, 0xfaf4e6, { rough: 0.3, outline: 0 });
    g = ball(R * 0.17, R * 0.035, R * 0.04, 12); g.translate(hx, my - R * 0.1, mz + R * 0.01); ctx.add('head', g, tint(C.skin, 0.85), { outline: 0 });
    if (!C.hatOn) {
      g = ball(R * 1.03, R * 0.85, R * 1.06, 18); g.translate(hx, hy + R * 0.3, hz - R * 0.12); ctx.add('head', g, streak, { rough: 0.6 });
    }
    // long hair at the back with a central braid (bound to chest so it follows the torso)
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) / 2;
      g = blade(R * (2.0 - Math.abs(a) * 0.5), R * 0.6, R * 0.3, 0.15);
      xf(g, [hx + a * R * 0.72, hy + R * 0.3, hz - R * 0.62], [Math.PI + 0.22, 0, a * 0.28]);
      ctx.add('chest', g, i % 2 ? C.hair : C.hair2, { rough: 0.6 });
    }
  },
};
