// Vela — Wildwood Huntress (female). Glamorous stylized hourglass in the classic animated pin-up tradition (long legs,
// cinched waist, big voluminous red hair) — tasteful, never explicit. Owner: Characters specialist.
import { ball, blade, tube, xf, torus, tint } from '../parts.js';

export default {
  id: 'vela', name: 'Vela', title: 'Wildwood Huntress', gender: 'f', price: 0,
  blurb: 'Light on her feet and quick on the draw.',
  stats: { hp: 95, move: 1.08, windResist: 0.0, drawSpeed: 1.1 },
  palette: { skin: 0xf3c19d, hair: 0xd23a1f, hair2: 0xff7a3a, eyes: 0x2fae66, lips: 0xd02a48, brow: 0x8a2716 },
  outfits: ['vela_leathers', 'vela_robes', 'vela_lagoon'],
  bow: { wood: 0x6b3f22, trim: 0xf4c35a, gem: 0x4dffa0 },
  body: {
    legLen: 1.08, hipW: 0.105, thighLen: 0.5, shinLen: 0.5,
    thighR: [0.138, 0.072], shinR: [0.074, 0.042],
    footL: 0.22, footW: 0.09, footH: 0.09,
    waistY: 1.32, shoulderY: 1.645, shoulderW: 0.225, neckY: 1.73, neckLen: 0.1, neckR: 0.052,
    upperArm: 0.3, foreArm: 0.28, upperArmR: [0.06, 0.046], foreArmR: [0.048, 0.033], deltR: 0.07, handR: 0.05,
    shape: { bicep: 0.15, tricep: 0.1, fore: 0.25, quad: 0.3, ham: 0.35, calf: 0.6, knee: 0.16 },
    headR: 0.235, bodyR: 0.2,
    torso: [
      [0.975, 0.07, 0.06, 0], [1.03, 0.2, 0.13, -0.012], [1.11, 0.226, 0.14, -0.014], [1.2, 0.188, 0.122, -0.004],
      [1.29, 0.128, 0.094, 0.004], [1.34, 0.118, 0.09, 0.006], [1.42, 0.14, 0.1, 0.01], [1.5, 0.17, 0.11, 0.014],
      [1.58, 0.184, 0.112, 0.01], [1.645, 0.172, 0.102, 0.0], [1.7, 0.13, 0.085, -0.01], [1.745, 0.06, 0.05, -0.005],
    ],
    extras: [
      ['torso', [0.084, 1.552, 0.074], [0.088, 0.082, 0.074], 'top'], ['torso', [-0.084, 1.552, 0.074], [0.088, 0.082, 0.074], 'top'],
      ['torso', [0.088, 1.09, -0.065], [0.105, 0.105, 0.09], 'bottom'], ['torso', [-0.088, 1.09, -0.065], [0.105, 0.105, 0.09], 'bottom'],
    ],
  },
  face: { eyeSize: 0.255, eyeTall: 1.2, eyeSpread: 0.38, eyeY: 0.02, lashes: true, browThick: 0.26, browY: 1.72, browTilt: -0.1, chin: true,
    jawX: 0.66, jawY: 0.5, jawZ: 0.7, nose: 0.85, smirk: 0.12 },
  /** Hair and character-specific extras. ctx: see characters/body.js makeCtx */
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    const hair = C.hair, hair2 = C.hair2;
    // toon gloss: a bright band across the crown + darker underside
    const gloss = (x, y, z) => { const b = Math.abs(y - (hy + R * 0.55 - 0.18 * Math.abs(x - hx))); return b < R * 0.07 ? tint(hair2, 1.25) : y > hy + R * 0.2 ? hair2 : hair; };
    // crown volume (big hair) with a side part
    let g = ball(R * 1.16, R * 1.12, R * 1.15, 26); g.translate(hx, hy + R * 0.2, hz - R * 0.14); ctx.add('head', g, gloss, { rough: 0.4 });
    g = ball(R * 0.75, R * 0.55, R * 0.7, 16); g.translate(hx - R * 0.42, hy + R * 0.95, hz + R * 0.05); ctx.add('head', g, gloss, { rough: 0.4 });
    // side volumes framing the face: big soft waves down to the shoulders
    for (const s of [1, -1]) {
      g = ball(R * 0.55, R * 0.95, R * 0.62, 16); g.translate(hx + s * R * 0.9, hy - R * 0.3, hz - R * 0.12); ctx.add('head', g, hair, { rough: 0.45 });
      g = tube([[hx + s * R * 0.95, hy - R * 0.4, hz + R * 0.05], [hx + s * R * 1.15, hy - R * 1.1, hz + R * 0.05], [hx + s * R * 0.95, hy - R * 1.7, hz + R * 0.1], [hx + s * R * 1.05, hy - R * 2.1, hz - R * 0.05]], R * 0.42, R * 0.2, 14, 10);
      ctx.add('chest', g, (x, y) => (Math.sin(y * 40) > 0.6 ? hair2 : hair), { rough: 0.45 });
    }
    // swooping side-swept bangs
    for (let i = 0; i < 5; i++) {
      g = blade(R * 1.05, R * 0.46, R * 0.2, 0.3);
      xf(g, [hx + R * (0.55 - i * 0.28), hy + R * 0.9, hz + R * 0.55], [2.3 - i * 0.04, 0, -1.15 + i * 0.28]);
      ctx.add('head', g, i % 2 ? hair : hair2, { rough: 0.45 });
    }
    // long, wavy mane down the back (bound to chest so it follows the torso, not the head yaw)
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) / 4, len = 3.0 - Math.abs(a) * 0.8, w = Math.sin(i * 1.7) * 0.25;
      g = tube([[hx + a * R * 0.85, hy + R * 0.4, hz - R * 0.7], [hx + a * R * 1.15 + w * R, hy - R * 0.6, hz - R * 1.05], [hx + a * R * 1.0 - w * R, hy - R * (0.6 + len * 0.5), hz - R * 1.15],
        [hx + a * R * 1.2 + w * R, hy - R * (0.4 + len), hz - R * 1.0]], R * 0.42, R * 0.14, 16, 8);
      ctx.add('chest', g, (x, y) => (Math.sin(y * 34 + i) > 0.55 ? hair2 : hair), { rough: 0.45 });
    }
    // big curls at the ends of the mane
    for (const s of [1, -1, 0]) { g = ball(R * 0.5, R * 0.42, R * 0.4, 14); g.translate(hx + s * R * 0.75, hy - R * 2.75 + Math.abs(s) * R * 0.25, hz - R * 1.05); ctx.add('chest', g, hair, { rough: 0.45 }); }
    // earrings
    for (const s of [1, -1]) { g = torus(R * 0.1, R * 0.025, 12, 6); xf(g, [hx + s * R * 0.92, hy - R * 0.4, hz], [0, Math.PI / 2, 0]); ctx.add('head', g, 0xffd25a, { metal: 0.9, rough: 0.25 }); }
  },
};
