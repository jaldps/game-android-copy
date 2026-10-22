// Ballistics shared by live projectiles and the AI solver, so AI predictions match reality exactly.
import { PHYS } from './config.js';

/** Default flight parameters. Arrow defs override any of these in def.physics. */
export const DEFAULT_PHYS = { mass: 1, drag: 0.015, windFactor: 1, gravityScale: 1 };

/** Advance a body {x,y,vx,vy} by dt under gravity, wind {x,y} (wind units) and drag. windResist in [0,1). */
export function stepBody(b, dt, wind, ph, windResist = 0) {
  const k = PHYS.windAccel * (ph.windFactor ?? 1) * (1 - windResist) / (ph.mass ?? 1);
  b.vx += wind.x * k * dt;
  b.vy += (wind.y * k - PHYS.gravity * (ph.gravityScale ?? 1)) * dt;
  const dr = 1 - (ph.drag ?? 0) * dt;
  b.vx *= dr; b.vy *= dr;
  b.x += b.vx * dt; b.y += b.vy * dt;
}

export function launchSpeed(power) { return PHYS.maxSpeed * Math.max(0, Math.min(100, power)) / 100; }

/** Point vs actor hit shapes ({hx,hy,hr, ax,ay,bx,by,br}). Returns 'head' | 'body' | null. */
export function hitTestShapes(s, x, y, pad = 0) {
  const dxh = x - s.hx, dyh = y - s.hy, hr = s.hr + pad;
  if (dxh * dxh + dyh * dyh < hr * hr) return 'head';
  const ex = s.bx - s.ax, ey = s.by - s.ay, l2 = ex * ex + ey * ey || 1;
  let t = ((x - s.ax) * ex + (y - s.ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = s.ax + ex * t - x, qy = s.ay + ey * t - y, br = s.br + pad;
  return qx * qx + qy * qy < br * br ? 'body' : null;
}
/** Distance from a point to the body capsule surface (<=0 inside). */
export function distToShapes(s, x, y) {
  const dh = Math.hypot(x - s.hx, y - s.hy) - s.hr;
  const ex = s.bx - s.ax, ey = s.by - s.ay, l2 = ex * ex + ey * ey || 1;
  let t = ((x - s.ax) * ex + (y - s.ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const db = Math.hypot(s.ax + ex * t - x, s.ay + ey * t - y) - s.br;
  return Math.min(dh, db);
}

const sim = { x: 0, y: 0, vx: 0, vy: 0 };
/**
 * Simulate a shot without side effects. Returns `out` = { x, y, t, hit: 'terrain'|'actor'|'void'|'timeout', actor, part, apexT, minDist }.
 * opts: { terrain, x, y, angle (rad, world), power, phys, wind, windResist, actors (array with .alive/.hitShapes), owner, killY, maxT, target }
 */
export function simulateShot(o, out) {
  sim.x = o.x; sim.y = o.y;
  const sp = launchSpeed(o.power);
  sim.vx = Math.cos(o.angle) * sp; sim.vy = Math.sin(o.angle) * sp;
  const dt = PHYS.substep * 2, maxT = o.maxT ?? PHYS.maxFlight, ph = o.phys ?? DEFAULT_PHYS, T = o.terrain;
  out.hit = 'timeout'; out.actor = null; out.part = null; out.apexT = 0; out.minDist = 1e9;
  let t = 0, prevVy = sim.vy;
  while (t < maxT) {
    stepBody(sim, dt, o.wind, ph, o.windResist ?? 0); t += dt;
    if (prevVy > 0 && sim.vy <= 0) out.apexT = t; prevVy = sim.vy;
    if (o.target) { const d = Math.hypot(sim.x - o.target.x, sim.y - o.target.y); if (d < out.minDist) out.minDist = d; }
    if (o.actors && t > 0.04) {
      for (const a of o.actors) {
        if (!a.alive || (a === o.owner && t < 0.35)) continue;
        const part = hitTestShapes(a.hitShapes, sim.x, sim.y, 0.05);
        if (part) { out.hit = 'actor'; out.actor = a; out.part = part; out.x = sim.x; out.y = sim.y; out.t = t; return out; }
      }
    }
    if (T.solid(sim.x, sim.y)) { out.hit = 'terrain'; out.x = sim.x; out.y = sim.y; out.t = t; return out; }
    if (sim.y < (o.killY ?? -12) || sim.x < T.x0 - 30 || sim.x > T.x1 + 30) { out.hit = 'void'; out.x = sim.x; out.y = sim.y; out.t = t; return out; }
  }
  out.x = sim.x; out.y = sim.y; out.t = t; return out;
}
