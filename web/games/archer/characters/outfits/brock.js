// Brock's outfits (owner: Characters specialist).
import { ball, box, cyl, cone, torus, blade, tube, dome, xf, fabric, tint, drape } from '../parts.js';
import { GOLD, METAL } from './kit.js';

export default {
  brock_beach: {
    id: 'brock_beach', char: 'brock', name: 'Beach Day', type: 'swimwear', price: 0,
    perkText: '+30% move gauge, faster turn recovery', mods: { move: 0.3, delay: -0.12 },
    colors: { top: 0xff7a2f, bottom: 0x18b3c4, boots: 0xf4f4f4, shorts2: 0xffe14a },
    build(ctx) {
      const { B, J, C } = ctx;
      ctx.torsoShell(1.04, 1.6, fabric(C.top, 0.08), 0.012, { rough: 0.6 });   // tank top
      ctx.torsoShell(1.36, 1.39, 0xffffff, 0.02);
      const shorts = (x, y, z) => (Math.sin(x * 46) * Math.sin(y * 52) * Math.sin(z * 49) > 0.72 ? C.shorts2 : C.bottom);
      ctx.torsoShell(0.85, 1.06, shorts, 0.016, { rough: 0.6 });
      ctx.limbShell('thigh', -0.16, 0.62, shorts, 0.022, { flare: 0.03, rough: 0.6 });
      ctx.limbShell('thigh', 0.58, 0.64, 0xffffff, 0.052);
      for (const s of ['L', 'R']) {
        const f = J['foot' + s];
        ctx.add('foot' + s, xf(box(B.footW + 0.02, 0.035, B.footL + 0.02, 0.012), [f[0], f[1] - B.footH * 0.82, f[2] + B.footL * 0.28]), 0xe23b3b);
        ctx.add('foot' + s, xf(box(B.footW * 0.6, 0.02, B.footL * 0.4, 0.008), [f[0], f[1] + B.footH * 0.1, f[2] + B.footL * 0.32]), 0x2b2b38);
      }
      ctx.limbShell('foreArm', 0.78, 0.92, 0xffffff, 0.016);
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      for (const s of [1, -1]) ctx.add('head', xf(ball(R * 0.3, R * 0.2, R * 0.08, 12), [hx + s * R * 0.37, hy + R * 0.06, hz + R * 0.9]), 0x161a28, { rough: 0.1, metal: 0.6 });
      ctx.add('head', xf(box(R * 0.3, R * 0.05, R * 0.05, 0.01), [hx, hy + R * 0.12, hz + R * 0.95]), 0x161a28, { metal: 0.6 });
      ctx.add('head', xf(torus(R * 0.98, R * 0.09, 26, 8), [hx, hy + R * 0.45, hz - R * 0.05], [Math.PI / 2 - 0.12, 0, 0]), 0xe23b3b, { rough: 0.7 });
    },
  },
  brock_iron: {
    id: 'brock_iron', char: 'brock', name: 'Iron Bulwark', type: 'armor', price: 1200,
    perkText: '+25 max HP, -35% knockback, -15% move', mods: { hp: 25, knockback: -0.35, move: -0.15 },
    colors: { top: 0x9aa7b8, bottom: 0x2b2f45, boots: 0x6c7788, steel: 0xaab6c8, trim: 0xe0b040, cloth: 0xb02a2a, hatOn: 1 },
    bow: { wood: 0x2b2f45, trim: 0xe0b040, grip: 0xb02a2a },
    build(ctx) {
      const { B, J, C } = ctx, M = METAL;
      ctx.torsoShell(0.86, 1.2, fabric(C.bottom), 0.012);
      ctx.torsoShell(1.16, 1.62, (x, y, z) => tint(C.steel, 0.86 + 0.24 * Math.max(0, z) / 0.25), 0.022, M);  // breastplate
      ctx.torsoShell(1.2, 1.235, C.trim, 0.034, M);
      ctx.torsoShell(1.58, 1.62, C.trim, 0.03, M);
      ctx.add('hips', xf(box(0.16, 0.4, 0.03, 0.012), [0, 0.98, 0.16], [-0.08, 0, 0]), C.cloth, { rough: 0.7 });
      ctx.add('hips', xf(box(0.08, 0.08, 0.02, 0.01), [0, 1.1, 0.18]), C.trim, M);
      for (const s of [1, -1]) ctx.add('hips', xf(box(0.17, 0.2, 0.05, 0.02), [s * 0.17, 0.98, 0.04], [0, 0, s * 0.18]), C.steel, M);
      for (const s of ['L', 'R']) {
        const p = J['upperArm' + s], sg = s === 'L' ? 1 : -1;
        ctx.add('upperArm' + s, xf(ball(0.2, 0.15, 0.19, 18), [p[0] + sg * 0.04, p[1] + 0.03, p[2]], [0, 0, sg * -0.35]), C.steel, M);
        ctx.add('upperArm' + s, xf(torus(0.17, 0.022, 20, 6, Math.PI), [p[0] + sg * 0.04, p[1] - 0.03, p[2]], [0, Math.PI / 2, sg * -0.35 + Math.PI / 2]), C.trim, M);
      }
      ctx.limbShell('upperArm', 0.3, 1.0, C.bottom, 0.012);
      ctx.limbShell('foreArm', 0.15, 0.95, C.steel, 0.02, { ...M, flare: 0.025 });
      ctx.limbShell('thigh', -0.16, 1.0, C.bottom, 0.012);
      ctx.limbShell('shin', 0.0, 1.0, C.steel, 0.02, M);
      for (const s of ['L', 'R']) { const p = J['shin' + s]; ctx.add('shin' + s, xf(ball(0.08, 0.08, 0.07, 12), [p[0], p[1], p[2] + 0.06]), C.trim, M); }
      // open-faced helm (cap stops above the brows so the face stays readable) + cheek guards + plume
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(dome(R * 1.13, R * 1.0, R * 1.14, 1.28, 24), [hx, hy + R * 0.12, hz - R * 0.04]), (x, y, z) => (Math.abs(x - hx) < R * 0.1 ? C.trim : tint(C.steel, 0.85 + 0.3 * (y - hy) / R)), M);
      ctx.add('head', xf(torus(R * 1.1, R * 0.08, 28, 6), [hx, hy + R * 0.42, hz - R * 0.04], [Math.PI / 2, 0, 0]), C.trim, M);
      for (const s of [1, -1]) ctx.add('head', xf(box(R * 0.12, R * 0.75, R * 0.6, 0.02), [hx + s * R * 0.98, hy - R * 0.05, hz - R * 0.05], [0, 0, s * 0.08]), C.steel, M);
      ctx.add('head', xf(drape(R * 1.5, R * 1.7, R * 0.7, 0.02, 0.6, 0.15), [hx, hy + R * 0.3, hz - R * 0.9], [0.2, 0, 0]), C.steel, M);
      for (let i = 0; i < 5; i++) ctx.add('head', xf(blade(R * 1.4, R * 0.25, R * 0.2, -0.4), [hx, hy + R * 1.0, hz + R * (0.4 - i * 0.28)], [-0.9 - i * 0.18, 0, 0]), C.cloth, { rough: 0.7 });
      // keep a little hair under the helm at the temples
      for (const s of [1, -1]) ctx.add('head', xf(ball(R * 0.2, R * 0.3, R * 0.25, 8), [hx + s * R * 0.85, hy + R * 0.2, hz - R * 0.1]), 0x2b1a10);
    },
  },
  brock_brawler: {
    id: 'brock_brawler', char: 'brock', name: 'Street Brawler', type: 'leathers', price: 1000,
    perkText: '+20% headshot, +30% direct-hit damage', mods: { headshot: 0.2, direct: 0.3 },
    colors: { top: 0x23232c, bottom: 0x2f5a9a, boots: 0x1c1a1e, leather: 0x23232c, gloves: 0x1c1a1e, handsGloved: 1, bandana: 0xe0303c },
    bow: { wood: 0x23232c, trim: 0xd8dde6, grip: 0xe0303c },
    build(ctx) {
      const { B, J, C } = ctx;
      // biker vest: glossy leather, silver zip, red lapels
      const vest = (x, y, z) => (z > 0.1 && Math.abs(x) < 0.012 ? 0xd8dde6 : z > 0.08 && y > 1.4 && Math.abs(Math.abs(x) - (1.66 - y) * 0.5) < 0.03 ? C.bandana : tint(C.leather, 0.9 + 0.25 * Math.max(0, z) / 0.25));
      ctx.torsoShell(1.0, 1.64, vest, 0.026, { rough: 0.3 });
      ctx.limbShell('upperArm', -0.05, 0.15, C.leather, 0.03, { rough: 0.3 });
      for (const s of ['L', 'R']) { const p = J['upperArm' + s], sg = s === 'L' ? 1 : -1;
        for (let i = 0; i < 3; i++) ctx.add('upperArm' + s, xf(cone(0.022, 0.06, 8), [p[0] + sg * (0.08 + i * 0.02), p[1] + 0.06 - i * 0.04, p[2] + (i - 1) * 0.06], [0, 0, -sg * 1.1]), 0xd8dde6, METAL);
      }
      // jeans + belt + chain
      const denim = (x, y, z) => tint(C.bottom, 0.9 + 0.12 * Math.sin(x * 80 + y * 120) * Math.sin(z * 90));
      ctx.torsoShell(0.84, 1.04, denim, 0.016, { rough: 0.7 });
      ctx.limbShell('thigh', -0.16, 1.0, denim, 0.02, { rough: 0.7 });
      ctx.limbShell('shin', 0.0, 0.5, denim, 0.022, { rough: 0.7 });
      ctx.limbShell('shin', 0.45, 1.0, C.boots, 0.03, { rough: 0.35 });
      ctx.torsoShell(1.0, 1.06, 0x3a2418, 0.026, { rough: 0.5 });
      ctx.add('spine', xf(box(0.1, 0.07, 0.03, 0.01), [0, 1.03, 0.22]), 0xd8dde6, METAL);
      ctx.add('hips', tube([[0.18, 1.0, 0.1], [0.24, 0.9, 0.06], [0.2, 0.84, -0.04], [0.14, 0.95, -0.12]], 0.008, 0.008, 14, 4), 0xd8dde6, METAL);
      // fingerless glove cuffs
      ctx.limbShell('foreArm', 0.82, 1.0, C.gloves, 0.018, { rough: 0.4 });
      // bandana with knot tails
      const [hx, hy, hz] = ctx.headPos(), R = B.headR;
      ctx.add('head', xf(torus(R * 0.99, R * 0.1, 26, 6), [hx, hy + R * 0.45, hz - R * 0.05], [Math.PI / 2 - 0.12, 0, 0]), (x, y, z) => (Math.sin(x * 120) * Math.sin(z * 120) > 0.6 ? 0xffffff : C.bandana), { rough: 0.7 });
      for (const r of [-0.35, 0.3]) ctx.add('head', xf(blade(R * 0.9, R * 0.3, R * 0.06, 0.2), [hx, hy + R * 0.45, hz - R * 1.0], [Math.PI + 0.9, r, r]), C.bandana, { rough: 0.7 });
    },
  },
};
