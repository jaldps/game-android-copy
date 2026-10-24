// Arrow-type registry (owner: Arrows/VFX/Audio specialist). The core imports ONLY from this file.
// See MODULES.md section 5 for the full interface. Order of ARROWS = order in the in-game tray.
//
// Tray (8): Broadhead (standard), Blast (explosive), Tri-Splitter, Bouncer, Driller, Frost, Storm (lightning), Warp (grapple).
// Hidden children: Shard (splitter fragments).
// Hooks run at the 1/240 s substep; onUpdate must not allocate. onImpact runs on a discrete event and may.
import { buildArrow, instance, addBomb, addRune, addBall, addDrill, addCrystal, addBolt, addHook } from './models.js';
import { events } from '../core/events.js';

const ICON = {
  standard: '<svg viewBox="0 0 32 32"><path d="M4 28 24 8" stroke="#f3e2c0" stroke-width="3" stroke-linecap="round"/><path d="M28 4l-9 3 6 6z" fill="#dfe6ee"/><path d="M4 28l1-7 3 3zM4 28l7-1-3-3z" fill="#e8423f"/></svg>',
  explosive: '<svg viewBox="0 0 32 32"><path d="M4 28 18 14" stroke="#f3e2c0" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="12" r="7" fill="#d23a2a"/><circle cx="18" cy="10" r="2.2" fill="#ff8a7a"/><path d="M24 6l3-3" stroke="#ffd27a" stroke-width="2.4" stroke-linecap="round"/><circle cx="27.5" cy="3.5" r="2" fill="#ffd27a"/></svg>',
  splitter: '<svg viewBox="0 0 32 32"><g stroke="#9fe6ff" stroke-width="2.6" stroke-linecap="round"><path d="M4 28 16 16"/><path d="M16 16 28 6"/><path d="M16 16 29 16"/><path d="M16 16 22 28"/></g><circle cx="16" cy="16" r="3.4" fill="#4fb6ff"/></svg>',
  bouncer: '<svg viewBox="0 0 32 32"><path d="M3 26q5-14 10 0t9-8" fill="none" stroke="#c8ff9a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 3"/><circle cx="24" cy="10" r="6" fill="#7dff4a"/><path d="M18.5 9.5h11" stroke="#fff" stroke-width="2"/><circle cx="22" cy="7.5" r="1.6" fill="#fff"/></svg>',
  driller: '<svg viewBox="0 0 32 32"><path d="M0 22h32v10H0z" fill="#a0703c"/><path d="M0 22h32v3H0z" fill="#6ccf4a"/><path d="M5 5l12 12" stroke="#f3e2c0" stroke-width="3" stroke-linecap="round"/><path d="M15 13l13 15-4-12z" fill="#ffb02a"/><path d="M18 17l4 1M20 20l4 1M22 23l3 1" stroke="#3a2a22" stroke-width="1.6"/></svg>',
  frost: '<svg viewBox="0 0 32 32"><g stroke="#bff4ff" stroke-width="2.4" stroke-linecap="round"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13"/><path d="M12 5l4 3 4-3M12 27l4-3 4 3"/></g><circle cx="16" cy="16" r="3.6" fill="#3ab8ff"/></svg>',
  lightning: '<svg viewBox="0 0 32 32"><path d="M6 10q2-6 9-5 3-3 8-1 6 1 5 7z" fill="#8a7ab8"/><path d="M17 11l-6 10h5l-3 9 9-12h-5l3-7z" fill="#ffe94a" stroke="#b06aff" stroke-width="1"/></svg>',
  warp: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="#ff5ad8" stroke-width="2.4" stroke-dasharray="4 3"/><path d="M16 6v14" stroke="#ff9ae8" stroke-width="2.6" stroke-linecap="round"/><path d="M10 16q0 8 6 8t6-8" fill="none" stroke="#ff5ad8" stroke-width="2.8" stroke-linecap="round"/><circle cx="16" cy="6" r="2.6" fill="#fff"/></svg>',
};

