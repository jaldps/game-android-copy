// Kaito's outfits (owner: Characters specialist).
import { ball, box, cyl, torus, blade, dome, xf, fabric, tint, stripes, drape } from '../parts.js';
import { GOLD, skirt, latheAt, hatProfile, straw } from './kit.js';

/** Lower-face cloth mask. */
function mask(ctx, color) {
  const { B } = ctx, [hx, hy, hz] = ctx.headPos(), R = B.headR;
  // snug to the jaw (the nose tip pushes a little bump through it), with horizontal cloth folds
  ctx.add('head', xf(ball(R * 0.87, R * 0.56, R * 0.88, 22), [hx, hy - R * 0.5, hz + R * 0.07]),
    (x, y) => tint(color, (0.86 + 0.2 * Math.max(0, (y - hy + R) / R)) * (Math.sin(y * 260) > 0.7 ? 0.85 : 1)), { rough: 0.7 });
}
/** Ninjato across the back, hilt over the right shoulder. */
function sword(ctx, wrap) {
  ctx.add('chest', xf(box(0.055, 0.66, 0.03, 0.012), [0.02, 1.36, -0.165], [0, 0, 0.62]), 0x1d1f2e, { rough: 0.3 });
  ctx.add('chest', xf(torus(0.04, 0.012, 12, 6), [-0.17, 1.63, -0.165], [Math.PI / 2, 0, 0.62]), GOLD, { metal: 0.9, rough: 0.3 });
  ctx.add('chest', xf(cyl(0.022, 0.022, 0.2, 8), [-0.23, 1.71, -0.165], [0, 0, 0.62]), stripes(wrap, 0x1d1f2e, 0.025, 0.55), { rough: 0.6 });
}

