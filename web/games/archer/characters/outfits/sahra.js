// Sahra's outfits (owner: Characters specialist).
import { ball, box, torus, dome, xf, fabric, tint, stripes, drape } from '../parts.js';
import { GOLD, METAL, skirt, latheAt, hatProfile, straw } from './kit.js';

/** Teal shemagh wrapped round the neck with a front fold. */
function shemagh(ctx, color) {
  const { B } = ctx, pat = (x, y, z) => (Math.sin(x * 90) * Math.sin(y * 90 + z * 60) > 0.55 ? tint(color, 0.7) : color);
  ctx.add('chest', xf(torus(B.neckR * 2.1, 0.045, 22, 8), [0, B.neckY - 0.01, -0.005], [Math.PI / 2 - 0.15, 0, 0]), pat, { rough: 0.75 });
  ctx.add('chest', xf(drape(0.15, 0.04, 0.2, 0.02, 0.4, -0.05), [0, B.neckY - 0.03, 0.1], [-0.25, 0, 0]), pat, { rough: 0.75 });
}

export default {
  sahra_ranger: {
    id: 'sahra_ranger', char: 'sahra', name: 'Dune Ranger', type: 'leathers', price: 0,
    perkText: '+25% headshot, +20% direct-hit damage', mods: { headshot: 0.25, direct: 0.2 },
    colors: { top: 0x8a5a32, tunic: 0xe4c08a, bottom: 0x6f7c3c, boots: 0x7a4a2a, vest: 0x8a5a32, scarf: 0x18a7a0, belt: 0x4a2a18, wrap: 0xece0c4 },
    build(ctx) {
      const { B, J, C } = ctx;
      ctx.torsoShell(1.18, 1.72, fabric(C.tunic, 0.07), 0.012, { rough: 0.7 });
      ctx.torsoShell(1.38, 1.7, (x, y, z) => (z > 0.07 && Math.abs(x) < 0.012 && Math.sin(y * 150) > -0.2 ? 0xe8c890 : tint(C.vest, 0.88 + 0.25 * Math.max(0, z) / 0.12)), 0.026, { rough: 0.5 });
      ctx.torsoShell(1.17, 1.24, C.belt, 0.03, { rough: 0.5 });
      ctx.add('spine', xf(box(0.06, 0.05, 0.02, 0.01), [0, 1.205, 0.12]), GOLD, METAL);
      for (const s of [1, -1]) ctx.add('hips', xf(box(0.08, 0.09, 0.05, 0.015), [s * 0.2, 1.15, 0.05], [0, 0, s * 0.15]), C.belt, { rough: 0.5 });
      const cargo = fabric(C.bottom, 0.06);
      ctx.torsoShell(0.99, 1.2, cargo, 0.014, { rough: 0.7 });
      ctx.limbShell('thigh', -0.16, 1.0, cargo, 0.018, { rough: 0.7 });
      for (const s of ['L', 'R']) { const t = J['thigh' + s], sg = s === 'L' ? 1 : -1; ctx.add('thigh' + s, xf(box(0.04, 0.11, 0.09, 0.015), [t[0] + sg * 0.115, t[1] - 0.26, t[2] + 0.01]), tint(C.bottom, 0.85), { rough: 0.7 }); }
      ctx.limbShell('shin', 0.0, 0.45, cargo, 0.02, { rough: 0.7 });
      ctx.limbShell('shin', 0.4, 1.0, C.boots, 0.022, { rough: 0.45 });
      ctx.limbShell('shin', 0.38, 0.44, tint(C.boots, 0.7), 0.03, { rough: 0.45 });
      ctx.limbShell('foreArm', 0.3, 0.95, stripes(C.wrap, tint(C.wrap, 0.8), 0.03, 0.6), 0.012, { rough: 0.8 });
      ctx.limbShell('upperArm', 0.2, 0.28, GOLD, 0.014, METAL);
      shemagh(ctx, C.scarf);
      // quiver on the back
      ctx.add('chest', xf(box(0.11, 0.5, 0.08, 0.03), [0.07, 1.42, -0.17], [0.12, 0, -0.45]), tint(C.vest, 0.85), { rough: 0.5 });
      for (let i = 0; i < 3; i++) ctx.add('chest', xf(box(0.025, 0.1, 0.008, 0.004), [0.17 + i * 0.03, 1.69 - i * 0.012, -0.15], [0.12, 0, -0.45]), i === 1 ? 0xffffff : C.scarf);
    },
  },
  sahra_nomad: {
    id: 'sahra_nomad', char: 'sahra', name: 'Mirage Nomad', type: 'robes', price: 1000,
    perkText: '30% wind resistance, longer aim guide', mods: { windResist: 0.3, preview: 0.4 },
    colors: { top: 0xf4efe4, bottom: 0x2a3a8a, boots: 0x8a5a32, robe: 0xf4efe4, robe2: 0x2a3a8a, sash: 0x18a7a0, hatOn: 1 },
    bow: { wood: 0x2a3a8a, trim: GOLD, gem: 0x3ff0d0 },
    build(ctx) {
      const { B, C } = ctx;
      ctx.torsoShell(1.0, 1.72, fabric(C.robe2, 0.06), 0.012, { rough: 0.6 });
      ctx.torsoShell(1.36, 1.72, (x, y, z) => (z > 0.06 && Math.abs(x) < 0.05 ? (Math.abs(Math.abs(x) - 0.045) < 0.008 ? GOLD : fabric(C.robe2, 0.06)(x, y, z)) : fabric(C.robe, 0.05)(x, y, z)), 0.022, { rough: 0.65 });
      ctx.torsoShell(1.2, 1.3, (x, y) => (Math.abs(y - 1.25) < 0.012 ? GOLD : C.sash), 0.026, { rough: 0.55 });
      const hem = (x, y) => (y < 0.13 ? C.robe2 : y < 0.2 ? GOLD : tint(C.robe, 0.8 + 0.22 * Math.min(1, (y - 0.08) / 1.0)));
      skirt(ctx, 1.24, 0.08, [0.235, 0.16], [0.42, 0.34], hem, { n: 12, pow: 1.2, rough: 0.65, back: 0.05 });
      ctx.limbShell('thigh', -0.16, 1.0, tint(C.robe, 0.9), 0.012);                       // leggings match the skirt
      ctx.limbShell('shin', 0.0, 1.0, tint(C.robe, 0.85), 0.014);
      ctx.limbShell('upperArm', -0.05, 1.0, fabric(C.robe, 0.05), 0.014, { rough: 0.65 });
      ctx.limbShell('foreArm', 0.0, 0.85, C.robe, 0.016, { flare: 0.05, rough: 0.65 });
      ctx.limbShell('foreArm', 0.82, 0.88, GOLD, 0.07, METAL);
      // hood framing the face, with a gold-coin headband
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(dome(R * 1.3, R * 1.3, R * 1.3, 2.0, 24), [hx, hy + R * 0.1, hz - R * 0.12], [-0.95, 0, 0]), (x, y, z) => tint(C.robe, 0.8 + 0.2 * Math.max(0, (y - hy) / R)), { rough: 0.65 });
      for (let i = -3; i <= 3; i++) ctx.add('head', xf(ball(R * 0.08, R * 0.08, R * 0.03, 8), [hx + i * R * 0.2, hy + R * (0.6 - Math.abs(i) * 0.05), hz + R * (1.02 - Math.abs(i) * 0.06)], [0, i * 0.15, 0]), GOLD, METAL);
      ctx.add('chest', xf(drape(0.3, 0.36, 0.42, 0.022, 0.6, 0.08), [0, 1.74, -0.1], [0.1, 0, 0]), fabric(C.robe, 0.05), { rough: 0.65 });
    },
  },
  sahra_oasis: {
    id: 'sahra_oasis', char: 'sahra', name: 'Oasis Splash', type: 'swimwear', price: 800,
    perkText: '+28% move gauge, faster turn recovery', mods: { move: 0.28, delay: -0.14 },
    colors: { top: 0x18b8b0, bottom: 0xff7a5a, boots: 0xc89a60, strawC: 0xf0d898, ribbon: 0xff7a5a, hatOn: 1 },
    bow: { wood: 0x8a5a30, trim: 0x18b8b0, gem: 0xffd25a },
    build(ctx) {
      const { B, J, C } = ctx;
      ctx.torsoShell(1.36, 1.7, (x, y) => (y < 1.385 ? 0xffffff : tint(C.top, 0.92 + 0.12 * (y - 1.36) / 0.34)), 0.011, { rough: 0.35 });
      ctx.add('neck', xf(torus(B.neckR * 1.3, 0.012, 18, 6), [0, B.neckY + 0.02, 0.0], [Math.PI / 2 - 0.35, 0, 0]), C.top, { rough: 0.4 });
      const shorts = (x, y, z) => (Math.abs(z) < 0.025 ? 0xffffff : tint(C.bottom, 0.92 + 0.1 * Math.sin(y * 60)));
      ctx.torsoShell(0.99, 1.26, shorts, 0.014, { rough: 0.6 });
      ctx.limbShell('thigh', -0.16, 0.35, shorts, 0.02, { flare: 0.015, rough: 0.6 });
      for (const s of ['L', 'R']) { const f = J['foot' + s]; ctx.add('foot' + s, xf(box(B.footW + 0.012, 0.02, 0.03, 0.008), [f[0], f[1] - B.footH * 0.05, f[2] + B.footL * 0.35]), C.top); }
      ctx.limbShell('foreArm', 0.85, 0.92, GOLD, 0.012, METAL);
      // wide straw sun hat with ribbon
      const [hx, hy, hz] = ctx.headPos(), R = B.headR, y0 = hy + R * 0.55;
      ctx.add('head', latheAt(hatProfile(R * 2.05, R * 1.08, R * 0.62, 0.025, R * 0.08), [hx, y0, hz - R * 0.1], [-0.2, 0, 0.06], 30), straw(C.strawC, hx, hz - R * 0.1), { rough: 0.85 });
      ctx.add('head', xf(torus(R * 1.1, R * 0.09, 30, 6), [hx, y0 + R * 0.12, hz - R * 0.1], [Math.PI / 2 - 0.2, 0.06, 0]), C.ribbon, { rough: 0.6 });
      ctx.add('head', xf(drape(R * 0.3, R * 0.22, R * 1.6, 0.012, 0, 0.3), [hx - R * 0.6, y0 + R * 0.1, hz - R * 1.1], [0.4, 0, -0.2]), C.ribbon, { rough: 0.6 });
    },
  },
};