// ---- shared helpers (event-time; may allocate) ----
function boom(p, hit, api, d, vfx, sfx, x = hit.x, y = hit.y, extra = 1) {
  return api.explode(x, y, {
    base: d.base * p.damageScale * extra, radius: d.radius, crater: d.crater, knockback: d.knockback,
    owner: p.owner, direct: hit.actor, part: hit.part, arrow: p.def.id, vfx, sfx, nx: hit.nx, ny: hit.ny,
  });
}
function lostInVoid(p, hit, api) {
  const killY = api.match.killY ?? -9.5;
  if (hit.y < killY + 1) { api.fx(api.match.map?.fallVfx ?? 'splash', hit.x, killY + 0.4); api.sfx(api.match.map?.fallSfx ?? 'splash'); }
  return 'remove';
}
const centerOf = (a) => { const s = a.hitShapes; return [(s.ax + s.bx) / 2, (s.ay + s.by) / 2]; };
const isFoe = (a, owner) => a.alive && (!owner || a.team !== owner.team);

// ---- pre-allocated emitters/opts used inside per-substep hooks (no per-frame allocation) ----
const DRILL_DUST = { count: 2, shape: 'puff', blend: 'alpha', life: [0.4, 0.7], speed: [1.5, 3.5], spread: 6.28, size: [0.14, 0.26], grow: 1.8, color: 'terrain', color2: 'dark', colorJitter: 0.5, alpha: [1, 0], gravity: 3, drag: 3, z: [1.2, 2.4] };
const DRILL_SPARK = { count: 2, shape: 'streak', blend: 'add', life: [0.12, 0.25], speed: [5, 9], spread: 6.28, size: 0.05, color: 0xffd27a, color2: 0xff6a1a, alpha: [1, 0], gravity: 10, drag: 2, z: [1.4, 2.6] };
const DRILL_OPTS = { terrainColor: 0x8a7a60, z: 0 };
// Bolt = violet alpha-blended halo + solid yellow toon core (alpha, readable on a bright sky) + hot additive centre.
const BOLT_GLOW = { count: 1, shape: 'glow', blend: 'alpha', life: [0.3, 0.42], speed: [0, 0.3], size: [0.45, 0.6], color: 0xb06aff, color2: 0x6a2aff, alpha: [0.9, 0], drag: 2, scaleCount: false };
const BOLT_CORE = { count: 1, shape: 'streak', blend: 'alpha', life: [0.3, 0.4], speed: 0.3, dir: 'input', spread: 0, size: 0.2, color: 0xfff27a, color2: 0xffd22a, alpha: [1, 0.2], drag: 2, scaleCount: false };
const BOLT_HOT = { count: 1, shape: 'streak', blend: 'add', life: [0.2, 0.3], speed: 0.3, dir: 'input', spread: 0, size: 0.09, color: 0xffffff, alpha: [1, 0], drag: 2, scaleCount: false };

// Lightning bolt drawn as a jagged chain of glow particles from (x0,y0) to (x1,y1). Pure visual -> Math.random.
function drawBolt(api, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), n = Math.max(6, Math.round(len / 0.55));
  const nx = -dy / len, ny = dx / len;
  let off = 0, px = x0, py = y0;
  const o = { dirX: 0, dirY: 1 };
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    off = (off + (Math.random() - 0.5) * 0.9) * (i === n ? 0 : 0.85);
    const x = x0 + dx * t + nx * off, y = y0 + dy * t + ny * off, mx = (x + px) / 2, my = (y + py) / 2;
    o.dirX = x - px; o.dirY = y - py;
    api.emitParticles(BOLT_GLOW, mx, my);
    api.emitParticles(BOLT_CORE, mx, my, o);
    api.emitParticles(BOLT_HOT, mx, my, o);
    px = x; py = y;
    if (i % 7 === 3 && Math.random() < 0.7) { // a short fork
      const fx = x + nx * (Math.random() < 0.5 ? -1 : 1) * 0.9, fy = y + dy / n * 2;
      for (let k = 1; k <= 3; k++) api.emitParticles(BOLT_GLOW, x + (fx - x) * k / 3, y + (fy - y) * k / 3, { scale: 0.6 });
    }
  }
}

// Frost: chilled actors lose 65% of their next move gauge (applied when their turn starts).
let frostApi = null;
events.on('turn:start', (a) => {
  if (!a?._frost) return;
  a._frost = 0;
  a.moveLeft *= 0.35;
  if (frostApi) { frostApi.fx('frost_chill', a.x, a.y + 1.2); frostApi.sfx('frost', { soft: true }); frostApi.callout('CHILLED: SLOW MOVE', 'info'); }
});
events.on('match:start', () => { frostApi = null; });

