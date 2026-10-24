// Nyx's outfits (owner: Characters specialist).
import { ball, box, cone, torus, blade, xf, fabric, tint, drape } from '../parts.js';
import { GOLD, METAL, skirt, latheAt, hatProfile } from './kit.js';


export default {
  nyx_robes: {
    id: 'nyx_robes', char: 'nyx', name: 'Starfall Gown', type: 'robes', price: 0,
    perkText: '25% wind resistance, much longer aim guide', mods: { windResist: 0.25, preview: 0.7 },
    colors: { top: 0x6a32c0, bottom: 0x3a1a78, boots: 0x24123e, robe: 0x6a32c0, robe2: 0x2c145e, hat: 0x4a2a96, band: 0x5ff2e0, hatOn: 1 },
    bow: { wood: 0x2a1648, trim: GOLD, gem: 0x5ff2e0 },
    build(ctx) {
      const { B, C } = ctx;
      const bod = fabric(C.robe, 0.07);
      ctx.torsoShell(1.18, 1.72, (x, y, z) => (Math.abs(y - 1.2) < 0.015 || (z > 0.06 && Math.abs(x) < 0.012 && y < 1.5) ? GOLD : bod(x, y, z)), 0.012, { rough: 0.5 });
      ctx.torsoShell(1.29, 1.35, GOLD, 0.022, METAL);
      // floor-length gown with a starry hem
      skirt(ctx, 1.25, 0.03, [0.2, 0.15], [0.48, 0.4], (x, y, z) => (y < 0.1 ? GOLD : y < 0.16 ? C.robe2 : tint(C.robe, 0.62 + 0.42 * Math.min(1, (y - 0.03) / 1.1))), { n: 12, pow: 1.25, rough: 0.5, back: 0.06 });
      ctx.limbShell('thigh', -0.16, 1.0, tint(C.robe, 0.95), 0.012);                                   // leggings under the gown
      ctx.limbShell('shin', 0.0, 1.0, C.boots, 0.014);
      // bell sleeves
      ctx.limbShell('upperArm', 0.1, 1.0, bod, 0.012, { rough: 0.5 });
      ctx.limbShell('foreArm', 0.0, 0.9, C.robe2, 0.014, { flare: 0.08, rough: 0.5 });
      ctx.limbShell('foreArm', 0.86, 0.92, GOLD, 0.095, METAL);
      // standing collar + cape
      ctx.add('chest', xf(drape(0.3, 0.46, 0.26, 0.02, 0.55, 0), [0, 1.69, -0.08], [-0.3, 0, Math.PI]), (x, y) => (y > 1.9 ? GOLD : C.robe2), { rough: 0.5 });
      ctx.add('chest', xf(drape(0.4, 0.78, 1.6, 0.03, 0.32, 0.2), [0, 1.7, -0.14], [0.08, 0, 0]), (x, y) => (y < 0.22 ? GOLD : tint(C.robe2, 0.8 + 0.25 * (y - 0.2))), { rough: 0.55 });
      ctx.add('chest', xf(ball(0.035, 0.035, 0.02, 8), [0, 1.66, 0.13]), C.band, { emissive: 0.9, rough: 0.2 });
      // the hat: huge brim, tall crown with a bent tip, glowing band + buckle
      const [hx, hy, hz] = ctx.headPos(), R = B.headR, y0 = hy + R * 0.72;
      const H = R * 2.6, cr = R * 1.08, bw = R * 2.2;
      const g = latheAt([[0, -0.004], [bw, -0.004], [bw * 1.01, 0.016], [bw * 0.9, 0.03], [cr * 1.04, 0.04], [cr, 0.07], [cr * 0.62, H * 0.42], [cr * 0.3, H * 0.75], [cr * 0.1, H * 0.95], [0, H]], [0, 0, 0], [0, 0, 0], 30);
      const p = g.attributes.position, yb = R * 1.0;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > yb) { const t = (y - yb) / (R * 1.6); p.setZ(i, p.getZ(i) - t * t * R * 1.2); p.setY(i, y - t * t * R * 0.35); } }
      g.computeVertexNormals(); xf(g, [hx, y0, hz - R * 0.08], [-0.14, 0, 0.1]);
      ctx.add('head', g, (x, y) => (y < y0 + 0.03 ? tint(C.hat, 0.8) : tint(C.hat, 0.9 + 0.35 * Math.min(1, (y - y0) / (R * 2.2)))), { rough: 0.5 });
      ctx.add('head', xf(torus(R * 1.09, R * 0.1, 30, 6), [hx, y0 + R * 0.13, hz - R * 0.08], [Math.PI / 2 - 0.14, 0.1, 0]), C.band, { emissive: 0.35, rough: 0.4 });
      ctx.add('head', xf(box(R * 0.32, R * 0.3, R * 0.08, 0.015), [hx, y0 + R * 0.14, hz + R * 1.04], [-0.14, 0, 0]), GOLD, METAL);
    },
  },
  nyx_shadow: {
    id: 'nyx_shadow', char: 'nyx', name: 'Shadow Weaver', type: 'leathers', price: 1100,
    perkText: '+20% headshot, +30% direct-hit damage', mods: { headshot: 0.2, direct: 0.3 },
    colors: { top: 0x2a1e40, bottom: 0x1e162e, boots: 0x140e20, leather: 0x2a1e40, rune: 0x5ff2e0, corset: 0x7a3cd0, gloves: 0x140e20, handsGloved: 1 },
    bow: { wood: 0x140e20, trim: 0x5ff2e0, gem: 0x5ff2e0 },
    build(ctx) {
      const { B, C } = ctx;
      const lea = (x, y, z) => (z > 0.05 && Math.abs(Math.abs(x) - 0.07) < 0.008 && y > 1.45 ? C.rune : tint(C.leather, 0.88 + 0.3 * Math.max(0, z) / 0.15));
      ctx.torsoShell(1.2, 1.74, lea, 0.013, { rough: 0.3 });
      ctx.torsoShell(1.27, 1.43, (x, y, z) => (z > 0.07 && Math.abs(x) < 0.025 && Math.sin(y * 160) > 0 ? 0xe0d0ff : tint(C.corset, 0.9 + 0.2 * Math.max(0, z) / 0.12)), 0.026, { rough: 0.35 });
      ctx.torsoShell(1.0, 1.28, fabric(C.bottom, 0.05), 0.012, { rough: 0.4 });
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom, 0.05), 0.012, { rough: 0.4 });
      ctx.limbShell('shin', 0.0, 1.0, C.boots, 0.016, { rough: 0.25 });
      ctx.limbShell('thigh', 0.45, 1.02, C.boots, 0.02, { rough: 0.25 });
      ctx.limbShell('thigh', 0.43, 0.48, C.rune, 0.026, { emissive: 0.6 });
      ctx.limbShell('upperArm', -0.05, 1.0, lea, 0.012, { rough: 0.3 });
      ctx.limbShell('foreArm', 0.0, 1.0, C.leather, 0.014, { rough: 0.3 });
      ctx.limbShell('foreArm', 0.55, 0.6, C.rune, 0.022, { emissive: 0.7 });
      // hooded capelet (hood down)
      ctx.add('chest', xf(drape(0.36, 0.5, 0.62, 0.025, 0.4, 0.12), [0, 1.73, -0.12], [0.1, 0, 0]), (x, y) => (y < 1.16 ? C.rune : tint(C.leather, 0.9)), { rough: 0.4 });
      ctx.add('chest', xf(ball(0.17, 0.11, 0.1, 14), [0, 1.74, -0.17]), tint(C.leather, 0.85), { rough: 0.4 });
      // rune circlet
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(torus(R * 1.04, R * 0.035, 28, 6), [hx, hy + R * 0.48, hz], [Math.PI / 2 - 0.3, 0, 0]), 0xc8c0e0, METAL);
      ctx.add('head', xf(cone(R * 0.09, R * 0.3, 6), [hx, hy + R * 0.78, hz + R * 0.98], [-0.3, 0, 0]), C.rune, { emissive: 0.8, rough: 0.2 });
    },
  },
  nyx_crystal: {
    id: 'nyx_crystal', char: 'nyx', name: 'Amethyst Aegis', type: 'armor', price: 1300,
    perkText: '+22 max HP, -30% knockback, -12% move', mods: { hp: 22, knockback: -0.3, move: -0.12 },
    colors: { top: 0x9a6ae0, bottom: 0x2a1a48, boots: 0x7a4ac8, plate: 0x9a6ae0, plate2: 0x5a2aa8, crystal: 0xd8b8ff, silver: 0xe8ecff },
    bow: { wood: 0x5a2aa8, trim: 0xe8ecff, gem: 0xd8b8ff },
    build(ctx) {
      const { B, J, C } = ctx, PM = { metal: 0.75, rough: 0.22 };
      const facet = (base) => (x, y, z) => tint(base, 0.82 + 0.32 * (Math.sin(Math.atan2(x, z) * 5) > 0 ? 1 : 0.55) * (0.7 + 0.3 * Math.max(0, z) / 0.15));
      ctx.torsoShell(1.0, 1.74, fabric(C.bottom, 0.05), 0.011);
      ctx.torsoShell(1.36, 1.7, facet(C.plate), 0.024, PM);
      ctx.torsoShell(1.2, 1.37, (x, y) => (Math.abs(((y * 25) % 1)) < 0.2 ? C.silver : C.plate2), 0.02, PM);
      skirt(ctx, 1.22, 0.86, [0.225, 0.155], [0.29, 0.22], (x, y, z) => (y < 0.9 ? C.silver : facet(C.plate2)(x, y, z)), { n: 6, metal: 0.75, rough: 0.22 });
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom, 0.05), 0.012);
      ctx.limbShell('shin', 0.0, 1.0, facet(C.plate), 0.02, PM);
      ctx.limbShell('foreArm', 0.15, 0.95, facet(C.plate), 0.016, { ...PM, flare: 0.015 });
      for (const s of ['L', 'R']) {                       // crystal pauldrons + knee gems
        const p = J['upperArm' + s], sg = s === 'L' ? 1 : -1;
        ctx.add('upperArm' + s, xf(ball(0.1, 0.075, 0.1, 14), [p[0] + sg * 0.03, p[1] + 0.02, p[2]], [0, 0, -sg * 0.4]), C.plate2, PM);
        for (let i = 0; i < 3; i++) ctx.add('upperArm' + s, xf(cone(0.03 - i * 0.004, 0.16 - i * 0.03, 5), [p[0] + sg * (0.06 + i * 0.03), p[1] + 0.08, p[2] + (i - 1) * 0.05], [(i - 1) * 0.3, 0, -sg * (0.5 + i * 0.25)]), C.crystal, { emissive: 0.35, rough: 0.15, metal: 0.2 });
        const k = J['shin' + s]; ctx.add('shin' + s, xf(cone(0.035, 0.1, 5), [k[0], k[1] + 0.02, k[2] + 0.075], [0.4, 0, 0]), C.crystal, { emissive: 0.35, rough: 0.15 });
      }
      ctx.add('chest', xf(cone(0.04, 0.11, 5), [0, 1.59, 0.16], [Math.PI, 0, 0]), C.crystal, { emissive: 0.5, rough: 0.15 });
      // crystal tiara
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(torus(R * 1.06, R * 0.05, 28, 6), [hx, hy + R * 0.5, hz], [Math.PI / 2 - 0.3, 0, 0]), C.silver, METAL);
      for (let i = -2; i <= 2; i++) ctx.add('head', xf(cone(R * 0.11, R * (0.75 - Math.abs(i) * 0.18), 5), [hx + i * R * 0.3, hy + R * (0.9 - Math.abs(i) * 0.06), hz + R * (0.9 - Math.abs(i) * 0.1)], [-0.35, 0, -i * 0.25]), C.crystal, { emissive: 0.45, rough: 0.15 });
    },
  },
};
