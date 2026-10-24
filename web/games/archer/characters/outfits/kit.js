// Shared outfit-building helpers (owner: Characters specialist).
import * as THREE from 'three';
import { loft } from '../body.js';
import { xf, lathe } from '../parts.js';

export const GOLD = 0xf2c14e;
export const METAL = { metal: 0.85, rough: 0.28 };

/**
 * Flared skirt / coat tail / tassets: open loft from y0 (top) down to y1, radii r0=[rx,rz] -> r1, bound to hips.
 * opts: n (rings), pow (flare curve), zo (z offset at the top), back (extra -z drift at the hem), seg, bone, rough...
 */
export function skirt(ctx, y0, y1, r0, r1, color, opts = {}) {
  const rows = [], n = opts.n ?? 8, p = opts.pow ?? 1, zo = opts.zo ?? -0.01;
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = Math.pow(t, p);
    rows.push([y0 - t * (y0 - y1), r0[0] + (r1[0] - r0[0]) * k, r0[1] + (r1[1] - r0[1]) * k, zo - t * (opts.back ?? 0.02)]);
  }
  return ctx.add(opts.bone ?? 'hips', loft(rows.reverse(), opts.seg ?? 28, true), color, opts);
}

/** Solid lathe from a closed outline [[r, y], ...] placed at pos with Euler rot. phi/phiLen cut an arc (e.g. a neck guard). */
export function latheAt(profile, pos, rot, seg = 28, phi = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, phi, phiLen);
  return xf(g, pos, rot);
}
export { lathe };

/** Wide-brim hat outline (r, y) relative to the brim plane. brim = brim radius, cr = crown radius, h = crown height. */
export function hatProfile(brim, cr, h, lip = 0.022, dip = 0.0) {
  return [[0.0, -0.004], [brim, -0.004 - dip], [brim * 1.01, lip * 0.6 - dip], [brim * 0.92, lip], [cr * 1.04, lip * 1.4], [cr, lip + h * 0.85], [cr * 0.8, lip + h], [0.0, lip + h * 1.03]];
}

/** Straw weave colour: radial spokes + rings. */
export const straw = (base, cx, cz) => (x, y, z) => {
  const a = Math.atan2(z - cz, x - cx), r = Math.hypot(x - cx, z - cz);
  const k = 0.9 + 0.1 * Math.sin(a * 36) + 0.08 * Math.sin(r * 160);
  const c = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255, f = (v) => Math.min(255, Math.max(0, (v * k) | 0));
  return (f(c) << 16) | (f(g) << 8) | f(b);
};
