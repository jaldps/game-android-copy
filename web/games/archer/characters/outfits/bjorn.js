// Bjorn's outfits (owner: Characters specialist).
import { ball, box, cyl, torus, tube, dome, xf, fabric, tint, stripes, mail, drape } from '../parts.js';
import { loft } from '../body.js';
import { GOLD, METAL, skirt, latheAt, hatProfile } from './kit.js';

/** Fur collar/mantle loft around the shoulders. */
function mantle(ctx, color, rows) { ctx.add('chest', loft(rows, 28, true), fabric(color, 0.2, 70), { rough: 0.9, bind: ctx.torsoBind }); }

export default {
  bjorn_raider: {
    id: 'bjorn_raider', char: 'bjorn', name: 'Fjord Raider', type: 'armor', price: 0,
    perkText: '+18 max HP, -25% knockback, -10% move', mods: { hp: 18, knockback: -0.25, move: -0.1 },
    colors: { top: 0x98a4b4, bottom: 0x6a4428, boots: 0x8a6a48, fur: 0x5a4436, leather: 0x5a3420, steel: 0xb4c0ce, shield: 0xd8323a, shield2: 0xf6ecd2, wrap: 0xd8c8a0, hatOn: 1 },
    bow: { wood: 0x5a3a22, trim: 0xb4c0ce, grip: 0xd8323a },
    build(ctx) {
      const { B, C } = ctx, chain = mail(C.top);
      ctx.torsoShell(0.84, 1.6, chain, 0.02, { metal: 0.7, rough: 0.38 });
      skirt(ctx, 0.9, 0.66, [0.26, 0.22], [0.3, 0.26], chain, { n: 4, metal: 0.7, rough: 0.38, zo: 0.02 });
      ctx.limbShell('upperArm', -0.05, 0.55, chain, 0.02, { metal: 0.7, rough: 0.38 });
      ctx.torsoShell(1.0, 1.09, C.leather, 0.034, { rough: 0.5 });
      ctx.add('spine', xf(cyl(0.065, 0.065, 0.025, 18), [0, 1.045, 0.315], [Math.PI / 2, 0, 0]), GOLD, METAL);
      ctx.torsoShell(0.78, 0.98, fabric(C.bottom), 0.016);
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom), 0.018);
      ctx.limbShell('shin', 0.0, 0.6, stripes(C.wrap, C.leather, 0.045, 0.62), 0.016, { rough: 0.8 });
      ctx.limbShell('shin', 0.55, 1.0, fabric(C.fur, 0.2, 70), 0.04, { rough: 0.9 });
      ctx.limbShell('foreArm', 0.3, 0.95, C.leather, 0.018, { rough: 0.5 });
      ctx.limbShell('foreArm', 0.5, 0.56, C.steel, 0.026, METAL);
      mantle(ctx, C.fur, [[1.44, 0.4, 0.26, 0.0], [1.5, 0.41, 0.265, 0.0], [1.57, 0.37, 0.24, -0.01], [1.63, 0.27, 0.2, -0.015], [1.67, 0.17, 0.15, -0.01]]);
      // round shield on the back
      const sh = (x, y) => { const a = Math.atan2(y - 1.22, x), r = Math.hypot(x, y - 1.22); return r > 0.37 ? C.steel : (Math.floor((a + Math.PI) / (Math.PI / 4)) % 2 ? C.shield : C.shield2); };
      ctx.add('chest', latheAt([[0, -0.024], [0.14, -0.024], [0.28, -0.024], [0.41, -0.022], [0.425, 0], [0.41, 0.022], [0.28, 0.028], [0.14, 0.032], [0, 0.034]], [0, 1.22, -0.34], [-Math.PI / 2, 0, 0], 32), sh, { rough: 0.6 });
      ctx.add('chest', xf(dome(0.08, 0.06, 0.08, Math.PI / 2, 14), [0, 1.22, -0.36], [-Math.PI / 2, 0, 0]), C.steel, METAL);
      // horned helm (stops above the brows)
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(dome(R * 1.1, R * 1.0, R * 1.13, 1.3, 24), [hx, hy + R * 0.14, hz - R * 0.05]), (x, y, z) => (Math.abs(x - hx) < R * 0.09 || Math.abs(z - hz + R * 0.05) < R * 0.09 ? GOLD : tint(C.steel, 0.85 + 0.3 * (y - hy) / R)), METAL);
      ctx.add('head', xf(torus(R * 1.08, R * 0.08, 28, 6), [hx, hy + R * 0.4, hz - R * 0.05], [Math.PI / 2, 0, 0]), GOLD, METAL);
      ctx.add('head', xf(box(R * 0.15, R * 0.5, R * 0.1, 0.02), [hx, hy + R * 0.2, hz + R * 1.06], [-0.1, 0, 0]), C.steel, METAL);
      for (const s of [1, -1]) ctx.add('head', tube([[hx + s * R * 0.85, hy + R * 0.6, hz], [hx + s * R * 1.45, hy + R * 0.85, hz + R * 0.08], [hx + s * R * 1.7, hy + R * 1.5, hz + R * 0.12]], R * 0.2, R * 0.03, 14, 10), (x, y) => (y < hy + R * 0.75 ? GOLD : 0xf4ead0), { rough: 0.45 });
    },
  },
  bjorn_skald: {
    id: 'bjorn_skald', char: 'bjorn', name: 'Frost Skald', type: 'robes', price: 1100,
    perkText: '22% wind resistance, longer aim guide', mods: { windResist: 0.22, preview: 0.45 },
    colors: { top: 0x1f8a92, bottom: 0x1a5f72, boots: 0x6a4428, robe: 0x1f8a92, fur: 0xf2eee4, leather: 0x5a3420 },
    bow: { wood: 0x2a4a5a, trim: GOLD, gem: 0x9ff6ff },
    build(ctx) {
      const { C } = ctx, coat = fabric(C.robe, 0.08);
      const knot = (x, y, z) => (z > 0.1 && Math.abs(x) < 0.035 ? (Math.sin(y * 120) > 0 ? GOLD : 0xc89a30) : coat(x, y, z));
      ctx.torsoShell(0.8, 1.62, knot, 0.022, { rough: 0.7 });
      skirt(ctx, 0.98, 0.24, [0.3, 0.26], [0.38, 0.33], (x, y, z) => (y < 0.33 ? GOLD : z > 0.2 && Math.abs(x) < 0.02 ? 0x10404a : tint(C.robe, 0.78 + 0.25 * (y - 0.24) / 0.74)), { n: 9, rough: 0.7, zo: 0.03, back: 0.05 });
      ctx.torsoShell(1.0, 1.08, C.leather, 0.04, { rough: 0.5 });
      ctx.add('spine', xf(box(0.1, 0.08, 0.03, 0.01), [0, 1.04, 0.33]), GOLD, METAL);
      ctx.limbShell('upperArm', -0.05, 1.0, coat, 0.022, { rough: 0.7 });
      ctx.limbShell('foreArm', 0.0, 0.7, coat, 0.024, { flare: 0.03, rough: 0.7 });
      ctx.limbShell('foreArm', 0.62, 0.76, fabric(C.fur, 0.2, 70), 0.06, { rough: 0.9 });
      ctx.limbShell('thigh', -0.16, 1.0, fabric(C.bottom), 0.018);
      ctx.limbShell('shin', 0.4, 1.0, C.boots, 0.03, { rough: 0.6 });
      mantle(ctx, C.fur, [[1.46, 0.39, 0.25, 0.0], [1.53, 0.4, 0.26, 0.0], [1.6, 0.35, 0.235, -0.01], [1.66, 0.23, 0.18, -0.015], [1.7, 0.15, 0.14, -0.01]]);
      ctx.add('chest', xf(drape(0.6, 0.78, 1.15, 0.035, 0.35, 0.18), [0, 1.62, -0.24], [0.06, 0, 0]), (x, y) => (y < 0.62 ? 0xe2dccd : tint(0x2c5a8a, 0.85 + 0.2 * (y - 0.5))), { rough: 0.8 });
    },
  },
  bjorn_beach: {
    id: 'bjorn_beach', char: 'bjorn', name: 'Longship Holiday', type: 'swimwear', price: 900,
    perkText: '+25% move gauge, faster turn recovery', mods: { move: 0.25, delay: -0.1 },
    colors: { top: 0x23b8b0, bottom: 0x2a6ad0, boots: 0xf2b48c, shirt: 0x23b8b0, hatC: 0xe0303c, hatOn: 1 },
    bow: { wood: 0x8a5a30, trim: 0xffd25a, grip: 0xe0303c },
    build(ctx) {
      const { B, J, C } = ctx;
      // open Hawaiian shirt over a white tee
      const floral = (x, y, z) => (Math.sin(x * 50 + y * 30) * Math.sin(y * 55 - z * 40) > 0.6 ? 0xffe14a : Math.sin(x * 37 - y * 61 + z * 20) > 0.85 ? 0xff5a7a : C.shirt);
      ctx.torsoShell(0.86, 1.62, (x, y, z) => (z > 0.18 && Math.abs(x) < 0.08 + (1.62 - y) * 0.02 ? 0xf6f2ea : floral(x, y, z)), 0.02, { rough: 0.7 });
      ctx.limbShell('upperArm', -0.05, 0.6, floral, 0.024, { flare: 0.02, rough: 0.7 });
      ctx.torsoShell(0.76, 0.9, stripes(C.bottom, 0xf6f2ea, 0.05, 0.6), 0.024, { rough: 0.7 });
      ctx.limbShell('thigh', -0.16, 0.6, (x, y) => (Math.sin(y * 62) > 0.1 ? C.bottom : 0xf6f2ea), 0.03, { flare: 0.025, rough: 0.7 });
      // flip-flop soles
      for (const s of ['L', 'R']) { const f = J['foot' + s]; ctx.add('foot' + s, xf(box(B.footW + 0.03, 0.03, B.footL + 0.04, 0.012), [f[0], f[1] - B.footH * 0.85, f[2] + B.footL * 0.28]), 0x2a6ad0); }
      // flower lei
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, x = Math.sin(a) * 0.24, z = Math.cos(a) * 0.19 + 0.03, y = 1.62 - (Math.cos(a) + 1) * 0.07;
        ctx.add('chest', xf(ball(0.045, 0.04, 0.045, 8), [x, y, z]), [0xff5a7a, 0xffe14a, 0xffffff, 0xff9a3a][i % 4], { rough: 0.6 });
      }
      // bucket hat with two little horns + sunglasses
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', latheAt(hatProfile(R * 1.55, R * 1.02, R * 0.72, 0.03, R * 0.12), [hx, hy + R * 0.42, hz - R * 0.05], [-0.06, 0, 0], 28), (x, y) => (y < hy + R * 0.52 ? tint(C.hatC, 0.85) : C.hatC), { rough: 0.8 });
      for (const s of [1, -1]) ctx.add('head', tube([[hx + s * R * 0.6, hy + R * 0.95, hz], [hx + s * R * 0.95, hy + R * 1.2, hz + R * 0.05], [hx + s * R * 1.0, hy + R * 1.55, hz + R * 0.08]], R * 0.14, R * 0.03, 10, 8), 0xf4ead0, { rough: 0.45 });
      for (const s of [1, -1]) ctx.add('head', xf(ball(R * 0.3, R * 0.22, R * 0.08, 12), [hx + s * R * 0.38, hy + R * 0.1, hz + R * 0.94]), 0x161a28, { rough: 0.1, metal: 0.6 });
      ctx.add('head', xf(box(R * 0.3, R * 0.05, R * 0.05, 0.01), [hx, hy + R * 0.16, hz + R * 1.0]), 0x161a28, { metal: 0.6 });
    },
  },
};
