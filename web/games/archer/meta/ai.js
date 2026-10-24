// AI turn controller (owner: Meta specialist).
// Plans through match.simulate() — the exact live integrator, wind included — spread over several frames (one solve per
// frame, so a turn never stalls). It weighs every arrow it carries (read from the arrow registry at runtime), considers
// walking to a better spot inside its move gauge, then applies difficulty-scaled error:
//   - windSense: how much of the real wind it accounts for (easy players half-ignore wind, like real newbies)
//   - angErr / powErr: gaussian aim noise (degrees / power points), scaled by range
//   - learn: error shrinks on consecutive turns against the same target from the same spot (Gunbound "bracketing")
// Controller interface: { kind, beginTurn(actor, match), update(dt, actor, match, intent) }.
import { makeRng, clamp } from '../core/util.js';
import { getArrow, trayArrows } from '../arrows/index.js';

export const DIFFICULTY = {
  easy:   { windSense: 0.35, angErr: 4.0, powErr: 4.5,  learn: 0.08, think: 1.2,  special: 0.15, move: 0.2,  aimRate: 28, dodge: 0.0 },
  normal: { windSense: 0.75, angErr: 1.8, powErr: 2.0,  learn: 0.15, think: 0.95, special: 0.5,  move: 0.45, aimRate: 38, dodge: 0.1 },
  hard:   { windSense: 0.95, angErr: 0.9, powErr: 0.9,  learn: 0.22, think: 0.75, special: 0.8,  move: 0.7,  aimRate: 48, dodge: 0.25 },
  expert: { windSense: 1.0,  angErr: 0.4, powErr: 0.45, learn: 0.3,  think: 0.6,  special: 0.95, move: 0.85, aimRate: 58, dodge: 0.35 },
};

function gauss(rng) { return (rng() + rng() + rng() - 1.5) / 0.5; }   // ~N(0, 1)

/** Tactical role of an arrow def: explicit def.ai.role wins, otherwise inferred from id / damage profile. */
export function arrowRole(def) {
  if (def.ai?.role) return def.ai.role;
  const id = def.id;
  if (/drill|dig|bore|burrow/.test(id)) return 'dig';
  if (/split|cluster|scatter|multi|volley/.test(id)) return 'range';
  if (/bounc|ricochet/.test(id)) return 'bounce';
  if ((def.damage?.crater ?? 0) >= 2) return 'blast';
  return 'other';
}

/** Expected value of a simulated shot (higher is better): blast damage on the target minus self-damage, plus a tiny
 *  closeness term so the search has a gradient even when nothing lands in range. */
function value(r, a, target, def) {
  const D = def.damage ?? { base: 30, radius: 1.5 };
  const base = D.base ?? 30, rad = D.radius ?? 1.5;
  if (r.hit === 'actor') {
    if (r.actor === target) return base * 1.25 * (r.part === 'head' ? 1.6 : 1) + 6;
    if (r.actor === a || r.actor.team === a.team) return -80;
    return base;
  }
  if (r.hit !== 'terrain') return -6 - Math.min(40, r.minDist) * 0.1;
  const d = Math.max(0, Math.hypot(r.x - target.x, r.y - (target.y + 0.9)) - 0.45);
  let v = d < rad ? base * Math.pow(1 - d / rad, 1.15) : 0;
  const ds = Math.hypot(r.x - a.x, r.y - (a.y + 0.9)) - 0.45;
  if (ds < rad + 0.4) v -= base * 1.6 * (1 - Math.max(0, ds) / (rad + 0.4));
  return v + 2 / (1 + d);
}

const _tgt = { x: 0, y: 0 };
/** Grid search + local refine over (angle, power). Returns a fresh { v, ang, pow, hit, part }. */
export function solveShot(a, m, target, arrowId, facing) {
  const def = getArrow(arrowId);
  _tgt.x = target.x; _tgt.y = target.y + 1;
  let best = { v: -1e9, ang: 45, pow: 60, hit: null, part: null };
  const test = (ang, pow) => {
    const r = m.simulate(a, ang, pow, arrowId, _tgt, facing), v = value(r, a, target, def);
    if (v > best.v) best = { v, ang, pow, hit: r.hit === 'actor' && r.actor === target ? 'target' : r.hit, part: r.part };
  };
  for (let ang = 8; ang <= 86; ang += 6) for (let pow = 22; pow <= 100; pow += 4) test(ang, pow);
  const b0 = best;
  for (let ang = b0.ang - 5; ang <= b0.ang + 5; ang += 1) {
    for (let pow = b0.pow - 4; pow <= b0.pow + 4; pow += 0.5) {
      if (pow < 5 || pow > 100 || ang < -5 || ang > 90) continue;
      test(ang, pow);
    }
  }
  return best;
}

