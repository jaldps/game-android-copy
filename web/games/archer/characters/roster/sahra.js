// Sahra — Dune Ranger (female). Athletic hourglass desert scout: high swinging ponytail with gold cuffs, brass goggles,
// teal eyes. Owner: Characters specialist.
import { ball, blade, torus, tube, cyl, xf } from '../parts.js';
import vela from './vela.js';

const dy = 0.02;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'sahra', name: 'Sahra', title: 'Dune Ranger', gender: 'f', price: 1400,
  blurb: 'Crosses a desert before lunch. Never lost the trail.',
  stats: { hp: 100, move: 1.12, windResist: 0.1, drawSpeed: 1.0 },
  palette: { skin: 0xb8764a, hair: 0x23140e, hair2: 0x5a3220, eyes: 0x22c0a8, lips: 0xb0343e, brow: 0x23140e, gold: 0xf2c14e, brass: 0xc8923a },
  outfits: ['sahra_ranger', 'sahra_nomad', 'sahra_oasis'],
  bow: { wood: 0x8a5a30, trim: 0x18a7a0, grip: 0x3a2418, gem: 0x3ff0d0, length: 0.62 },
  body: {
    ...vela.body,
    legLen: 1.1, thighLen: 0.51, shinLen: 0.51,
    thighR: [0.14, 0.076], shinR: [0.078, 0.045],
    waistY: 1.34, shoulderY: 1.665, shoulderW: 0.235, neckY: 1.75,
    upperArmR: [0.064, 0.048], foreArmR: [0.052, 0.035], deltR: 0.078,
    shape: { bicep: 0.4, tricep: 0.25, fore: 0.45, quad: 0.55, ham: 0.4, calf: 0.7, knee: 0.16 },   // athletic: toned arms, strong legs
    headR: 0.228,
    torso: vela.body.torso.map(([y, rx, rz, zo]) => [y + dy, rx * (y > 1.4 ? 1.07 : y > 1.25 ? 1.04 : 1), rz, zo]),
    extras: vela.body.extras.map(([b, p, r, c]) => [b, [p[0], p[1] + dy, p[2]], r, c]),
  },
  face: { eyeSize: 0.245, eyeTall: 1.08, eyeSpread: 0.38, eyeY: 0.02, lashes: true, browThick: 0.32, browY: 1.62, browTilt: -0.2, chin: true, jawX: 0.68, jawY: 0.5, jawZ: 0.7, nose: 0.9, smirk: 0.18 },
  build(ctx) {
    const { B, C } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
    // sleek pulled-back hair
    let g = ball(R * 1.05, R * 1.02, R * 1.07, 20); g.translate(hx, hy + R * 0.14, hz - R * 0.1);
    ctx.add('head', g, (x, y, z) => (Math.sin(x * 160) > 0.6 ? C.hair2 : C.hair), { rough: 0.35 });
    for (const s of [1, -1]) {   // face-framing locks
      g = blade(R * 1.2, R * 0.28, R * 0.14, 0.15); xf(g, [hx + s * R * 0.7, hy + R * 0.55, hz + R * 0.42], [Math.PI - 0.12, 0, s * 0.18]); ctx.add('head', g, C.hair, { rough: 0.35 });
    }
    // high ponytail: root on the head, tail soft-bound head -> chest so it swings with the torso
    g = torus(R * 0.24, R * 0.09, 14, 6); xf(g, [hx, hy + R * 0.85, hz - R * 0.62], [0.9, 0, 0]); ctx.add('head', g, C.gold, { metal: 0.9, rough: 0.25 });
    const y0 = hy + R * 0.95;
    g = tube([[hx, y0, hz - R * 0.7], [hx, hy + R * 0.95, hz - R * 1.3], [hx + R * 0.1, hy + R * 0.1, hz - R * 1.8], [hx + R * 0.05, hy - R * 1.2, hz - R * 1.9], [hx, hy - R * 2.5, hz - R * 1.55]], R * 0.36, R * 0.08, 24, 10);
    const bind = (x, y) => ['head', 'chest', ss(hy + R * 0.6, hy - R * 1.2, y)];
    ctx.add('head', g, (x, y, z) => (Math.sin(y * 70 + x * 30) > 0.3 ? C.hair2 : C.hair), { rough: 0.35, bind });
    g = torus(R * 0.2, R * 0.07, 14, 6); xf(g, [hx + R * 0.09, hy - R * 0.3, hz - R * 1.86], [Math.PI / 2, 0, 0]); ctx.add('head', g, C.gold, { metal: 0.9, rough: 0.25, bind });
    // brass goggles pushed up on the forehead
    if (!C.hatOn) {
      g = torus(R * 1.03, R * 0.06, 28, 6); xf(g, [hx, hy + R * 0.52, hz - R * 0.04], [Math.PI / 2 - 0.35, 0, 0]); ctx.add('head', g, 0x4a2a18, { rough: 0.7 });
      for (const s of [1, -1]) {
        g = cyl(R * 0.23, R * 0.26, R * 0.2, 14); xf(g, [hx + s * R * 0.34, hy + R * 0.78, hz + R * 0.72], [1.05, 0, 0]); ctx.add('head', g, C.brass, { metal: 0.85, rough: 0.3 });
        g = ball(R * 0.19, R * 0.19, R * 0.07, 12); xf(g, [hx + s * R * 0.34, hy + R * 0.87, hz + R * 0.8], [1.05, 0, 0]); ctx.add('head', g, 0x6ff0e0, { metal: 0.3, rough: 0.1, emissive: 0.25 });
      }
    }
    // gold hoops
    for (const s of [1, -1]) { g = torus(R * 0.16, R * 0.03, 14, 6); xf(g, [hx + s * R * 0.93, hy - R * 0.45, hz], [0, Math.PI / 2, 0]); ctx.add('head', g, C.gold, { metal: 0.9, rough: 0.25 }); }
  },
};
