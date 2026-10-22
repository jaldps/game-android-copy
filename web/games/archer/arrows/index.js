// Arrow-type registry (owner: Arrows/VFX/Audio specialist). The core imports ONLY from this file.
// See MODULES.md "Arrow types" for the full interface. Order of ARROWS = order in the in-game tray.
import { buildArrow, instance, addBomb, addRune } from './models.js';

const ICON = {
  standard: '<svg viewBox="0 0 32 32"><path d="M4 28 24 8" stroke="#f3e2c0" stroke-width="3" stroke-linecap="round"/><path d="M28 4l-9 3 6 6z" fill="#dfe6ee"/><path d="M4 28l1-7 3 3zM4 28l7-1-3-3z" fill="#e8423f"/></svg>',
  explosive: '<svg viewBox="0 0 32 32"><path d="M4 28 18 14" stroke="#f3e2c0" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="12" r="7" fill="#d23a2a"/><circle cx="18" cy="10" r="2.2" fill="#ff8a7a"/><path d="M24 6l3-3" stroke="#ffd27a" stroke-width="2.4" stroke-linecap="round"/><circle cx="27.5" cy="3.5" r="2" fill="#ffd27a"/></svg>',
  splitter: '<svg viewBox="0 0 32 32"><g stroke="#9fe6ff" stroke-width="2.6" stroke-linecap="round"><path d="M4 28 16 16"/><path d="M16 16 28 6"/><path d="M16 16 29 16"/><path d="M16 16 22 28"/></g><circle cx="16" cy="16" r="3.4" fill="#4fb6ff"/></svg>',
};

/**
 * Arrow def fields:
 *  id, name, desc, icon (svg), color (css accent), price (shop coins; 0 = owned), uses (per match, Infinity = unlimited),
 *  delay (extra Gunbound turn delay), hidden (true = not shown in the tray; e.g. split shards)
 *  physics { mass, drag, windFactor, gravityScale }      — heavier = less wind drift
 *  damage  { base, radius, crater, knockback }           — default onImpact explodes with these
 *  trail   { color, width, length, additive, puff?: Emitter, puffEvery? }
 *  sfx     { launch, impact, body }   vfx { impact, body }   stick (leave the arrow stuck in terrain)
 *  createModel() -> Object3D (tip at origin, shaft along -X)
 *  hooks (all optional): onLaunch(p, api), onUpdate(p, dt, api) -> false to stop default integration this step,
 *         onImpact(p, hit, api) -> 'remove' | 'keep' (default: api.explode(...) then remove)
 */
export const ARROWS = [
  {
    id: 'standard', name: 'Broadhead', desc: 'Reliable steel tip. Bonus on direct hits.', icon: ICON.standard, color: '#f3e2c0',
    price: 0, uses: Infinity, delay: 0,
    physics: { mass: 1, drag: 0.012, windFactor: 1, gravityScale: 1 },
    damage: { base: 32, radius: 1.5, crater: 0.9, knockback: 5 },
    trail: { color: 0xffffff, width: 0.13, length: 26, additive: false, alpha: 0.85 },
    sfx: { launch: 'release', impact: 'impact_dirt', body: 'impact_body' },
    vfx: { impact: 'impact_dirt', body: 'impact_body' },
    stick: true,
    createModel: () => instance('standard', () => buildArrow({})),
  },
  {
    id: 'explosive', name: 'Blast Arrow', desc: 'Heavy payload. Huge crater, shrugs off wind.', icon: ICON.explosive, color: '#ff6a4a',
    price: 0, uses: 2, delay: 160, ai: { weight: 1.6, minTargetHp: 20 },
    physics: { mass: 1.6, drag: 0.02, windFactor: 1, gravityScale: 1.08 },
    damage: { base: 40, radius: 3.3, crater: 2.9, knockback: 12 },
    trail: { color: 0xffb35c, width: 0.18, length: 28, additive: true, alpha: 0.95,
      puff: { count: 1, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [0.2, 0.6], size: [0.12, 0.2], grow: 2.4, color: 0x8a7a72, color2: 0xe8ded5, alpha: [0.7, 0], drag: 2, lift: 0.8, scaleCount: false }, puffEvery: 0.03 },
    sfx: { launch: 'release', impact: 'explosion', body: 'explosion' },
    vfx: { impact: 'explosion', body: 'explosion' },
    createModel: () => instance('explosive', () => addBomb(buildArrow({ shaft: 0x3a2a24, fletch: 0xff8a2a, fletch2: 0x2a2a32 }))),
  },
  {
    id: 'splitter', name: 'Tri-Splitter', desc: 'Splits into three at the top of its arc.', icon: ICON.splitter, color: '#7fd8ff',
    price: 0, uses: 2, delay: 120, ai: { weight: 1 },
    physics: { mass: 0.9, drag: 0.012, windFactor: 1.1, gravityScale: 1 },
    damage: { base: 24, radius: 1.4, crater: 1.0, knockback: 4 },
    trail: { color: 0x7fd8ff, width: 0.15, length: 26, additive: true, alpha: 0.95 },
    sfx: { launch: 'release', impact: 'impact_dirt', body: 'impact_body' },
    vfx: { impact: 'impact_dirt', body: 'impact_body' },
    createModel: () => instance('splitter', () => addRune(buildArrow({ shaft: 0x2a3a5a, head: 0x9fe6ff, fletch: 0x4fb6ff, fletch2: 0xe8f8ff, headShape: 'tri', glow: 0x2a8acc }), 0x7fd8ff)),
    onUpdate(p, dt, api) {
      if (!p.data.split && p.age > 0.25 && p.vy <= 0) {
        p.data.split = true;
        const sp = Math.hypot(p.vx, p.vy), a = Math.atan2(p.vy, p.vx);
        for (const [da, k] of [[-0.16, 0.92], [0, 1], [0.16, 1.07]]) {
          api.spawn('shard', p.x, p.y, Math.cos(a + da) * sp * k, Math.sin(a + da) * sp * k, { parent: p });
        }
        api.fx('split', p.x, p.y); api.sfx('split');
        p.alive = false;
      }
    },
  },
  {
    id: 'shard', name: 'Shard', hidden: true, icon: ICON.splitter, color: '#7fd8ff', price: 0, uses: Infinity, delay: 0,
    physics: { mass: 0.9, drag: 0.012, windFactor: 1.1, gravityScale: 1 },
    damage: { base: 22, radius: 1.5, crater: 1.1, knockback: 4 },
    trail: { color: 0x7fd8ff, width: 0.07, length: 16, additive: true, alpha: 0.85 },
    sfx: { launch: null, impact: 'impact_dirt', body: 'impact_body' },
    vfx: { impact: 'impact_dirt', body: 'impact_body' },
    createModel: () => instance('shard', () => buildArrow({ shaft: 0x2a3a5a, head: 0x9fe6ff, fletch: 0x4fb6ff, fletch2: 0xe8f8ff, headShape: 'tri', glow: 0x2a8acc })),
  },
];
export const getArrow = (id) => ARROWS.find((a) => a.id === id) ?? ARROWS[0];
export const trayArrows = () => ARROWS.filter((a) => !a.hidden);
