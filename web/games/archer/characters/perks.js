// Outfit perk types + stat computation (owner: Characters specialist).
// The core consumes ONLY the object returned by computeStats(); never read raw mods elsewhere.
import { TURN } from '../core/config.js';

const ICON = {
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" fill="currentColor"/></svg>',
  wind: '<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M2 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 9c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.4" fill="none"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2.4" fill="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
};

/** Perk archetypes from the brief. mods are fractional unless noted. */
export const PERK_TYPES = {
  armor:    { icon: ICON.shield, label: 'Armor',    color: '#9fb6d4' },
  robes:    { icon: ICON.wind,   label: 'Robes',    color: '#c69cff' },
  swimwear: { icon: ICON.wave,   label: 'Beachwear', color: '#62d6ff' },
  leathers: { icon: ICON.target, label: 'Leathers', color: '#ffb35c' },
};

/**
 * Mods (all optional): hp (+flat), move (+frac), knockback (+frac), windResist (+abs 0..1), preview (+frac),
 * delay (+frac turn delay), headshot (+frac bonus), direct (+frac bonus), drawSpeed (+frac).
 * Returns the stats object the core uses.
 */
export function computeStats(charDef, outfitDef) {
  const s = charDef.stats ?? {}, m = outfitDef?.mods ?? {};
  return {
    maxHp: Math.round((s.hp ?? 100) + (m.hp ?? 0)),
    moveGauge: TURN.moveGauge * (s.move ?? 1) * (1 + (m.move ?? 0)),
    windResist: Math.min(0.8, (s.windResist ?? 0) + (m.windResist ?? 0)),
    drawTime: TURN.chargeTime / ((s.drawSpeed ?? 1) * (1 + (m.drawSpeed ?? 0))),
    knockbackMult: Math.max(0.2, 1 + (m.knockback ?? 0)),
    previewLen: 3.2 * (1 + (m.preview ?? 0)),
    delayMult: Math.max(0.5, 1 + (m.delay ?? 0)),
    headshotMult: 1 + (m.headshot ?? 0),
    directMult: 1 + (m.direct ?? 0),
  };
}