/** Is the target in cover (terrain over its head or walled in on our side)? */
function situation(a, m, target) {
  const T = m.terrain, tx = target.x, ty = target.y;
  let roof = false, pit = false;
  for (let h = 2.2; h <= 6 && !roof; h += 0.8) for (const dx of [-0.8, 0, 0.8]) if (T.solid(tx + dx, ty + h)) { roof = true; break; }
  const gl = T.topAt(tx - 2.2), gr = T.topAt(tx + 2.2);
  if (gl > ty + 1.3 && gr > ty + 1.3) pit = true;
  // line of sight from our bow to the target's chest
  let blocked = false; const x0 = a.x, y0 = a.y + 1.4, x1 = tx, y1 = ty + 1.2, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.5);
  for (let i = 2; i < n - 1 && !blocked; i++) { const k = i / n; if (T.solid(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)) blocked = true; }
  return { dugIn: roof || pit, blocked, range: Math.abs(tx - a.x) };
}
function roleMult(role, s) {
  if (role === 'dig') return s.dugIn ? 1.9 : 0.55;
  if (role === 'blast') return s.dugIn ? 1.5 : s.blocked ? 1.35 : 1.0;
  if (role === 'range') return s.range > 30 ? 1.4 : 0.85;
  if (role === 'bounce') return s.blocked ? 1.3 : 0.8;
  return 1;
}

/** A spot `dx` away we can reasonably walk to: solid ground all the way, no big drops or climbs. */
function reachable(a, m, dx) {
  const T = m.terrain, dir = Math.sign(dx); let y = a.y;
  for (let s = 0.5; s <= Math.abs(dx) + 1e-6; s += 0.5) {
    const g = T.groundBelow(a.x + dir * s, y + 0.6, 1.4);
    if (isNaN(g) || g < m.killY + 3) return NaN;
    if (T.solid(a.x + dir * s, g + 1.2)) return NaN;     // wall / low ceiling
    y = g;
  }
  return y;
}