export default {
  kaito_shinobi: {
    id: 'kaito_shinobi', char: 'kaito', name: 'Night Shinobi', type: 'leathers', price: 0,
    perkText: '+30% headshot, +15% direct-hit damage', mods: { headshot: 0.3, direct: 0.15 },
    colors: { top: 0x2c3456, bottom: 0x232a46, boots: 0x181b2c, wrap: 0xd9d0bc, sash: 0xe0303c, mask: 0xc8222e, gloves: 0x232a46, handsGloved: 1 },
    bow: { wood: 0x1d1f2e, trim: 0xe0303c, grip: 0xd9d0bc },
    build(ctx) {
      const { B, C } = ctx;
      const gi = fabric(C.top, 0.08);
      const lapel = (x, y, z) => (z > 0.02 && y > 1.3 && Math.abs(x + (1.7 - y) * 0.42 - 0.02) < 0.022 ? 0x55648f : gi(x, y, z));
      ctx.torsoShell(0.93, 1.69, lapel, 0.014, { rough: 0.65 });
      ctx.torsoShell(1.19, 1.29, fabric(C.sash, 0.06), 0.03, { rough: 0.6 });
      ctx.add('spine', xf(ball(0.055, 0.05, 0.045, 10), [-0.13, 1.24, 0.1]), C.sash, { rough: 0.6 });
      for (const r of [-0.2, 0.15]) ctx.add('hips', xf(drape(0.06, 0.05, 0.3, 0.015), [-0.14, 1.22, 0.1], [0.05, 0, r]), C.sash, { rough: 0.6 });
      const pants = fabric(C.bottom, 0.07);
      ctx.torsoShell(0.86, 1.2, pants, 0.02, { rough: 0.7 });
      ctx.limbShell('thigh', -0.16, 1.0, pants, 0.03, { flare: 0.012, rough: 0.7 });
      ctx.limbShell('shin', 0.0, 0.95, stripes(C.wrap, tint(C.wrap, 0.78), 0.035, 0.6), 0.016, { rough: 0.8 });
      ctx.limbShell('shin', 0.9, 1.0, C.boots, 0.02);
      ctx.limbShell('upperArm', -0.05, 0.62, fabric(C.top, 0.08), 0.022, { rough: 0.65 });
      ctx.limbShell('foreArm', 0.12, 0.95, stripes(C.wrap, tint(C.wrap, 0.78), 0.03, 0.6), 0.012, { rough: 0.8 });
      mask(ctx, C.mask);
      // red hachimaki headband with a steel plate
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(torus(R * 1.02, R * 0.08, 28, 6), [hx, hy + R * 0.48, hz - R * 0.04], [Math.PI / 2 - 0.1, 0, 0]), C.sash, { rough: 0.6 });
      ctx.add('head', xf(box(R * 0.62, R * 0.24, R * 0.06, 0.01), [hx, hy + R * 0.53, hz + R * 0.99], [-0.12, 0, 0]), (x, y) => (Math.abs(x - hx) < R * 0.04 ? 0x55606e : 0xc8d2de), { metal: 0.85, rough: 0.25 });
      for (const r of [-0.3, 0.25]) ctx.add('head', xf(drape(R * 0.22, R * 0.16, R * 1.4, 0.012, 0, 0.2), [hx, hy + R * 0.5, hz - R * 1.0], [0.5, r, r]), C.sash, { rough: 0.6 });
      sword(ctx, C.wrap);
    },
  },
  kaito_oni: {
    id: 'kaito_oni', char: 'kaito', name: 'Oni Lacquer Armor', type: 'armor', price: 1300,
    perkText: '+20 max HP, -30% knockback, -12% move', mods: { hp: 20, knockback: -0.3, move: -0.12 },
    colors: { top: 0x1f2238, bottom: 0x1f2238, boots: 0x161828, lac: 0xc4222e, lac2: 0x7a1420, trim: GOLD, cord: 0x2a62d0, scarf: 0x2a62d0, scarf2: 0x5a9aff, hatOn: 1 },
    bow: { wood: 0x161828, trim: GOLD, grip: 0xc4222e },
    build(ctx) {
      const { B, J, C } = ctx, LQ = { metal: 0.25, rough: 0.22 };
      const lam = (p = 0.055) => (x, y, z) => { const f = ((y / p) % 1 + 1) % 1; return f < 0.14 ? C.cord : tint(Math.floor(y / p) % 2 ? C.lac : tint(C.lac, 0.86), 0.92 + 0.15 * Math.max(0, z) / 0.2); };
      ctx.torsoShell(0.88, 1.69, fabric(C.top), 0.012);
      ctx.torsoShell(1.08, 1.6, lam(), 0.034, LQ);                                         // do (cuirass)
      ctx.torsoShell(1.58, 1.64, C.trim, 0.04, { metal: 0.85, rough: 0.3 });
      skirt(ctx, 1.1, 0.74, [0.2, 0.15], [0.27, 0.21], (x, y, z) => (Math.abs(Math.sin(Math.atan2(x, z) * 3)) < 0.08 ? 0x10121e : lam(0.07)(x, y, z)), { n: 6, rough: 0.22, metal: 0.25 });
      for (const s of ['L', 'R']) {                                                        // sode (shoulder plates)
        const p = J['upperArm' + s], sg = s === 'L' ? 1 : -1;
        ctx.add('upperArm' + s, xf(box(0.05, 0.28, 0.24, 0.015), [p[0] + sg * 0.1, p[1] - 0.1, p[2]], [0, 0, sg * 0.22]), lam(0.06), LQ);
      }
      ctx.limbShell('upperArm', 0.3, 1.0, C.top, 0.014);
      ctx.limbShell('foreArm', 0.08, 0.95, C.lac2, 0.02, { ...LQ, flare: 0.012 });
      ctx.limbShell('foreArm', 0.4, 0.46, C.trim, 0.028, { metal: 0.85, rough: 0.3 });
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom), 0.025);
      ctx.limbShell('shin', 0.05, 0.9, lam(0.05), 0.022, LQ);
      // kabuto: lacquered bowl with ribs, flared neck guard, golden crescent
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(dome(R * 1.12, R * 1.04, R * 1.15, 1.32, 24), [hx, hy + R * 0.14, hz - R * 0.04]), (x, y, z) => (Math.abs(Math.sin(Math.atan2(x - hx, z - hz) * 8)) < 0.12 ? C.trim : tint(C.lac2, 0.85 + 0.3 * (y - hy) / R)), LQ);
      ctx.add('head', latheAt([[R * 1.08, 0.0], [R * 1.5, -R * 0.45], [R * 1.42, -R * 0.5], [R * 1.0, -0.02]], [hx, hy + R * 0.38, hz - R * 0.05], [0, 0, 0], 26, 1.3, Math.PI * 2 - 2.6), lam(0.04), LQ);
      ctx.add('head', xf(torus(R * 0.62, R * 0.07, 20, 6, Math.PI), [hx, hy + R * 1.0, hz + R * 0.95], [-0.25, 0, Math.PI]), C.trim, { metal: 0.9, rough: 0.2 });
      ctx.add('head', xf(ball(R * 0.13, R * 0.13, R * 0.08, 10), [hx, hy + R * 0.62, hz + R * 1.08]), 0xff4a4a, { emissive: 0.5, rough: 0.2 });
    },
  },
  kaito_monk: {
    id: 'kaito_monk', char: 'kaito', name: 'Wandering Monk', type: 'robes', price: 1000,
    perkText: '25% wind resistance, longer aim guide', mods: { windResist: 0.25, preview: 0.5 },
    colors: { top: 0xf2901e, bottom: 0xf2901e, boots: 0xc8a070, robe2: 0x9a2a2a, strawC: 0xe8c878, beads: 0x6a3a1e, hatOn: 1 },
    bow: { wood: 0x6a3a1e, trim: 0x9a2a2a, grip: 0xe8c878 },
    build(ctx) {
      const { B, C } = ctx, robe = fabric(C.top, 0.08);
      const sash = (x, y, z) => (Math.abs(x * 0.95 - (y - 1.4)) < 0.055 ? C.robe2 : robe(x, y, z));
      ctx.torsoShell(0.93, 1.69, sash, 0.016, { rough: 0.7 });
      ctx.torsoShell(1.18, 1.24, C.robe2, 0.032, { rough: 0.6 });
      skirt(ctx, 1.2, 0.3, [0.2, 0.16], [0.33, 0.27], (x, y, z) => (y < 0.38 ? C.robe2 : tint(C.top, 0.8 + 0.25 * (y - 0.3) / 0.9)), { n: 9, pow: 1.2, rough: 0.7, back: 0.04 });
      ctx.limbShell('upperArm', -0.05, 1.0, robe, 0.03, { rough: 0.7 });
      ctx.limbShell('foreArm', 0.0, 0.72, robe, 0.03, { flare: 0.07, rough: 0.7 });
      ctx.limbShell('foreArm', 0.68, 0.74, C.robe2, 0.1, { rough: 0.6 });
      ctx.limbShell('thigh', -0.16, 1.0, tint(C.top, 0.95), 0.02, { rough: 0.7 });          // trousers under the robe
      ctx.limbShell('shin', 0.0, 0.75, tint(C.top, 0.8), 0.02, { rough: 0.7 });
      ctx.limbShell('shin', 0.75, 1.0, stripes(0xe8dcc0, 0xc8a070, 0.03), 0.01);
      // prayer beads
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, x = Math.sin(a) * 0.19, z = Math.cos(a) * 0.15 + 0.02, y = 1.66 - (Math.cos(a) + 1) * 0.1;
        ctx.add('chest', xf(ball(i === 0 ? 0.04 : 0.026, i === 0 ? 0.04 : 0.026, i === 0 ? 0.04 : 0.026, 8), [x, y, z]), i === 0 ? 0xc4222e : C.beads, { rough: 0.4 });
      }
      // kasa straw hat
      const [hx, hy, hz] = ctx.headPos(), R = B.headR, hy0 = hy + R * 0.66;
      ctx.add('head', latheAt([[0.0, -0.005], [R * 2.45, -0.005], [R * 2.47, 0.022], [R * 0.25, R * 1.0], [0.0, R * 1.02]], [hx, hy0, hz - R * 0.05], [-0.08, 0, 0], 32), straw(C.strawC, hx, hz), { rough: 0.85 });
      ctx.add('head', xf(ball(R * 0.12, R * 0.08, R * 0.12, 8), [hx, hy0 + R * 1.02, hz - R * 0.12]), C.robe2);
      for (const s of [1, -1]) ctx.add('head', xf(cyl(0.006, 0.006, R * 1.25, 4), [hx + s * R * 0.78, hy - R * 0.05, hz + R * 0.2], [0, 0, s * 0.42]), 0xf4ead0);
    },
  },
};