/**
 * Arrow def fields (see MODULES.md 5):
 *  id, name, desc, icon, color, price, uses (per match), delay (extra turn delay), hidden
 *  physics { mass, drag, windFactor, gravityScale } — heavier (mass) = less wind drift
 *  damage { base, radius, crater, knockback } · trail { color, width, length, additive, alpha, puff?, puffEvery? }
 *  sfx { launch, impact, body, flight } · vfx { impact, body } · stick · createModel() · hooks
 */
export const ARROWS = [
  {
    id: 'standard', name: 'Broadhead', desc: 'Reliable steel tip. Bonus on direct hits.', icon: ICON.standard, color: '#f3e2c0',
    price: 0, uses: Infinity, delay: 0,
    physics: { mass: 1, drag: 0.012, windFactor: 1, gravityScale: 1 },
    damage: { base: 32, radius: 1.5, crater: 0.9, knockback: 5 },
    trail: { color: 0xffc04a, width: 0.13, length: 26, additive: false, alpha: 0.9,
      puff: { count: 1, shape: 'glow', blend: 'add', life: [0.18, 0.3], speed: [0.1, 0.4], size: [0.1, 0.16], grow: 0.4, color: 0xffd27a, alpha: [0.7, 0], drag: 3, scaleCount: false }, puffEvery: 0.035 },
    sfx: { launch: 'release', impact: 'impact_arrow', body: 'impact_body', flight: 'whoosh' },
    vfx: { impact: 'impact_dirt', body: 'impact_body' },
    stick: true,
    createModel: () => instance('standard', () => buildArrow({})),
  },
  {
    id: 'explosive', name: 'Blast Arrow', desc: 'Heavy payload. Huge crater, shrugs off wind.', icon: ICON.explosive, color: '#ff6a4a',
    price: 0, uses: 2, delay: 160, ai: { weight: 1.6, minTargetHp: 20 },
    physics: { mass: 1.6, drag: 0.02, windFactor: 1, gravityScale: 1.08 },
    damage: { base: 42, radius: 3.4, crater: 3.1, knockback: 13 },
    trail: { color: 0xff4a2a, width: 0.18, length: 28, additive: true, alpha: 0.95,
      puff: { count: 2, shape: 'smoke', blend: 'alpha', life: [0.5, 0.9], speed: [0.2, 0.6], size: [0.16, 0.26], grow: 2.4, color: 0x8a7a72, color2: 0xe8ded5, alpha: [0.75, 0], drag: 2, lift: 0.8, scaleCount: false }, puffEvery: 0.03 },
    sfx: { launch: 'release_heavy', impact: 'explosion', body: 'explosion', flight: 'fuse' },
    vfx: { impact: 'explosion', body: 'explosion' },
    createModel: () => instance('explosive', () => addBomb(buildArrow({ shaft: 0x3a2a24, fletch: 0xff8a2a, fletch2: 0x2a2a32 }))),
    onImpact(p, hit, api) {
      if (hit.kind === 'void') return lostInVoid(p, hit, api);
      boom(p, hit, api, this.damage, 'explosion', 'explosion');
      api.slowmo(0.35, 0.18);
      return 'remove';
    },
  },
  {
    id: 'splitter', name: 'Tri-Splitter', desc: 'Splits into three at the top of its arc.', icon: ICON.splitter, color: '#7fd8ff',
    price: 0, uses: 2, delay: 120, ai: { weight: 1 },
    physics: { mass: 0.9, drag: 0.012, windFactor: 1.1, gravityScale: 1 },
    damage: { base: 24, radius: 1.4, crater: 1.0, knockback: 4 },
    trail: { color: 0x2ab8ff, width: 0.15, length: 26, additive: true, alpha: 0.95,
      puff: { count: 1, shape: 'star', blend: 'alpha', life: [0.25, 0.45], speed: [0.3, 1], size: [0.1, 0.17], color: 0x7fe0ff, color2: 0x4fb6ff, alpha: [1, 0], drag: 3, spin: 6, scaleCount: false }, puffEvery: 0.04 },
    sfx: { launch: 'release', impact: 'impact_shard', body: 'impact_body', flight: 'whoosh_split' },
    vfx: { impact: 'impact_dirt', body: 'impact_body' },
    createModel: () => instance('splitter', () => addRune(buildArrow({ shaft: 0x2a3a5a, head: 0x9fe6ff, fletch: 0x4fb6ff, fletch2: 0xe8f8ff, headShape: 'tri', glow: 0x2a8acc }), 0x7fd8ff)),
    onUpdate(p, dt, api) {
      if (!p.data.split && p.age > 0.25 && p.vy <= 0) {
        p.data.split = true;
        const sp = Math.hypot(p.vx, p.vy), a = Math.atan2(p.vy, p.vx);
        api.spawn('shard', p.x, p.y, Math.cos(a - 0.16) * sp * 0.92, Math.sin(a - 0.16) * sp * 0.92, { parent: p });
        api.spawn('shard', p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, { parent: p });
        api.spawn('shard', p.x, p.y, Math.cos(a + 0.16) * sp * 1.07, Math.sin(a + 0.16) * sp * 1.07, { parent: p });
        api.fx('split', p.x, p.y); api.sfx('split');
        p.alive = false;
      }
    },
  },
  {
    id: 'shard', name: 'Shard', hidden: true, icon: ICON.splitter, color: '#7fd8ff', price: 0, uses: Infinity, delay: 0,
    physics: { mass: 0.9, drag: 0.012, windFactor: 1.1, gravityScale: 1 },
    damage: { base: 22, radius: 1.5, crater: 1.1, knockback: 4 },
    trail: { color: 0x2ab8ff, width: 0.1, length: 18, additive: true, alpha: 0.9,
      puff: { count: 1, shape: 'glow', blend: 'alpha', life: [0.2, 0.35], speed: [0.1, 0.5], size: [0.08, 0.14], color: 0x5ad0ff, color2: 0x2a8acc, alpha: [0.9, 0], drag: 3, scaleCount: false }, puffEvery: 0.05 },
    sfx: { launch: null, impact: 'impact_shard', body: 'impact_body' },
    vfx: { impact: 'impact_shard', body: 'impact_body' },
    createModel: () => instance('shard', () => buildArrow({ shaft: 0x2a3a5a, head: 0x9fe6ff, fletch: 0x4fb6ff, fletch2: 0xe8f8ff, headShape: 'tri', glow: 0x2a8acc })),
  },
  {
    id: 'bouncer', name: 'Bouncer', desc: 'Bounces off terrain up to 3 times, then pops.', icon: ICON.bouncer, color: '#9dff6a',
    price: 0, uses: 2, delay: 120, ai: { weight: 0.6 },
    physics: { mass: 1.1, drag: 0.01, windFactor: 1, gravityScale: 1.05 },
    damage: { base: 30, radius: 2.1, crater: 1.6, knockback: 7 },
    trail: { color: 0x9dff6a, width: 0.14, length: 30, additive: true, alpha: 0.9,
      puff: { count: 1, shape: 'ring', blend: 'add', life: [0.3, 0.45], speed: 0, size: 0.1, grow: 2.2, color: 0xd8ffb0, color2: 0x5ad82a, alpha: [0.8, 0], drag: 0, scaleCount: false }, puffEvery: 0.06 },
    sfx: { launch: 'release', impact: 'explosion_small', body: 'explosion_small', flight: 'whoosh_bounce' },
    vfx: { impact: 'explosion_small', body: 'explosion_small' },
    createModel: () => instance('bouncer', () => addBall(buildArrow({ shaft: 0x2a5a2a, fletch: 0x7dff4a, fletch2: 0xffffff }))),
    onImpact(p, hit, api) {
      if (hit.kind === 'void') return lostInVoid(p, hit, api);
      const d = p.vx * hit.nx + p.vy * hit.ny; // < 0 = moving into the surface
      if (hit.kind === 'terrain' && p.bounces < 3 && d < -4) { // grazing/rolling contacts detonate instead of chattering
        // reflect: normal component * restitution, tangent keeps most of its speed
        const tx = p.vx - d * hit.nx, ty = p.vy - d * hit.ny;
        p.vx = tx * 0.86 - d * hit.nx * 0.62; p.vy = ty * 0.86 - d * hit.ny * 0.62;
        const D = p.data; D.contacts = (D.contacts ?? 0) + 1;
        if (Math.hypot(p.vx, p.vy) > 5.5 && D.contacts < 9) {
          // contacts closer than 0.12 s apart (corner chatter) don't use up a bounce
          if (p.age - (D.lastB ?? -1) > 0.12) p.bounces++;
          D.lastB = p.age;
          p.x = hit.x + hit.nx * 0.3; p.y = hit.y + hit.ny * 0.3;
          if (api.terrain.solid(p.x, p.y)) { p.x = p.px; p.y = p.py; }
          api.fx('bounce', hit.x, hit.y, { dirX: hit.nx, dirY: hit.ny, terrainColor: api.match.terrainColorAt(hit.x, hit.y) });
          api.sfx('bounce', { n: p.bounces, minGap: 0.01 });
          api.shake(0.12);
          return 'keep';
        }
      }
      boom(p, hit, api, this.damage, 'explosion_small', 'explosion_small', hit.x, hit.y, 1 + p.bounces * 0.08);
      return 'remove';
    },
  },
  {
    id: 'driller', name: 'Driller', desc: 'Tunnels through rock and detonates underground. Digs foes out of cover.', icon: ICON.driller, color: '#ffb02a',
    price: 0, uses: 2, delay: 150, ai: { weight: 0.8 },
    physics: { mass: 1.35, drag: 0.016, windFactor: 0.9, gravityScale: 1.04 },
    damage: { base: 36, radius: 2.6, crater: 2.4, knockback: 10 },
    trail: { color: 0xff8a10, width: 0.15, length: 24, additive: true, alpha: 0.9,
      puff: { count: 1, shape: 'streak', blend: 'add', life: [0.15, 0.28], speed: [2, 5], spread: 6.28, size: 0.04, color: 0xffe0a0, color2: 0xff7a1a, alpha: [1, 0], gravity: 8, drag: 2, scaleCount: false }, puffEvery: 0.025 },
    sfx: { launch: 'release_heavy', impact: 'explosion_deep', body: 'explosion', flight: 'whoosh_heavy' },
    vfx: { impact: 'drill_blast', body: 'explosion' },
    createModel: () => instance('driller', () => addDrill(buildArrow({ shaft: 0x4a3a2a, fletch: 0xffb02a, fletch2: 0x2a2a32 }))),
    onUpdate(p, dt, api) {
      const d = p.data;
      if (!d.drill) return true;
      const T = api.terrain, sp = 15;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 2.5 * dt;
      const l = Math.hypot(p.vx, p.vy) || 1; p.vx = p.vx / l * sp; p.vy = p.vy / l * sp;
      d.dist += sp * dt;
      if (d.dist - d.lastC >= 0.3) {
        d.lastC = d.dist;
        api.carve(p.x, p.y, 0.55);
        DRILL_OPTS.terrainColor = api.match.terrainColorAt(p.x, p.y + 0.3);
        api.emitParticles(DRILL_DUST, p.x, p.y, DRILL_OPTS); api.emitParticles(DRILL_SPARK, p.x, p.y, DRILL_OPTS);
        api.shake(0.06);
        d.ticks++; if ((d.ticks & 3) === 0) api.sfx('drill_tick', { minGap: 0.05 });
      }
      // detonate: drilled far enough, broke out into open air, or right under a foe
      const ax = p.x + p.vx / sp * 0.75, ay = p.y + p.vy / sp * 0.75;
      let go = d.dist > 5.5 || (d.dist > 0.9 && !T.solid(ax, ay) && !T.solid(ax + p.vx / sp * 0.5, ay + p.vy / sp * 0.5));
      if (!go) for (const a of api.actors) {
        if (!isFoe(a, p.owner)) continue;
        const cx = (a.hitShapes.ax + a.hitShapes.bx) * 0.5, cy = (a.hitShapes.ay + a.hitShapes.by) * 0.5;
        const ddx = cx - p.x, ddy = cy - p.y; // close to the body, or anywhere in the column right under the feet
        if (ddx * ddx + ddy * ddy < 2.6 || (Math.abs(ddx) < 1.1 && ddy > 0 && ddy < 3.2)) { go = true; break; }
      }
      if (go) {
        api.explode(p.x, p.y, { ...this.damage, base: this.damage.base * p.damageScale, owner: p.owner, arrow: p.def.id, vfx: 'drill_blast', sfx: 'explosion_deep', nx: 0, ny: 1 });
        p.alive = false;
      }
      return false;
    },
    onImpact(p, hit, api) {
      if (hit.kind === 'void') return lostInVoid(p, hit, api);
      if (p.data.drill) { // still inside rock between carves: keep going
        if (hit.kind !== 'actor') return 'keep';
      } else if (hit.kind === 'terrain') {
        const d = p.data; d.drill = 1; d.dist = 0; d.lastC = 0; d.ticks = 0;
        p.x = hit.x; p.y = hit.y;
        api.carve(hit.x, hit.y, 0.7);
        api.fx('drill_enter', hit.x, hit.y, { dirX: hit.nx, dirY: hit.ny, terrainColor: api.match.terrainColorAt(hit.x, hit.y) });
        api.sfx('drill');
        return 'keep';
      }
      boom(p, hit, api, this.damage, 'explosion', 'explosion');
      return 'remove';
    },
  },
  {
    id: 'frost', name: 'Frost Arrow', desc: 'Icy burst. Victims lose most of their next move and act later.', icon: ICON.frost, color: '#8fe8ff',
    price: 0, uses: 2, delay: 100, ai: { weight: 0.9 },
    physics: { mass: 1, drag: 0.014, windFactor: 1, gravityScale: 1 },
    damage: { base: 24, radius: 2.4, crater: 0.7, knockback: 3 },
    trail: { color: 0x4ac0ff, width: 0.16, length: 30, additive: false, alpha: 0.9,
      puff: { count: 1, shape: 'star', blend: 'alpha', life: [0.5, 0.9], speed: [0.2, 0.7], size: [0.12, 0.2], color: 0x8fe8ff, color2: 0x2a7aff, alpha: [1, 0], gravity: 1.5, drag: 2, spin: 3, z: [0, 0.6], scaleCount: false }, puffEvery: 0.03 },
    sfx: { launch: 'release', impact: 'frost', body: 'frost', flight: 'whoosh_frost' },
    vfx: { impact: 'frost_burst', body: 'frost_burst' },
    createModel: () => instance('frost', () => addCrystal(buildArrow({ shaft: 0xe8f4ff, fletch: 0x7fd8ff, fletch2: 0xffffff, nock: 0x3a6aa0 }))),
    onImpact(p, hit, api) {
      if (hit.kind === 'void') return lostInVoid(p, hit, api);
      boom(p, hit, api, this.damage, 'frost_burst', 'frost');
      frostApi = api;
      let n = 0;
      for (const a of api.actors) {
        if (!a.alive) continue;
        const [cx, cy] = centerOf(a);
        if (Math.hypot(cx - hit.x, cy - hit.y) > this.damage.radius + 0.9 && a !== hit.actor) continue;
        a._frost = 1; a.delay += 140; n++;
        api.fx('frost_chill', cx, cy);
      }
      if (n) api.callout('FROZEN!', 'info');
      return 'remove';
    },
  },
  {
    id: 'lightning', name: 'Storm Arrow', desc: 'Calls a lightning bolt from the sky onto the nearest foe near impact.', icon: ICON.lightning, color: '#ffe94a',
    price: 0, uses: 1, delay: 180, ai: { weight: 1.2 },
    physics: { mass: 0.85, drag: 0.012, windFactor: 1.2, gravityScale: 0.97 },
    damage: { base: 16, radius: 1.4, crater: 0.6, knockback: 3 },
    bolt: { base: 24, radius: 1.5, crater: 1.0, knockback: 6, reach: 7.5 },
    trail: { color: 0xc89aff, width: 0.13, length: 28, additive: true, alpha: 0.95,
      puff: { count: 1, shape: 'streak', blend: 'add', life: [0.08, 0.16], speed: [3, 7], spread: 6.28, size: 0.05, color: 0xffffff, color2: 0xffe94a, alpha: [1, 0], drag: 4, scaleCount: false }, puffEvery: 0.02 },
    sfx: { launch: 'release', impact: 'zap', body: 'zap', flight: 'crackle' },
    vfx: { impact: 'zap', body: 'zap' },
    createModel: () => instance('lightning', () => addBolt(buildArrow({ shaft: 0x3a2a5a, fletch: 0xffe94a, fletch2: 0xb06aff, nock: 0xffe94a }))),
    onImpact(p, hit, api) {
      if (hit.kind === 'void') return lostInVoid(p, hit, api);
      boom(p, hit, api, this.damage, 'zap', 'zap');
      // strike target: nearest foe within reach (ignores cover: the bolt comes from above), else the impact point
      const B = this.bolt;
      let tgt = null, bd = B.reach;
      for (const a of api.actors) {
        if (!isFoe(a, p.owner)) continue;
        const [cx, cy] = centerOf(a), dd = Math.hypot(cx - hit.x, cy - hit.y);
        if (dd < bd) { bd = dd; tgt = a; }
      }
      const [bx, by] = tgt ? centerOf(tgt) : [hit.x, hit.y];
      const topY = by + 18;
      drawBolt(api, bx + (Math.random() - 0.5) * 3, topY, bx, by);
      drawBolt(api, bx + (Math.random() - 0.5) * 3, topY, bx, by);
      if (tgt) drawBolt(api, hit.x, hit.y, bx, by); // arc from the arrow to the struck foe
      api.explode(bx, by, { base: B.base * p.damageScale, radius: B.radius, crater: B.crater, knockback: B.knockback, owner: p.owner, arrow: p.def.id, vfx: 'lightning_strike', sfx: 'thunder', nx: 0, ny: 1 });
      if (tgt) api.callout('THUNDERSTRUCK!', 'info');
      return 'remove';
    },
  },
  {
    id: 'warp', name: 'Warp Hook', desc: 'Teleports you to where it lands. Light damage.', icon: ICON.warp, color: '#ff5ad8',
    price: 0, uses: 1, delay: 220, ai: { weight: 0 },
    physics: { mass: 0.9, drag: 0.012, windFactor: 1.05, gravityScale: 1 },
    damage: { base: 12, radius: 1.3, crater: 0.5, knockback: 3 },
    trail: { color: 0xff5ad8, width: 0.12, length: 32, additive: true, alpha: 0.95,
      puff: { count: 1, shape: 'ring', blend: 'add', life: [0.35, 0.5], speed: 0, size: 0.14, grow: 0.2, color: 0xffc0f4, color2: 0xff2ab8, alpha: [0.9, 0], drag: 0, spin: 4, scaleCount: false }, puffEvery: 0.05 },
    sfx: { launch: 'release', impact: 'warp', body: 'impact_body', flight: 'whoosh_warp' },
    vfx: { impact: 'warp_in', body: 'impact_body' },
    createModel: () => instance('warp', () => addHook(buildArrow({ shaft: 0x3a1a3a, fletch: 0xff5ad8, fletch2: 0xffffff }))),
    onImpact(p, hit, api) {
      if (hit.kind === 'void') { api.fx('warp_out', hit.x, hit.y); api.sfx('error'); return lostInVoid(p, hit, api); }
      if (hit.kind === 'actor') { boom(p, hit, api, this.damage, 'impact_body', 'impact_body'); return 'remove'; }
      boom(p, hit, api, this.damage, 'impact_dirt', null);
      const a = p.owner, T = api.terrain;
      if (!a || !a.alive) return 'remove';
      let gy = NaN;
      for (const start of [hit.y + 2.2, hit.y + 0.6, hit.y - 0.4]) {
        const g = T.groundBelow(hit.x, start, 5);
        if (!isNaN(g) && !T.solid(hit.x, g + 1.0) && !T.solid(hit.x, g + 2.0)) { gy = g; break; }
      }
      if (isNaN(gy)) { api.fx('warp_out', hit.x, hit.y); api.sfx('error'); api.callout('WARP BLOCKED', 'info'); return 'remove'; }
      api.fx('warp_out', a.x, a.y + 1.1);
      a.x = hit.x; a.y = gy; a.vx = 0; a.vy = 0; a.grounded = true; a.airT = 0;
      a._sync?.();
      api.fx('warp_in', a.x, a.y + 1.1);
      api.sfx('warp');
      api.callout('WARP!', 'info');
      return 'remove';
    },
  },
];
export const getArrow = (id) => ARROWS.find((a) => a.id === id) ?? ARROWS[0];
export const trayArrows = () => ARROWS.filter((a) => !a.hidden);