export function createAIController(difficulty = 'normal', seed = 1) {
  const D = DIFFICULTY[difficulty] ?? DIFFICULTY.normal, rng = makeRng(seed);
  let stage = 'think', t = 0, plan = null, moved = 0, lastX = 0, stuck = 0, tasks = null, cands = null, sit = null, dodging = false;
  let streak = 0, lastTarget = null, lastSpot = 1e9;
  // run a solve with the wind scaled by our wind sense, then restore the real wind
  const solve = (a, m, target, id, facing) => {
    const w = m.wind, wx = w.x, wy = w.y; w.x *= D.windSense; w.y *= D.windSense;
    try { return solveShot(a, m, target, id, facing); } finally { w.x = wx; w.y = wy; }
  };
  const withError = (a, target, best) => {
    const near = clamp(Math.abs(target.x - a.x) / 40, 0.5, 1.25), k = near * Math.max(0.4, 1 - D.learn * streak);
    return { ang: clamp(best.ang + gauss(rng) * D.angErr * k, -5, 90), pow: clamp(best.pow + gauss(rng) * D.powErr * k, 5, 100) };
  };
  return {
    kind: 'ai', difficulty,
    beginTurn() { stage = 'think'; t = 0; plan = null; moved = 0; stuck = 0; tasks = null; cands = null; dodging = false; },
    /** debug/testing view of the last plan */
    get plan() { return plan; },
    update(dt, a, m, it) {
      t += dt;
      const target = m.nearestFoe(a); if (!target) { it.skip = true; return; }
      const facing = target.x > a.x ? 1 : -1;
      if (stage === 'think') {
        if (!tasks) {
          // queue the solves: standard + carried specials (if we feel like spending one) at the current spot
          sit = situation(a, m, target); cands = [];
          tasks = [{ arrow: 'standard', dx: 0 }];
          if (rng() < D.special) {
            for (const d of trayArrows()) {
              if (d.uses === Infinity || !(a.ammo[d.id] > 0)) continue;
              if (d.ai?.minTargetHp && target.hp < d.ai.minTargetHp) continue;
              tasks.push({ arrow: d.id, dx: 0 });
            }
          }
          return;
        }
        if (tasks.length) {                     // one solve per frame
          const task = tasks.shift();
          let y0 = a.y, x0 = a.x;
          if (task.dx) { const g = reachable(a, m, task.dx); if (isNaN(g)) return; a.x = x0 + task.dx; a.y = g; }
          const b = solve(a, m, target, task.arrow, facing);
          a.x = x0; a.y = y0;
          const def = getArrow(task.arrow), mult = task.arrow === 'standard' ? 1 : roleMult(arrowRole(def), sit) * Math.sqrt(def.ai?.weight ?? 1);
          cands.push({ ...b, arrow: task.arrow, dx: task.dx, score: b.v * mult - (task.arrow === 'standard' ? 0 : 4) - Math.abs(task.dx) * 0.15 });
          // after the spot-0 solves: consider walking if the shot is poor, or (sometimes) to dodge the foe's last marker
          if (!tasks.length && !cands.some((c) => c.dx)) {
            const top = cands.reduce((p, q) => (q.score > p.score ? q : p));
            const poor = top.hit !== 'target' && top.v < 18;
            dodging = !poor && rng() < D.dodge;
            if (a.moveLeft > 1.5 && ((poor && rng() < D.move + 0.5) || dodging)) {
              const r = Math.min(8, a.moveLeft * 0.85);
              for (const dx of [-r, -r / 2, r / 2, r]) tasks.push({ arrow: top.arrow, dx: +dx.toFixed(2) });
            }
          }
          return;
        }
        if (t < D.think) return;
        const here = cands.filter((c) => !c.dx).reduce((p, q) => (q.score > p.score ? q : p));
        const moves = cands.filter((c) => c.dx);
        let pick = here;
        if (moves.length) {
          const mv = moves.reduce((p, q) => (q.score > p.score ? q : p));
          // walk when it clearly improves the shot; when dodging, walk if the shot stays about as good
          if (mv.score > here.score + 3 || (dodging && mv.score > here.score - 4)) pick = mv;
        }
        const spot = Math.round(a.x + pick.dx);
        if (target === lastTarget && Math.abs(spot - lastSpot) < 2) streak++; else streak = 0;
        lastTarget = target; lastSpot = spot;
        plan = { arrow: pick.arrow, facing, ...withError(a, target, pick), ideal: { ang: pick.ang, pow: pick.pow, hit: pick.hit }, moveDir: Math.sign(pick.dx), moveDist: Math.abs(pick.dx), streak };
        it.arrow = plan.arrow;
        stage = plan.moveDir ? 'move' : 'aim'; t = 0; lastX = a.x;
        return;
      }
      if (stage === 'move') {
        it.move = plan.moveDir; it.arrow = plan.arrow;
        moved += Math.abs(a.x - lastX); stuck = Math.abs(a.x - lastX) < 1e-4 ? stuck + dt : 0; lastX = a.x;
        if (moved >= plan.moveDist - 0.05 || a.moveLeft <= 0.05 || stuck > 0.25 || t > 3.5) { it.move = 0; stage = 'resolve'; t = 0; }
        return;
      }
      if (stage === 'resolve') {                // re-solve from wherever we actually ended up; keep the error model
        if (t < 0.25 || !a.grounded) return;
        const b = solve(a, m, target, plan.arrow, facing);
        Object.assign(plan, withError(a, target, b)); plan.ideal = { ang: b.ang, pow: b.pow, hit: b.hit };
        stage = 'aim'; t = 0; return;
      }
      if (stage === 'aim') {
        it.facing = plan.facing; it.arrow = plan.arrow;
        const d = plan.ang - a.angle, step = D.aimRate * dt;
        if (Math.abs(d) <= step) { it.aimTo = plan.ang; if (t > 0.35 || m.timer < 4) { stage = 'charge'; t = 0; } }
        else it.aimDelta = Math.sign(d) * step;
        return;
      }
      if (stage === 'charge') {
        it.facing = plan.facing; it.arrow = plan.arrow;
        const step = 100 / a.stats.drawTime * dt;
        // the core adds one more step after we let go, so release half a step early
        it.charge = !(a.charging && a.power + step * 1.5 >= plan.pow);
        if (!it.charge) stage = 'done';
      }
    },
  };
}
