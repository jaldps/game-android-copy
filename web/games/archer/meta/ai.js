// AI turn controller (owner: Meta specialist). Solves the ballistic shot through match.simulate() — the exact same
// integrator as live arrows, wind included — then applies difficulty-scaled error. Also walks to a better spot when
// the shot is blocked, and picks special arrows sensibly. Controller interface: { kind, beginTurn(actor, match), update(dt, actor, match, intent) }.
import { makeRng, clamp } from '../core/util.js';
import { getArrow, trayArrows } from '../arrows/index.js';

export const DIFFICULTY = {
  easy:   { angErr: 6.5, powErr: 7.5, think: 1.1, special: 0.25, move: 0.35, aimRate: 30 },
  normal: { angErr: 3.6, powErr: 4.2, think: 0.9, special: 0.45, move: 0.5, aimRate: 38 },
  hard:   { angErr: 1.7, powErr: 2.0, think: 0.7, special: 0.6, move: 0.6, aimRate: 46 },
  expert: { angErr: 0.7, powErr: 0.9, think: 0.55, special: 0.75, move: 0.7, aimRate: 55 },
};

function gauss(rng) { return (rng() + rng() + rng() - 1.5) / 0.5; }

/** Score a simulated result against a target actor (lower is better). */
function score(r, a, target, arrowRadius) {
  if (r.hit === 'actor') {
    if (r.actor === target) return r.part === 'head' ? -2 : -1;
    if (r.actor === a || r.actor.team === a.team) return 99;
    return 0.5;
  }
  if (r.hit === 'void' || r.hit === 'timeout') return 50 + Math.min(40, r.minDist);
  const d = Math.hypot(r.x - target.x, r.y - (target.y + 0.9));
  if (Math.hypot(r.x - a.x, r.y - a.y - 0.9) < arrowRadius + 0.8) return 80;  // would hit ourselves
  return Math.max(0, d - arrowRadius * 0.6);
}

export function solveShot(a, m, target, arrowId, facing) {
  const radius = getArrow(arrowId).damage?.radius ?? 1.4;
  let best = { s: 1e9, ang: 45, pow: 60 };
  const tgt = { x: target.x, y: target.y + 1 };
  for (let ang = 10; ang <= 85; ang += 5) {
    for (let pow = 25; pow <= 100; pow += 3) {
      const r = m.simulate(a, ang, pow, arrowId, tgt, facing), s = score(r, a, target, radius);
      if (s < best.s) best = { s, ang, pow };
    }
  }
  const b0 = { ...best };
  for (let ang = b0.ang - 4; ang <= b0.ang + 4; ang += 1) {
    for (let pow = b0.pow - 3; pow <= b0.pow + 3; pow += 0.5) {
      if (pow < 5 || pow > 100 || ang < -5 || ang > 90) continue;
      const r = m.simulate(a, ang, pow, arrowId, tgt, facing), s = score(r, a, target, radius);
      if (s < best.s) best = { s, ang, pow };
    }
  }
  return best;
}

export function createAIController(difficulty = 'normal', seed = 1) {
  const D = DIFFICULTY[difficulty] ?? DIFFICULTY.normal, rng = makeRng(seed);
  let stage = 'think', t = 0, plan = null, moved = 0, lastX = 0, stuck = 0;
  return {
    kind: 'ai', difficulty,
    beginTurn() { stage = 'think'; t = 0; plan = null; moved = 0; stuck = 0; },
    update(dt, a, m, it) {
      t += dt;
      const target = m.nearestFoe(a); if (!target) return;
      if (stage === 'think') {
        if (t < D.think) return;
        // arrow choice
        // arrow choice: any limited arrow with ammo; weight from def.ai.weight (default 1), skip finishers on weak targets
        let arrow = 'standard';
        if (rng() < D.special) {
          const cands = trayArrows().filter((d) => d.id !== 'standard' && a.ammo[d.id] > 0 && !(d.ai?.minTargetHp && target.hp < d.ai.minTargetHp));
          let tot = 0; for (const d of cands) tot += d.ai?.weight ?? 1;
          let r = rng() * tot; for (const d of cands) { r -= d.ai?.weight ?? 1; if (r <= 0) { arrow = d.id; break; } }
        }
        const facing = target.x > a.x ? 1 : -1;
        let best = solveShot(a, m, target, arrow, facing);
        let moveDir = 0, moveDist = 0;
        // blocked or poor: try walking to a better position within the move gauge
        if ((best.s > 2.5 || rng() < D.move * 0.25) && a.moveLeft > 1.5) {
          const x0 = a.x, y0 = a.y; let bestMove = null;
          for (const dx of [-5, -2.5, 2.5, 5]) {
            const nx = x0 + dx, g = m.terrain.groundBelow(nx, y0 + 0.6, 1.5);
            if (isNaN(g) || Math.abs(g - y0) > 1.2) continue;
            a.x = nx; a.y = g; a.character.root.position.x = nx;
            const b = solveShot(a, m, target, arrow, facing);
            if (b.s < best.s - 0.8 && (!bestMove || b.s < bestMove.s)) bestMove = { ...b, dx };
          }
          a.x = x0; a.y = y0; a.character.root.position.x = x0;
          if (bestMove) { moveDir = Math.sign(bestMove.dx); moveDist = Math.abs(bestMove.dx); best = bestMove; }
        }
        // difficulty error (less error at close range)
        const near = clamp(Math.abs(target.x - a.x) / 40, 0.5, 1.2);
        plan = { arrow, facing, ang: clamp(best.ang + gauss(rng) * D.angErr * near, -5, 90), pow: clamp(best.pow + gauss(rng) * D.powErr * near, 5, 100), moveDir, moveDist };
        it.arrow = arrow;
        stage = moveDir ? 'move' : 'aim'; t = 0; lastX = a.x;
        return;
      }
      if (stage === 'move') {
        it.move = plan.moveDir;
        moved += Math.abs(a.x - lastX); stuck = Math.abs(a.x - lastX) < 1e-4 ? stuck + dt : 0; lastX = a.x;
        if (moved >= plan.moveDist - 0.05 || a.moveLeft <= 0.05 || stuck > 0.25 || t > 3) {
          it.move = 0; stage = 'resolve'; t = 0;
        }
        return;
      }
      if (stage === 'resolve') { // re-solve from the new spot (exact), keep the error model
        if (t < 0.25) return;
        const best = solveShot(a, m, target, plan.arrow, plan.facing);
        const near = clamp(Math.abs(target.x - a.x) / 40, 0.5, 1.2);
        plan.ang = clamp(best.ang + gauss(rng) * D.angErr * near, -5, 90); plan.pow = clamp(best.pow + gauss(rng) * D.powErr * near, 5, 100);
        stage = 'aim'; t = 0; return;
      }
      if (stage === 'aim') {
        it.facing = plan.facing; it.arrow = plan.arrow;
        const d = plan.ang - a.angle, step = D.aimRate * dt;
        if (Math.abs(d) <= step) { it.aimTo = plan.ang; if (t > 0.35) { stage = 'charge'; t = 0; } }
        else it.aimDelta = Math.sign(d) * step;
        return;
      }
      if (stage === 'charge') {
        it.facing = plan.facing;
        const step = 100 / a.stats.drawTime * dt;
        it.charge = !(a.charging && a.power + step * 0.5 >= plan.pow);
        if (!it.charge) stage = 'done';
      }
    },
  };
}
