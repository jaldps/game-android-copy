// Brock — Gym-Bro Marksman (male). Hugely muscular V-taper: boulder shoulders, slabs of pec, big arms with a real
// bicep/forearm belly, trap mounds up to the ears, square stubbled jaw, textured quiff. Owner: Characters specialist.
import { ball, blade, xf, tint, mix } from '../parts.js';

export default {
  id: 'brock', name: 'Brock', title: 'Gym-Bro Marksman', gender: 'm', price: 0,
  blurb: 'Never skips arm day. Shrugs off hits.',
  stats: { hp: 112, move: 0.92, windResist: 0.12, drawSpeed: 0.95 },
  palette: { skin: 0xc98a64, hair: 0x2b1a10, hair2: 0x5a3820, eyes: 0x3a78d8, brow: 0x24150c, stubble: 0x8a5a40 },
  outfits: ['brock_beach', 'brock_iron', 'brock_brawler'],
  bow: { wood: 0x3b2a22, trim: 0xd8dde6, grip: 0xc23b2b, length: 0.64 },
  body: {
    legLen: 0.98, hipW: 0.14, thighLen: 0.46, shinLen: 0.44,
    thighR: [0.172, 0.104], shinR: [0.106, 0.064],
    footL: 0.29, footW: 0.13, footH: 0.11,
    waistY: 1.22, shoulderY: 1.555, shoulderW: 0.43, neckY: 1.66, neckLen: 0.07, neckR: 0.13,
    upperArm: 0.34, foreArm: 0.31, upperArmR: [0.128, 0.094], foreArmR: [0.11, 0.066], deltR: 0.165, handR: 0.084,
    shape: { bicep: 0.75, tricep: 0.45, fore: 0.7, quad: 0.7, ham: 0.4, calf: 0.75, knee: 0.14 },
    headR: 0.218, bodyR: 0.32,
    torso: [
      [0.86, 0.1, 0.08, 0], [0.93, 0.2, 0.15, 0], [1.02, 0.212, 0.152, -0.005], [1.12, 0.198, 0.148, 0.01],
      [1.22, 0.212, 0.156, 0.02], [1.32, 0.29, 0.178, 0.025], [1.42, 0.375, 0.2, 0.03], [1.5, 0.415, 0.208, 0.02],
      [1.57, 0.4, 0.19, 0], [1.63, 0.3, 0.155, -0.02], [1.69, 0.14, 0.115, -0.01],
    ],
    extras: [
      ['torso', [0.145, 1.465, 0.13], [0.175, 0.125, 0.09], 'top', [0, 0, 0.12]], ['torso', [-0.145, 1.465, 0.13], [0.175, 0.125, 0.09], 'top', [0, 0, -0.12]],
      ['torso', [0.3, 1.36, -0.03], [0.1, 0.19, 0.13], 'top'], ['torso', [-0.3, 1.36, -0.03], [0.1, 0.19, 0.13], 'top'],
      ['torso', [0.16, 1.63, -0.02], [0.17, 0.1, 0.12], 'skin', [0, 0, 0.35]], ['torso', [-0.16, 1.63, -0.02], [0.17, 0.1, 0.12], 'skin', [0, 0, -0.35]],
    ],
  },
  face: { eyeSize: 0.21, eyeTall: 1.0, eyeSpread: 0.37, eyeY: 0.06, browThick: 0.62, browY: 1.32, browTilt: -0.22, skullX: 0.94,
    jawX: 0.9, jawY: 0.62, jawZ: 0.82, chin: true, mouthW: 0.5, smirk: 0.14, grin: true, nose: 1.2 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    // short faded sides (painted onto a snug cap) + a textured quiff swept up at the front
    const fade = (x, y, z) => (y > hy + R * 0.45 ? C.hair : mix(C.skin, C.hair, 0.55 + 0.45 * Math.max(0, (y - hy + R * 0.1) / (R * 0.55))));
    let g = ball(R * 0.97, R * 0.86, R * 1.0, 24); g.translate(hx, hy + R * 0.16, hz - R * 0.05);
    ctx.add('head', g, (x, y, z) => (z > hz + R * 0.55 && y < hy + R * 0.62 ? C.skin : fade(x, y, z)), { rough: 0.8 });
    if (!C.hatOn) {
      g = ball(R * 0.9, R * 0.42, R * 0.92, 22); g.translate(hx, hy + R * 0.78, hz - R * 0.02); ctx.add('head', g, (x, y) => (y > hy + R * 1.0 ? C.hair2 : C.hair), { rough: 0.7 });
      for (let i = 0; i < 5; i++) {
        const a = (i - 2) / 2;
        g = blade(R * 0.75, R * 0.34, R * 0.16, -0.25);
        xf(g, [hx + a * R * 0.48, hy + R * 0.82, hz + R * 0.55], [-0.55 + Math.abs(a) * 0.15, 0, -a * 0.35]);
        ctx.add('head', g, i % 2 ? C.hair : C.hair2, { rough: 0.7 });
      }
    }
    // gold neck chain
    g = ball(R * 0.12, R * 0.12, R * 0.08, 8); g.translate(0, B.neckY - 0.13, 0.2); ctx.add('chest', g, 0xffd25a, { metal: 0.95, rough: 0.2 });
  },
};
