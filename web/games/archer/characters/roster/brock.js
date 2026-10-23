// Brock — Gym-Bro Marksman (male). Huge V-taper, small head, flat-top. Owner: Characters specialist.
import { ball, box, xf } from '../parts.js';

export default {
  id: 'brock', name: 'Brock', title: 'Gym-Bro Marksman', gender: 'm', price: 0,
  blurb: 'Never skips arm day. Shrugs off hits.',
  stats: { hp: 112, move: 0.92, windResist: 0.12, drawSpeed: 0.95 },
  palette: { skin: 0xc98a64, hair: 0x2b1a10, hair2: 0x4a2c18, eyes: 0x3a78d8, brow: 0x24150c, stubble: 0xb47a52 },
  outfits: ['brock_beach', 'brock_iron', 'brock_brawler'],
  bow: { wood: 0x3b2a22, trim: 0xd8dde6, grip: 0xc23b2b, length: 0.64 },
  body: {
    legLen: 0.98, hipW: 0.13, thighLen: 0.46, shinLen: 0.44,
    thighR: [0.155, 0.1], shinR: [0.1, 0.066], calf: 0.088,
    footL: 0.28, footW: 0.125, footH: 0.11,
    waistY: 1.22, shoulderY: 1.555, shoulderW: 0.37, neckY: 1.66, neckLen: 0.08, neckR: 0.105,
    upperArm: 0.34, foreArm: 0.31, upperArmR: [0.112, 0.085], foreArmR: [0.092, 0.066], deltR: 0.14, bicep: [0.085, 0.11, 0.09], handR: 0.07,
    headR: 0.185, bodyR: 0.3,
    torso: [
      [0.86, 0.1, 0.08, 0], [0.93, 0.19, 0.14, 0], [1.02, 0.2, 0.145, -0.005], [1.12, 0.19, 0.142, 0.01],
      [1.22, 0.198, 0.148, 0.02], [1.32, 0.24, 0.162, 0.025], [1.42, 0.305, 0.182, 0.025], [1.5, 0.345, 0.19, 0.015],
      [1.57, 0.335, 0.172, 0], [1.63, 0.245, 0.14, -0.02], [1.69, 0.12, 0.1, -0.01],
    ],
    extras: [
      ['torso', [0.13, 1.455, 0.12], [0.155, 0.112, 0.078], 'top'], ['torso', [-0.13, 1.455, 0.12], [0.155, 0.112, 0.078], 'top'],
      ['torso', [0.14, 1.615, -0.03], [0.14, 0.075, 0.11], 'skin'], ['torso', [-0.14, 1.615, -0.03], [0.14, 0.075, 0.11], 'skin'],
    ],
  },
  face: { eyeSize: 0.17, eyeTall: 1.0, eyeSpread: 0.36, eyeY: 0.06, browThick: 0.5, browY: 1.25, browTilt: -0.28, jawX: 0.86, jawY: 0.64, jawZ: 0.8, chin: true, mouthW: 0.4, smirk: 0.16 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    // stubble shell on the jaw
    let g = ball(R * 0.9, R * 0.62, R * 0.8, 16); g.translate(hx, hy - R * 0.5, hz + R * 0.1);
    ctx.add('head', g, (x, y, z) => (z > hz + R * 0.55 && y > hy - R * 0.62 && Math.abs(x - hx) < R * 0.3 ? C.skin : C.stubble), { rough: 0.8 });
    // flat-top with undercut
    if (!C.hatOn) { g = box(R * 1.7, R * 0.75, R * 1.75, R * 0.3); xf(g, [hx, hy + R * 0.72, hz - R * 0.02], [-0.08, 0, 0]); ctx.add('head', g, C.hair, { rough: 0.7 }); }
    g = ball(R * 0.96, R * 0.8, R * 0.98, 18); g.translate(hx, hy + R * 0.12, hz - R * 0.1); ctx.add('head', g, (x, y, z) => (z > hz + R * 0.5 && y < hy + R * 0.5 ? C.skin : C.hair2), { rough: 0.8 });
    // thick neck tendons / traps already in extras; add a neck chain
    g = ball(R * 0.12, R * 0.12, R * 0.12, 8); g.translate(0, B.neckY - 0.12, 0.17); ctx.add('chest', g, 0xffd25a, { metal: 0.95, rough: 0.2 });
  },
};
