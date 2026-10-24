// SDF-ish shape helpers for map generators (owner: Maps specialist). All return { sdf(x,y), x0,y0,x1,y1 } so they
// can be passed straight to terrain.union(...) / subtract(...) via `stamp`. Distances are approximate (vertical
// distance for profile shapes), which is fine for the 0.25-unit field.
import { fbm1, noise1 } from '../core/util.js';

export function stamp(T, shape, mat, mode = 'union') {
  if (mode === 'union') T.union(shape.sdf, shape.x0, shape.y0, shape.x1, shape.y1, mat);
  else if (mode === 'subtract') T.subtract(shape.sdf, shape.x0, shape.y0, shape.x1, shape.y1);
  else T.paint(shape.sdf, shape.x0, shape.y0, shape.x1, shape.y1, mat);
}

/** Floating island: lumpy flat-ish top at `top`, rounded shoulders, an inverted-mountain underside `depth` deep. */
export function floatingIsland(cx, top, w, depth, seed = 0, o = {}) {
  const hw = w / 2, rough = o.rough ?? 0.5, lump = o.lump ?? 0.5;
  const topY = (x) => {
    const u = (x - cx) / hw;
    return top + (fbm1(x * 0.18, seed) - 0.5) * lump * 2 - Math.pow(Math.abs(u), 6) * (o.shoulder ?? 1.4);
  };
  const botY = (x) => {
    const u = Math.min(1, Math.abs((x - cx) / hw));
    const prof = Math.pow(1 - u * u, 0.65);
    return top - 0.6 - depth * prof * (0.75 + 0.5 * fbm1(x * 0.35, seed + 5)) + (noise1(x * 1.7, seed + 9) - 0.5) * rough;
  };
  return {
    x0: cx - hw - 1, x1: cx + hw + 1, y0: top - depth * 1.3 - 1, y1: top + lump + 1,
    sdf(x, y) {
      const dx = Math.abs(x - cx) - hw;
      if (dx > 0) return dx + 0.2;
      const t = topY(x), b = botY(x);
      if (b >= t - 0.3) return 0.5;
      return Math.max(y - t, b - y, dx);
    },
  };
}
/** Ground mass from the field bottom up to a profile topFn(x) between x0..x1 (for cliffs, mountains). */
export function groundMass(x0, x1, topFn, bottom = -20, edge = 0.0) {
  return {
    x0: x0 - 1, x1: x1 + 1, y0: bottom - 1, y1: 40,
    sdf(x, y) { const dx = Math.max(x0 - x, x - x1); if (dx > 0) return dx; return Math.max(y - topFn(x), dx + edge * 0, bottom - y); },
  };
}
export function rect(cx, cy, w, h) {
  return { x0: cx - w / 2 - 1, x1: cx + w / 2 + 1, y0: cy - h / 2 - 1, y1: cy + h / 2 + 1,
    sdf(x, y) { const dx = Math.abs(x - cx) - w / 2, dy = Math.abs(y - cy) - h / 2; return Math.max(dx, dy); } };
}
export function circle(cx, cy, r) {
  return { x0: cx - r - 1, x1: cx + r + 1, y0: cy - r - 1, y1: cy + r + 1, sdf(x, y) { return Math.hypot(x - cx, y - cy) - r; } };
}
export function ellipse(cx, cy, rx, ry) {
  return { x0: cx - rx - 1, x1: cx + rx + 1, y0: cy - ry - 1, y1: cy + ry + 1,
    sdf(x, y) { const k = Math.hypot((x - cx) / rx, (y - cy) / ry); return (k - 1) * Math.min(rx, ry); } };
}
/** Convex/concave polygon (even-odd) with distance to edges. pts = [[x,y],...] */
export function polygon(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0: x0 - 1, x1: x1 + 1, y0: y0 - 1, y1: y1 + 1,
    sdf(x, y) {
      let d = 1e9, inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [ax, ay] = pts[j], [bx, by] = pts[i];
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey;
        let t = ((x - ax) * ex + (y - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = Math.min(d, Math.hypot(ax + ex * t - x, ay + ey * t - y));
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      return inside ? -d : d;
    } };
}
/** Castle tower: body + crenellated top. Returns an array of shapes to union. */
export function tower(cx, base, w, h, merlons = 3) {
  const out = [rect(cx, base + h / 2, w, h), rect(cx, base + h + 0.25, w + 0.6, 0.5)];
  const mw = (w + 0.6) / (merlons * 2 - 1);
  for (let i = 0; i < merlons; i++) out.push(rect(cx - (w + 0.6) / 2 + mw / 2 + i * mw * 2, base + h + 0.5 + 0.35, mw, 0.7));
  return out;
}
/** Crenellated wall segment from x0..x1 standing on `base`. */
export function wall(x0, x1, base, h, mw = 0.7) {
  const out = [rect((x0 + x1) / 2, base + h / 2, x1 - x0, h)];
  for (let x = x0 + mw / 2; x < x1 - mw / 2 + 0.01; x += mw * 2) out.push(rect(x, base + h + 0.35, mw, 0.7));
  return out;
}

/** Mesa / butte / building block rising from `bottom`: top profile topFn(x), cliff sides that step in/out with
 *  height (ledgeFn(y) -> extra half-width, may be negative). */
export function mesa(cx, hw, topFn, ledgeFn = () => 0, bottom = -20) {
  return {
    x0: cx - hw - 4, x1: cx + hw + 4, y0: bottom - 1, y1: 40,
    sdf(x, y) { return Math.max(y - topFn(x), Math.abs(x - cx) - (hw + ledgeFn(y)), bottom - y); },
  };
}

/** Triangle / gable (pediment) with apex at (cx, top), base half-width hw at y = base. */
export function gable(cx, base, hw, top) { return polygon([[cx - hw, base], [cx + hw, base], [cx, top]]); }

/**
 * Find a safe spawn near x0 (searching outward up to ±range, deterministic): solid ground well above minY, flat
 * within `flat` over ±0.7, supported underneath, and not standing on an excluded material (e.g. a wall top).
 * The core drops actors onto the HIGHEST surface at x, so this checks exactly that surface. Returns {x, y} or null.
 */
export function findSpawn(T, x0, range, { minY = -6.5, avoid = null, flat = 0.6, near = NaN, tol = 1.5 } = {}) {
  const n = Math.round(range / 0.25) * 2;
  for (let k = 0; k <= n; k++) {
    const x = x0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.25;
    if (x < T.x0 + 3 || x > T.x1 - 3) continue;
    const y = T.topAt(x); if (isNaN(y) || y < minY || Math.abs(y - near) > tol) continue;
    const a = T.topAt(x - 0.7), b = T.topAt(x + 0.7);
    if (isNaN(a) || isNaN(b) || Math.abs(a - y) > flat || Math.abs(b - y) > flat) continue;
    if (!T.solid(x, y - 1.0) || !T.solid(x, y - 1.6)) continue;
    if (avoid && avoid.includes(T.matAt(x, y - 0.3))) continue;
    return { x, y };
  }
  return null;
}

/** Same as findSpawn but never fails: falls back to building a small rock ledge at x0 (still a valid, solid spot). */
export function safeSpawn(T, x0, range, o = {}, mat = 0) {
  const s = findSpawn(T, x0, range, o);
  if (s) return s;
  const top = Math.max(o.minY ?? -6.5, isNaN(T.topAt(x0)) ? -2 : T.topAt(x0)) + 0.5;
  stamp(T, floatingIsland(x0, top, 7, 4, 77, { lump: 0.1, shoulder: 0.4 }), mat);
  return { x: x0, y: T.topAt(x0) };
}

/**
 * Enforce the arena rule between two spawns: if hi.y - lo.y < minDy, raise a rounded plinth under `hi` so the duel
 * is never fought on one flat level. Returns the (possibly new) {x, y} of `hi`.
 */
export function ensureHeightGap(T, hi, lo, minDy, mat = 0) {
  const dy = hi.y - lo.y;
  if (dy >= minDy) return hi;
  const lift = minDy - dy + 0.4, top = hi.y + lift;
  stamp(T, { x0: hi.x - 6, x1: hi.x + 6, y0: hi.y - 3, y1: top + 1,
    sdf: (x, y) => { const u = Math.abs(x - hi.x) / 2.2; return y - (top - Math.max(0, u - 1) * 1.4 - u * u * 0.08); } }, mat);
  return { x: hi.x, y: T.topAt(hi.x) };
}
