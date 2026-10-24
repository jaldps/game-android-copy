// Nyx — Starfall Witch (female). Tall glamorous sorceress: huge violet-black hair with a silver streak, violet eyes.
// Owner: Characters specialist.
import { ball, blade, xf } from '../parts.js';
import vela from './vela.js';

const dy = 0.04;
const shift = (rows, k = 1) => rows.map(([y, rx, rz, zo]) => [y + dy, rx * k, rz * k, zo]);

export default {
  id: 'nyx', name: 'Nyx', title: 'Starfall Witch', gender: 'f', price: 1600,
  blurb: 'Reads the wind like a spellbook.',
  stats: { hp: 92, move: 1.0, windResist: 0.12, drawSpeed: 1.0 },
  palette: { skin: 0xf7d2bc, hair: 0x2c1850, hair2: 0x6a3cc0, streak: 0xe8ecff, eyes: 0xb04aff, lips: 0xa01e5e, brow: 0x2c1850, glow: 0x5ff2e0 },
  outfits: ['nyx_robes', 'nyx_shadow', 'nyx_crystal'],
  bow: { wood: 0x2a1648, trim: 0xd8c0ff, grip: 0x5ff2e0, gem: 0x5ff2e0, length: 0.62 },
  body: {
    ...vela.body,
    legLen: 1.12, thighLen: 0.52, shinLen: 0.52,
    thighR: [0.13, 0.068], shinR: [0.07, 0.04], upperArmR: [0.056, 0.043], foreArmR: [0.045, 0.031], shoulderW: 0.215,
    shape: { ...vela.body.shape, quad: 0.25, calf: 0.5 }, headR: 0.228,
    waistY: 1.36, shoulderY: 1.685, neckY: 1.77,
    torso: shift(vela.body.torso),
    extras: vela.body.extras.map(([b, p, r, c]) => [b, [p[0], p[1] + dy, p[2]], r, c]),
  },
  face: { eyeSize: 0.25, eyeTall: 1.08, eyeSpread: 0.37, eyeY: 0.02, lashes: true, browThick: 0.24, browY: 1.72, browTilt: 0.16, chin: true, jawX: 0.62, jawY: 0.52, jawZ: 0.7, nose: 0.8, smirk: 0.2 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    // toon gloss band across the crown so the near-black hair reads as a shape, not a hole
    const shade = (x, y) => { const b = Math.abs(y - (hy + R * 0.5 - 0.15 * Math.abs(x - hx))); return b < R * 0.08 ? C.streak : b < R * 0.2 || y > hy + R * 0.7 ? C.hair2 : C.hair; };
    // crown volume (big hair)
    let g = ball(R * 1.18, R * 1.14, R * 1.16, 20); g.translate(hx, hy + R * 0.2, hz - R * 0.16); ctx.add('head', g, shade, { rough: 0.4 });
    for (const s of [1, -1]) {
      g = ball(R * 0.55, R * 1.05, R * 0.66, 14); g.translate(hx + s * R * 0.92, hy - R * 0.35, hz - R * 0.24); ctx.add('head', g, C.hair, { rough: 0.4 });
    }
    // side-swept fringe + one silver streak lock framing the face
    for (let i = 0; i < 4; i++) {
      g = blade(R * 1.05, R * 0.46, R * 0.18, 0.28);
      xf(g, [hx + R * (0.55 - i * 0.34), hy + R * 0.92, hz + R * 0.5], [2.35 - i * 0.04, 0, -1.25 + i * 0.3]);
      ctx.add('head', g, i === 0 ? C.streak : i % 2 ? C.hair : C.hair2, { rough: 0.4 });
    }
    g = blade(R * 1.5, R * 0.36, R * 0.16, 0.25); xf(g, [hx + R * 0.82, hy + R * 0.2, hz + R * 0.3], [Math.PI - 0.12, 0, -0.12]); ctx.add('head', g, C.streak, { rough: 0.4 });
    // long straight mane to the waist (bound to chest)
    for (let i = 0; i < 9; i++) {
      const a = (i - 4) / 4;
      g = blade(R * (4.0 - Math.abs(a) * 1.3), R * 0.6, R * 0.3, 0.16);
      xf(g, [hx + a * R * 0.95, hy + R * 0.25, hz - R * 0.72 - Math.abs(a) * 0.03], [Math.PI + 0.12, 0, a * 0.22]);
      ctx.add('chest', g, i % 2 ? C.hair : C.hair2, { rough: 0.4 });
    }
    // star earrings
    for (const s of [1, -1]) { g = ball(R * 0.1, R * 0.1, R * 0.04, 6); xf(g, [hx + s * R * 0.93, hy - R * 0.45, hz], [0, 0, 0.78]); ctx.add('head', g, C.glow, { emissive: 0.9, rough: 0.2 }); }
  },
};
