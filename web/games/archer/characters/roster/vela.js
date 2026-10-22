// Vela — Wildwood Huntress (female). Stylized hourglass pin-up proportions, big red hair. Owner: Characters specialist.
import { ball, blade, box, xf, torus } from '../parts.js';

export default {
  id: 'vela', name: 'Vela', title: 'Wildwood Huntress', gender: 'f', price: 0,
  blurb: 'Light on her feet and quick on the draw.',
  stats: { hp: 95, move: 1.08, windResist: 0.0, drawSpeed: 1.1 },
  palette: { skin: 0xf3c19d, hair: 0xd23a1f, hair2: 0xff7a3a, eyes: 0x2fae66, lips: 0xd02a48, brow: 0x8a2716 },
  outfits: ['vela_leathers', 'vela_robes'],
  bow: { wood: 0x6b3f22, trim: 0xf4c35a, gem: 0x4dffa0 },
  body: {
    legLen: 1.08, hipW: 0.1, thighLen: 0.5, shinLen: 0.5,
    thighR: [0.128, 0.07], shinR: [0.072, 0.044], calf: 0.058,
    footL: 0.22, footW: 0.09, footH: 0.09,
    waistY: 1.32, shoulderY: 1.645, shoulderW: 0.215, neckY: 1.73, neckLen: 0.1, neckR: 0.05,
    upperArm: 0.3, foreArm: 0.28, upperArmR: [0.056, 0.044], foreArmR: [0.045, 0.034], deltR: 0.066, handR: 0.046,
    headR: 0.19, bodyR: 0.2,
    torso: [
      [0.975, 0.07, 0.06, 0], [1.03, 0.19, 0.125, -0.012], [1.11, 0.215, 0.135, -0.014], [1.2, 0.18, 0.118, -0.004],
      [1.29, 0.13, 0.095, 0.004], [1.34, 0.124, 0.093, 0.006], [1.42, 0.142, 0.1, 0.01], [1.5, 0.168, 0.11, 0.014],
      [1.58, 0.18, 0.112, 0.01], [1.645, 0.168, 0.102, 0.0], [1.7, 0.13, 0.085, -0.01], [1.745, 0.06, 0.05, -0.005],
    ],
    extras: [
      ['torso', [0.082, 1.555, 0.072], [0.083, 0.078, 0.072], 'top'], ['torso', [-0.082, 1.555, 0.072], [0.083, 0.078, 0.072], 'top'],
      ['torso', [0.085, 1.09, -0.06], [0.1, 0.1, 0.09], 'bottom'], ['torso', [-0.085, 1.09, -0.06], [0.1, 0.1, 0.09], 'bottom'],
    ],
  },
  face: { eyeSize: 0.235, eyeTall: 1.22, eyeSpread: 0.37, eyeY: 0.04, lashes: true, browThick: 0.26, browY: 1.75, browTilt: -0.08, chin: true, jawX: 0.66, jawY: 0.5, jawZ: 0.7 },
  /** Hair and character-specific extras. ctx: see characters/body.js makeCtx */
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    const hair = C.hair, hair2 = C.hair2;
    const shade = (y) => (y > hy + R * 0.6 ? hair2 : hair);
    // crown volume
    let g = ball(R * 1.12, R * 1.08, R * 1.12, 20); g.translate(hx, hy + R * 0.16, hz - R * 0.12); ctx.add('head', g, shade, { rough: 0.45 });
    // side volumes framing the face
    for (const s of [1, -1]) {
      g = ball(R * 0.5, R * 0.95, R * 0.6, 14); g.translate(hx + s * R * 0.88, hy - R * 0.35, hz - R * 0.18); ctx.add('head', g, hair, { rough: 0.45 });
      g = ball(R * 0.42, R * 0.7, R * 0.5, 12); g.translate(hx + s * R * 0.78, hy - R * 1.05, hz - R * 0.25); ctx.add('head', g, hair, { rough: 0.45 });
    }
    // swooping bangs
    for (let i = 0; i < 4; i++) {
      g = blade(R * 1.0, R * 0.45, R * 0.18, 0.3);
      xf(g, [hx + R * (0.5 - i * 0.32), hy + R * 0.85, hz + R * 0.55], [2.3 - i * 0.05, 0, -1.1 + i * 0.32]);
      ctx.add('head', g, i % 2 ? hair : hair2, { rough: 0.45 });
    }
    // long flowing mane down the back (bound to chest so it follows the torso, not the head yaw)
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) / 3;
      g = blade(R * (3.2 - Math.abs(a) * 0.9), R * 0.62, R * 0.32, 0.22);
      xf(g, [hx + a * R * 0.8, hy + R * 0.3, hz - R * 0.6 - Math.abs(a) * 0.04], [Math.PI + 0.18, 0, a * 0.3]);
      ctx.add('chest', g, i % 2 ? hair : hair2, { rough: 0.45 });
    }
    // big curl at the end of the mane
    g = ball(R * 0.75, R * 0.55, R * 0.45, 14); g.translate(hx, hy - R * 2.7, hz - R * 1.25); ctx.add('chest', g, hair, { rough: 0.45 });
    // earrings
    for (const s of [1, -1]) { g = torus(R * 0.1, R * 0.025, 12, 6); xf(g, [hx + s * R * 0.92, hy - R * 0.38, hz], [0, Math.PI / 2, 0]); ctx.add('head', g, 0xffd25a, { metal: 0.9, rough: 0.25 }); }
  },
};
