// Outfit registry (owner: Characters specialist). Each outfit = palette overrides + clothing builder + a perk.
// Shape: { id, char, name, type: keyof PERK_TYPES, price, perkText, mods (see perks.js), colors, bow?, build(ctx) }
import { ball, box, cyl, cone, torus, blade, xf } from './parts.js';
import { loft } from './body.js';

const gold = 0xf2c14e;

export const OUTFITS = {
  // ------------------------------------------------------------------ Vela
  vela_leathers: {
    id: 'vela_leathers', char: 'vela', name: 'Wildwood Leathers', type: 'leathers', price: 0,
    perkText: '+25% headshot & direct-hit damage', mods: { headshot: 0.25, direct: 0.25 },
    colors: { top: 0x2f9a52, bottom: 0x7a4a2e, boots: 0xa8683a, belt: 0x5a3420 },
    build(ctx) {
      const { B, J, C } = ctx;
      ctx.torsoShell(1.36, 1.655, C.top, 0.012, { rough: 0.55 });                 // laced corset top
      ctx.torsoShell(1.395, 1.405, 0xe8c070, 0.024);                               // trim lines
      ctx.torsoShell(1.6, 1.61, 0xe8c070, 0.02);
      ctx.torsoShell(1.235, 1.3, C.belt, 0.022, { rough: 0.5 });                   // belt
      ctx.add('spine', xf(box(0.07, 0.06, 0.03, 0.01), [0, 1.265, 0.115]), gold, { metal: 0.9, rough: 0.25 });
      ctx.torsoShell(0.97, 1.24, C.bottom, 0.012, { rough: 0.5 });                // leggings
      ctx.limbShell('thigh', -0.16, 1.0, C.bottom, 0.012, { rough: 0.5 });
      ctx.limbShell('shin', 0.0, 1.0, C.boots, 0.016, { rough: 0.45 });            // tall boots
      ctx.limbShell('thigh', 0.86, 1.02, C.boots, 0.02, { rough: 0.45 });          // boot cuff over the knee
      ctx.limbShell('foreArm', 0.25, 0.92, 0x6b3a22, 0.012, { flare: 0.012 });     // bracers
      ctx.limbShell('foreArm', 0.28, 0.33, gold, 0.02, { metal: 0.9, rough: 0.3 });
      // shoulder leaf pauldron (left = bow arm)
      const ua = J.upperArmL;
      ctx.add('upperArmL', xf(ball(0.085, 0.05, 0.09, 12), [ua[0] + 0.02, ua[1] + 0.03, ua[2]], [0, 0, -0.5]), 0x3e9a55, { rough: 0.5 });
      // quiver on the back
      const q = cyl(0.06, 0.05, 0.5, 12); xf(q, [-0.06, 1.45, -0.16], [0.15, 0, 0.5]); ctx.add('chest', q, 0x6b3a22, { bind: undefined });
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
      const { B, J, C } = ctx;
      const robe = (x, y, z) => (Math.sin(x * 70) * Math.sin(y * 55) * Math.sin(z * 60) > 0.82 ? 0xffe9a0 : C.robe);
      ctx.torsoShell(0.97, 1.69, C.robe, 0.013, { rough: 0.6 });
      ctx.torsoShell(1.28, 1.33, gold, 0.026, { metal: 0.8, rough: 0.3 });             // sash
      // skirt flaring to the shins, open front slit look via two colours
      const rows = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, y = 1.12 - t * 0.78; rows.push([y, 0.22 + t * 0.14, 0.15 + t * 0.12, -0.01 - t * 0.02]); }
      ctx.add('hips', loft(rows.reverse(), 26, true), (x, y, z) => (y < 0.42 ? gold : (z > 0.12 && Math.abs(x) < 0.03 ? C.robe2 : robe(x, y, z))), { rough: 0.6 });
      ctx.limbShell('upperArm', -0.05, 1.0, C.robe, 0.016, { rough: 0.6 });
      ctx.limbShell('foreArm', 0.0, 0.85, C.robe, 0.02, { flare: 0.05, rough: 0.6 });
      ctx.limbShell('foreArm', 0.8, 0.86, gold, 0.072, { metal: 0.8, rough: 0.3 });
      ctx.limbShell('thigh', -0.16, 1.0, C.robe2, 0.01);
      ctx.limbShell('shin', 0.3, 1.0, C.boots, 0.014);
      // capelet / high collar
      const cap = [];
      for (let i = 0; i <= 5; i++) { const t = i / 5; cap.push([1.6 + t * 0.16, 0.26 - t * 0.17, 0.17 - t * 0.09, -0.02]); }
      ctx.add('chest', loft(cap, 26, true), (x, y) => (y < 1.62 ? gold : 0x2a1660), { rough: 0.5, bind: ctx.torsoBind });
      // star brooch
      ctx.add('chest', xf(ball(0.04, 0.04, 0.02, 8), [0, 1.62, 0.14]), 0xbff2ff, { emissive: 0.8, rough: 0.2 });
      // circlet
      const [hx, hy, hz] = ctx.headPos();
      ctx.add('head', xf(torus(B.headR * 1.02, 0.01, 24, 6), [hx, hy + B.headR * 0.42, hz], [Math.PI / 2 - 0.25, 0, 0]), gold, { metal: 0.9, rough: 0.25 });
      ctx.add('head', xf(ball(0.025, 0.03, 0.015, 8), [hx, hy + B.headR * 0.62, hz + B.headR * 0.95]), 0xc89bff, { emissive: 0.9 });
    },
  },
  // ------------------------------------------------------------------ Brock
  brock_beach: {
    id: 'brock_beach', char: 'brock', name: 'Beach Day', type: 'swimwear', price: 0,
    perkText: '+30% move gauge, faster turn recovery', mods: { move: 0.3, delay: -0.12 },
    colors: { top: 0xff7a2f, bottom: 0x18b3c4, boots: 0xf4f4f4, shorts2: 0xffe14a },
    build(ctx) {
      const { B, J, C } = ctx;
      // tank top with racer cut: shell only around the torso (arms stay bare)
      ctx.torsoShell(1.04, 1.6, C.top, 0.012, { rough: 0.6 });
      ctx.torsoShell(1.36, 1.39, 0xffffff, 0.02);
      // board shorts with hibiscus dots
      const shorts = (x, y, z) => (Math.sin(x * 46) * Math.sin(y * 52) * Math.sin(z * 49) > 0.72 ? C.shorts2 : C.bottom);
      ctx.torsoShell(0.85, 1.06, shorts, 0.016, { rough: 0.6 });
      ctx.limbShell('thigh', -0.16, 0.62, shorts, 0.022, { flare: 0.03, rough: 0.6 });
      ctx.limbShell('thigh', 0.58, 0.64, 0xffffff, 0.052);
      // sneakers: sole + laces
      for (const s of ['L', 'R']) {
        const f = J['foot' + s];
        ctx.add('foot' + s, xf(box(B.footW + 0.02, 0.035, B.footL + 0.02, 0.012), [f[0], f[1] - B.footH * 0.82, f[2] + B.footL * 0.28]), 0xe23b3b);
        ctx.add('foot' + s, xf(box(B.footW * 0.6, 0.02, B.footL * 0.4, 0.008), [f[0], f[1] + B.footH * 0.1, f[2] + B.footL * 0.32]), 0x2b2b38);
      }
      // sweatbands
      ctx.limbShell('foreArm', 0.78, 0.92, 0xffffff, 0.016);
      // sunglasses + headband
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      for (const s of [1, -1]) ctx.add('head', xf(ball(R * 0.3, R * 0.2, R * 0.08, 12), [hx + s * R * 0.37, hy + R * 0.06, hz + R * 0.9]), 0x161a28, { rough: 0.1, metal: 0.6 });
      ctx.add('head', xf(box(R * 0.3, R * 0.05, R * 0.05, 0.01), [hx, hy + R * 0.12, hz + R * 0.95]), 0x161a28, { metal: 0.6 });
      ctx.add('head', xf(torus(R * 0.98, R * 0.09, 26, 8), [hx, hy + R * 0.45, hz - R * 0.05], [Math.PI / 2 - 0.12, 0, 0]), 0xe23b3b, { rough: 0.7 });
    },
  },
  brock_iron: {
    id: 'brock_iron', char: 'brock', name: 'Iron Bulwark', type: 'armor', price: 1200,
    perkText: '+25 max HP, -35% knockback, -15% move', mods: { hp: 25, knockback: -0.35, move: -0.15 },
    colors: { top: 0x9aa7b8, bottom: 0x2b2f45, boots: 0x6c7788, steel: 0xaab6c8, trim: 0xe0b040, cloth: 0xb02a2a },
    bow: { wood: 0x2b2f45, trim: 0xe0b040, grip: 0xb02a2a },
    build(ctx) {
      const { B, J, C } = ctx, M = { metal: 0.85, rough: 0.28 };
      ctx.torsoShell(0.86, 1.2, C.bottom, 0.012);
      ctx.torsoShell(1.16, 1.62, C.steel, 0.022, M);                               // breastplate
      ctx.torsoShell(1.2, 1.235, C.trim, 0.034, M);
      ctx.torsoShell(1.58, 1.62, C.trim, 0.03, M);
      // tabard strip
      ctx.add('hips', xf(box(0.16, 0.4, 0.03, 0.012), [0, 0.98, 0.16], [-0.08, 0, 0]), C.cloth, { rough: 0.7 });
      ctx.add('hips', xf(box(0.08, 0.08, 0.02, 0.01), [0, 1.1, 0.18]), C.trim, M);
      // tassets
      for (const s of [1, -1]) ctx.add('hips', xf(box(0.17, 0.2, 0.05, 0.02), [s * 0.17, 0.98, 0.04], [0, 0, s * 0.18]), C.steel, M);
      // pauldrons
      for (const s of ['L', 'R']) {
        const p = J['upperArm' + s], sg = s === 'L' ? 1 : -1;
        ctx.add('upperArm' + s, xf(ball(0.2, 0.15, 0.19, 18), [p[0] + sg * 0.04, p[1] + 0.03, p[2]], [0, 0, sg * -0.35]), C.steel, M);
        ctx.add('upperArm' + s, xf(torus(0.17, 0.022, 20, 6, Math.PI), [p[0] + sg * 0.04, p[1] - 0.03, p[2]], [0, Math.PI / 2, sg * -0.35 + Math.PI / 2]), C.trim, M);
      }
      ctx.limbShell('upperArm', 0.3, 1.0, C.bottom, 0.012);
      ctx.limbShell('foreArm', 0.15, 0.95, C.steel, 0.02, { ...M, flare: 0.025 });  // gauntlets
      ctx.limbShell('thigh', -0.16, 1.0, C.bottom, 0.012);
      ctx.limbShell('shin', 0.0, 1.0, C.steel, 0.02, M);                            // greaves
      for (const s of ['L', 'R']) { const p = J['shin' + s]; ctx.add('shin' + s, xf(ball(0.08, 0.08, 0.07, 12), [p[0], p[1], p[2] + 0.06]), C.trim, M); }
      // helm with plume, face open
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(ball(R * 1.12, R * 0.92, R * 1.12, 22), [hx, hy + R * 0.32, hz - R * 0.05]), (x, y, z) => (z > hz + R * 0.55 && y < hy + R * 0.5 ? C.skin : C.steel), M);
      ctx.add('head', xf(torus(R * 1.08, R * 0.08, 26, 6), [hx, hy + R * 0.25, hz - R * 0.05], [Math.PI / 2 - 0.1, 0, 0]), C.trim, M);
      ctx.add('head', xf(box(R * 0.14, R * 0.55, R * 0.12, 0.02), [hx, hy + R * 0.05, hz + R * 1.05]), C.steel, M);
      for (let i = 0; i < 5; i++) ctx.add('head', xf(blade(R * 1.4, R * 0.25, R * 0.2, -0.4), [hx, hy + R * 1.0, hz + R * (0.4 - i * 0.28)], [-0.9 - i * 0.18, 0, 0]), C.cloth, { rough: 0.7 });
    },
  },
};
