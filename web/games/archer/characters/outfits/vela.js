// Vela's outfits (owner: Characters specialist).
import { ball, box, cyl, torus, blade, xf, fabric, tint } from '../parts.js';
import { loft } from '../body.js';
import { GOLD as gold, skirt } from './kit.js';

export default {
  vela_leathers: {
    id: 'vela_leathers', char: 'vela', name: 'Wildwood Leathers', type: 'leathers', price: 0,
    perkText: '+25% headshot & direct-hit damage', mods: { headshot: 0.25, direct: 0.25 },
    colors: { top: 0x2f9a52, bottom: 0x7a4a2e, boots: 0xa8683a, belt: 0x5a3420 },
    build(ctx) {
      const { J, C } = ctx;
      ctx.torsoShell(1.36, 1.655, fabric(C.top, 0.08), 0.012, { rough: 0.55 });   // laced corset top
      ctx.torsoShell(1.395, 1.405, 0xe8c070, 0.024);                               // trim lines
      ctx.torsoShell(1.6, 1.61, 0xe8c070, 0.02);
      ctx.torsoShell(1.235, 1.3, C.belt, 0.022, { rough: 0.5 });                   // belt
      ctx.add('spine', xf(box(0.07, 0.06, 0.03, 0.01), [0, 1.265, 0.115]), gold, { metal: 0.9, rough: 0.25 });
      ctx.torsoShell(0.97, 1.24, fabric(C.bottom, 0.06), 0.012, { rough: 0.5 });   // leggings
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom, 0.06), 0.012, { rough: 0.5 });
      ctx.limbShell('shin', 0.0, 1.0, C.boots, 0.016, { rough: 0.45 });            // tall boots
      ctx.limbShell('thigh', 0.86, 1.02, tint(C.boots, 0.85), 0.02, { rough: 0.45 }); // boot cuff over the knee
      ctx.limbShell('foreArm', 0.25, 0.92, 0x6b3a22, 0.012, { flare: 0.012 });     // bracers
      ctx.limbShell('foreArm', 0.28, 0.33, gold, 0.02, { metal: 0.9, rough: 0.3 });
      // shoulder leaf pauldron (left = bow arm)
      const ua = J.upperArmL;
      ctx.add('upperArmL', xf(ball(0.085, 0.05, 0.09, 12), [ua[0] + 0.02, ua[1] + 0.03, ua[2]], [0, 0, -0.5]), 0x3e9a55, { rough: 0.5 });
      // quiver on the back
      const q = cyl(0.06, 0.05, 0.5, 12); xf(q, [-0.06, 1.45, -0.16], [0.15, 0, 0.5]); ctx.add('chest', q, 0x6b3a22);
      for (let i = 0; i < 3; i++) ctx.add('chest', xf(blade(0.12, 0.035, 0.012), [0.06 + i * 0.03, 1.7 - i * 0.01, -0.12 - i * 0.015], [0.15, 0, 0.5 + i * 0.1]), i === 1 ? 0xffffff : 0xe24a3a);
      ctx.add('chest', xf(cyl(0.012, 0.012, 0.72, 6), [-0.02, 1.42, -0.14], [0.15, 0, 0.5]), 0x6b3a22);
    },
  },
  vela_robes: {
    id: 'vela_robes', char: 'vela', name: 'Starweave Robes', type: 'robes', price: 900,
    perkText: '30% wind resistance, longer aim guide', mods: { windResist: 0.3, preview: 0.6 },
    colors: { top: 0x5a2fb0, bottom: 0x5a2fb0, boots: 0x2a1840, robe: 0x5a2fb0, robe2: 0x3a1c80 },
    bow: { wood: 0x2a1a50, trim: gold, gem: 0xc89bff },
    build(ctx) {
      const { B, C } = ctx;
      const robe = (x, y, z) => (Math.sin(x * 70) * Math.sin(y * 55) * Math.sin(z * 60) > 0.82 ? 0xffe9a0 : tint(C.robe, 0.85 + 0.25 * Math.min(1, (y - 0.3) / 1.2)));
      ctx.torsoShell(0.97, 1.69, fabric(C.robe, 0.07), 0.013, { rough: 0.6 });
      ctx.torsoShell(1.28, 1.33, gold, 0.026, { metal: 0.8, rough: 0.3 });             // sash
      const rows = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, y = 1.12 - t * 0.78; rows.push([y, 0.22 + t * 0.14, 0.15 + t * 0.12, -0.01 - t * 0.02]); }
      ctx.add('hips', loft(rows.reverse(), 26, true), (x, y, z) => (y < 0.42 ? gold : (z > 0.12 && Math.abs(x) < 0.03 ? C.robe2 : robe(x, y, z))), { rough: 0.6 });
      ctx.limbShell('upperArm', -0.05, 1.0, C.robe, 0.016, { rough: 0.6 });
      ctx.limbShell('foreArm', 0.0, 0.85, C.robe, 0.02, { flare: 0.05, rough: 0.6 });
      ctx.limbShell('foreArm', 0.8, 0.86, gold, 0.072, { metal: 0.8, rough: 0.3 });
      ctx.limbShell('thigh', -0.16, 1.0, C.robe2, 0.01);
      ctx.limbShell('shin', 0.3, 1.0, C.boots, 0.014);
      const cap = [];
      for (let i = 0; i <= 5; i++) { const t = i / 5; cap.push([1.6 + t * 0.16, 0.26 - t * 0.17, 0.17 - t * 0.09, -0.02]); }
      ctx.add('chest', loft(cap, 26, true), (x, y) => (y < 1.62 ? gold : 0x2a1660), { rough: 0.5, bind: ctx.torsoBind });
      ctx.add('chest', xf(ball(0.04, 0.04, 0.02, 8), [0, 1.62, 0.14]), 0xbff2ff, { emissive: 0.8, rough: 0.2 });
      const [hx, hy, hz] = ctx.headPos();
      ctx.add('head', xf(torus(B.headR * 1.02, 0.01, 24, 6), [hx, hy + B.headR * 0.42, hz], [Math.PI / 2 - 0.25, 0, 0]), gold, { metal: 0.9, rough: 0.25 });
      ctx.add('head', xf(ball(0.025, 0.03, 0.015, 8), [hx, hy + B.headR * 0.62, hz + B.headR * 0.95]), 0xc89bff, { emissive: 0.9 });
    },
  },
  vela_lagoon: {
    id: 'vela_lagoon', char: 'vela', name: 'Lagoon Sport', type: 'swimwear', price: 800,
    perkText: '+28% move gauge, faster turn recovery', mods: { move: 0.28, delay: -0.12 },
    colors: { top: 0xff5a6e, bottom: 0xff5a6e, boots: 0xd8a868, sarong: 0x1fb8c8, sarong2: 0xffe36a },
    bow: { wood: 0x8a5a30, trim: 0x1fb8c8, gem: 0xff8a9a },
    build(ctx) {
      const { B, C } = ctx;
      // sporty one-piece with white racing stripes down the sides
      const suit = (x, y, z) => (Math.abs(z) < 0.03 && y > 1.0 ? 0xffffff : tint(C.top, 0.92 + 0.12 * Math.min(1, (y - 1.0) / 0.6)));
      ctx.torsoShell(0.97, 1.66, suit, 0.01, { rough: 0.35 });
      ctx.torsoShell(1.66, 1.7, 0xffffff, 0.006, { rough: 0.4 });
      ctx.add('neck', xf(torus(B.neckR * 1.25, 0.012, 18, 6), [0, B.neckY + 0.02, 0.0], [Math.PI / 2 - 0.35, 0, 0]), C.top, { rough: 0.4 });
      // floral wrap sarong, knotted on the left hip
      const flower = (x, y, z) => (Math.sin(x * 60 + y * 20) * Math.sin(y * 64 - z * 30) > 0.55 ? C.sarong2 : Math.sin(x * 33 - y * 47) > 0.85 ? 0xffffff : C.sarong);
      skirt(ctx, 1.07, 0.66, [0.235, 0.158], [0.3, 0.215], flower, { n: 7, pow: 1.3, rough: 0.6, back: 0.03 });
      ctx.add('hips', xf(ball(0.05, 0.045, 0.04, 10), [0.2, 1.04, 0.1]), C.sarong, { rough: 0.6 });
      for (const r of [-0.25, 0.25]) ctx.add('hips', xf(blade(0.24, 0.05, 0.015, 0.1), [0.21, 1.02, 0.11], [Math.PI + r * 0.4, 0, r]), C.sarong, { rough: 0.6 });
      // sandal straps
      for (const s of ['L', 'R']) { const f = ctx.J['foot' + s]; ctx.add('foot' + s, xf(box(B.footW + 0.012, 0.02, 0.03, 0.008), [f[0], f[1] - B.footH * 0.05, f[2] + B.footL * 0.35]), C.sarong); }
      ctx.limbShell('shin', 0.9, 0.96, C.sarong, 0.008);
      // hibiscus behind the right ear
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      for (let i = 0; i < 5; i++) ctx.add('head', xf(blade(R * 0.42, R * 0.3, R * 0.06, 0.1), [hx - R * 0.98, hy + R * 0.3, hz + R * 0.1], [0, -Math.PI / 2, (i / 5) * Math.PI * 2]), 0xff4a7a, { rough: 0.5 });
      ctx.add('head', xf(ball(R * 0.08, R * 0.08, R * 0.08, 8), [hx - R * 1.04, hy + R * 0.3, hz + R * 0.1]), 0xffe36a, { emissive: 0.3 });
    },
  },
};
