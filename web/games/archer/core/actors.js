// Actor = one combatant in a match: game state + terrain physics + the Character (visual) it drives.
import { TURN, PHYS, ACTOR_RADIUS } from './config.js';
import { clamp, DEG } from './util.js';
import { events } from './events.js';
import { audio } from './audio.js';

export class Actor {
  /** o: { slot, team, name, color, charDef, outfitDef, stats, character, controller, human } */
  constructor(o) {
    Object.assign(this, o);
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.grounded = false; this.facing = 1;
    this.hp = this.stats.maxHp; this.hpShown = this.hp; this.alive = true; this.deathCause = null;
    this.delay = 0; this.angle = 45; this.power = 0; this.lastPower = -1; this.lastAngle = -1;
    this.moveLeft = this.stats.moveGauge; this.ammo = {}; this.arrowId = 'standard';
    this.charging = false; this.walking = 0; this.airT = 0; this.stepT = 0; this.releaseT = 9; this.hitT = 9;
    this.stat = { damage: 0, shots: 0, hits: 0, headshots: 0, kills: 0, taken: 0 };
    this.hitShapes = this.character.hitShapes;
    this.root = this.character.root;
  }
  spawnAt(x, T) {
    const g = T.groundBelow(x, T.y1 - 0.5);
    this.x = x; this.y = isNaN(g) ? 10 : g; this.grounded = !isNaN(g); this.vx = this.vy = 0;
    this._sync();
  }
  /** Ground slope under the feet (radians, +x uphill positive). */
  slope(T) {
    const a = T.groundBelow(this.x - 0.45, this.y + 0.9, 1.8), b = T.groundBelow(this.x + 0.45, this.y + 0.9, 1.8);
    if (isNaN(a) || isNaN(b)) return 0;
    return clamp(Math.atan2(b - a, 0.9), -0.7, 0.7);
  }
  /** World aim angle (radians) from the slope-relative angle and facing. */
  aimWorld(T) {
    const s = this.grounded ? this.slope(T) : 0, a = this.angle * DEG;
    return this.facing > 0 ? s + a : Math.PI + s - a;
  }
  /** Walk one frame. Returns world distance moved (0 if blocked / out of gauge). */
  walk(dir, dt, T) {
    if (!this.grounded || this.moveLeft <= 0.01 || !dir) return 0;
    this.facing = dir;
    const step = TURN.walkSpeed * dt, nx = this.x + dir * step;
    if (nx < T.x0 + 1 || nx > T.x1 - 1) return 0;
    // wall / headroom check
    if (T.solid(nx + dir * ACTOR_RADIUS, this.y + TURN.stepUp + 0.15) || T.solid(nx + dir * ACTOR_RADIUS, this.y + 1.2)) return 0;
    const g = T.groundBelow(nx, this.y + TURN.stepUp, TURN.stepUp + 0.45);
    if (isNaN(g)) {                                 // walked off a ledge
      this.x = nx; this.grounded = false; this.vx = dir * TURN.walkSpeed * 0.8; this.vy = 0.5;
      this.moveLeft = Math.max(0, this.moveLeft - step);
      return step;
    }
    const climb = Math.max(0, g - this.y), cost = step + climb * TURN.slopeCost;
    if (cost > this.moveLeft + 1e-3) { this.moveLeft = 0; return 0; }
    this.moveLeft -= cost; this.x = nx; this.y = g;
    return step;
  }
  /** Physics + animation bookkeeping. Called every sim step by the match. */
  update(dt, T, killY, fx) {
    if (!this.alive) { this._sync(); this.character.update(dt); return; }
    this.releaseT += dt; this.hitT += dt;
    if (!this.grounded) {
      this.airT += dt;
      this.vy -= PHYS.gravity * dt; this.vx *= 1 - 0.4 * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (this.vx && T.solid(nx + Math.sign(this.vx) * ACTOR_RADIUS, ny + 0.9)) this.vx *= -0.25; else this.x = nx;
      if (this.vy > 0 && T.solid(this.x, ny + this.character.height)) this.vy = 0;
      this.y = this.vy > 0 ? Math.min(ny, ny) : ny;
      if (this.vy <= 0 && T.solid(this.x, this.y)) {
        const g = T.groundBelow(this.x, this.y + 1.2, 2.0);
        if (!isNaN(g)) {
          this.y = g; const hard = this.airT > 0.35;
          this.grounded = true; this.vx = 0; this.vy = 0; this.airT = 0;
          if (hard) { events.emit('actor:land', this); audio.play('land'); fx?.burst('land_dust', this.x, this.y, { terrainColor: 0xd8c8a8 }); }
        }
      }
      this.x = clamp(this.x, T.x0 - 4, T.x1 + 4);
    } else {
      const g = T.groundBelow(this.x, this.y + 0.35, 0.8);
      if (isNaN(g) || g < this.y - 0.12) { this.grounded = false; this.vy = 0; }
      else if (T.solid(this.x, this.y + 0.6)) {        // buried by something: pop to the surface above
        const up = T.groundBelow(this.x, this.y + 3, 3); if (!isNaN(up)) this.y = up;
      } else this.y = g;
    }
    if (this.y < killY) { fx?.burst('splash', this.x, killY + 0.5, { scale: 1.6 }); audio.play('splash'); this.kill('fell'); this.root.visible = false; }
    this._sync();
    this.character.update(dt);
  }
  _sync() { this.root.position.set(this.x, this.y, 0); this.character.setFacing(this.facing); }
  damage(n, from, info) {
    n = Math.round(n);
    if (!this.alive || n <= 0) return 0;
    this.hp = Math.max(0, this.hp - n); this.stat.taken += n; this.hitT = 0;
    this.character.hit(Math.min(1.2, 0.35 + n / 40));
    events.emit('actor:damage', this, n, from, info);
    if (this.hp <= 0) this.kill('hp', from);
    return n;
  }
  kill(cause, from = null) {
    if (!this.alive) return;
    this.alive = false; this.deathCause = cause; this.hp = 0;
    this.character.setAnim('dead');
    if (from && from !== this) from.stat.kills++;
    events.emit('actor:death', this, cause, from);
  }
  /** Arrow spawn point for a world aim angle: shoulder pivot + arm reach. Used by real shots AND the AI solver. */
  muzzleAt(ang, out) {
    const B = this.charDef.body, S = this.character.S, r = (B.upperArm + B.foreArm) * S + 0.3;
    out.x = this.x + Math.cos(ang) * r; out.y = this.y + (B.shoulderY - 0.06) * S + Math.sin(ang) * r;
    return out;
  }
}
