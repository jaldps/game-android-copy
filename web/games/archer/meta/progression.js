// Profile, economy and rewards (owner: Meta specialist). Persisted under archer.profile (see core/store.js).
// The profile is migrated, never wiped: new registry entries (heroes/outfits/arrows added by other specialists)
// are merged in on load, and missing fields are filled from DEFAULT().
import { store } from '../core/store.js';
import { CHARACTERS, OUTFITS, defaultOutfit, getCharacter, getOutfit } from '../characters/index.js';
import { ARROWS, trayArrows } from '../arrows/index.js';

export const START_COINS = 500;
export const LOADOUT_SLOTS = 4;           // special arrows you can bring into a match (standard is always in)

const DEFAULT = () => ({
  v: 1, coins: START_COINS, xp: 0, level: 1,
  owned: {
    chars: CHARACTERS.filter((c) => !c.price).map((c) => c.id),
    outfits: Object.values(OUTFITS).filter((o) => !o.price).map((o) => o.id),
    arrows: ARROWS.filter((a) => !a.price).map((a) => a.id),
  },
  equipped: { char: (CHARACTERS.find((c) => !c.price) ?? CHARACTERS[0]).id, outfit: Object.fromEntries(CHARACTERS.map((c) => [c.id, defaultOutfit(c.id)?.id])) },
  loadout: null,                          // null = every owned special arrow (up to LOADOUT_SLOTS)
  campaign: { stage: 0, stars: {} },
  quick: { mapId: null, foe: null, difficulty: 'normal' },
  hotseat: { p2: null, mapId: null },
  totals: { matches: 0, wins: 0, headshots: 0, damage: 0 },
  settings: { quality: 'high' },
});

export const profile = (() => {
  const d = DEFAULT();
  const p = store.get('profile', null);
  if (!p || typeof p !== 'object' || p.v !== 1) return d;
  const out = { ...d, ...p };
  for (const k of ['owned', 'equipped', 'campaign', 'quick', 'hotseat', 'totals', 'settings']) out[k] = { ...d[k], ...(p[k] ?? {}) };
  for (const k of ['chars', 'outfits', 'arrows']) {
    out.owned[k] = Array.isArray(out.owned[k]) ? out.owned[k] : [];
    for (const id of d.owned[k]) if (!out.owned[k].includes(id)) out.owned[k].push(id);
  }
  out.equipped.outfit = { ...d.equipped.outfit, ...(p.equipped?.outfit ?? {}) };
  if (!out.owned.chars.includes(out.equipped.char)) out.equipped.char = d.equipped.char;
  out.campaign.stars = { ...(p.campaign?.stars ?? {}) };
  return out;
})();

export function save() { store.set('profile', profile); }
export const xpForLevel = (lv) => 220 + (lv - 1) * 140;
export function owns(kind, id) { return profile.owned[kind].includes(id); }

/** Price of any shop item, read from its registry entry (never duplicated here). */
export function priceOf(kind, id) {
  if (kind === 'chars') return getCharacter(id).price ?? 0;
  if (kind === 'outfits') return getOutfit(id)?.price ?? 0;
  return ARROWS.find((a) => a.id === id)?.price ?? 0;
}
/** Why an item can't be bought right now (null = it can). */
export function blocker(kind, id) {
  if (owns(kind, id)) return 'owned';
  if (kind === 'outfits') { const o = getOutfit(id); if (o && !owns('chars', o.char)) return 'hero'; }
  if (profile.coins < priceOf(kind, id)) return 'coins';
  return null;
}
export function buy(kind, id) {
  if (blocker(kind, id)) return false;
  profile.coins -= priceOf(kind, id); profile.owned[kind].push(id);
  if (kind === 'arrows' && profile.loadout && profile.loadout.length < LOADOUT_SLOTS) profile.loadout.push(id);
  save(); return true;
}
export function equipChar(id) { if (!owns('chars', id)) return; profile.equipped.char = id; save(); }
export function equipOutfit(charId, outfitId) { if (!owns('outfits', outfitId)) return; profile.equipped.outfit[charId] = outfitId; save(); }
export function equipped() { const c = profile.equipped.char; return { charId: c, outfitId: profile.equipped.outfit[c] }; }

// ---------------------------------------------------------------- arrow loadout
const specials = () => trayArrows().filter((a) => a.uses !== Infinity);
export function loadout() {
  const own = specials().filter((a) => owns('arrows', a.id)).map((a) => a.id);
  const l = (profile.loadout ?? own).filter((id) => own.includes(id));
  return l.slice(0, LOADOUT_SLOTS);
}
export function toggleLoadout(id) {
  const l = loadout(), i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else if (l.length < LOADOUT_SLOTS && owns('arrows', id)) l.push(id); else return false;
  profile.loadout = l; save(); return true;
}
/** Per-match ammo for the human player: unowned / unequipped specials get 0. */
export function ammoFor() {
  const l = loadout(), ammo = {};
  for (const a of trayArrows()) ammo[a.id] = a.uses === Infinity ? a.uses : l.includes(a.id) ? a.uses : 0;
  return ammo;
}

// ---------------------------------------------------------------- rewards
export const DIFF_MULT = { easy: 0.8, normal: 1, hard: 1.3, expert: 1.6 };

/** Stars: 1 = win, 2 = win with >= 40% HP left, 3 = win with >= 70% HP left or 2+ headshots. */
export function starsFor(summary) {
  if (!summary.won) return 0;
  const me = summary.actors.find((a) => a.human) ?? summary.actors[0];
  const k = me.hp / Math.max(1, me.maxHp);
  return 1 + (k >= 0.4 ? 1 : 0) + (k >= 0.7 || me.headshots >= 2 ? 1 : 0);
}

/**
 * Apply match rewards. extra: { difficulty, stageBonus, firstClear }.
 * Returns { coins, xp, stars, lines: [[label, coins]], levelUp, before: {level,xp,need,coins}, after: {level,xp,need,coins} }.
 */
export function rewardLines(summary, extra = {}) {
  const me = summary.actors.find((a) => a.human) ?? summary.actors[0];
  const stars = starsFor(summary), mult = DIFF_MULT[extra.difficulty] ?? 1;
  const lines = [];
  lines.push([summary.won ? 'Victory' : 'Battle fought', summary.won ? 100 : 30]);
  if (me.damage > 0) lines.push([`Damage dealt (${me.damage})`, Math.round(me.damage * 0.5)]);
  if (me.headshots > 0) lines.push([`Headshots ×${me.headshots}`, me.headshots * 25]);
  if (stars > 0) lines.push([`Stars ×${stars}`, stars * 25]);
  if (mult !== 1) { const sub = lines.reduce((s, l) => s + l[1], 0); lines.push([`${(extra.difficulty ?? '').toUpperCase()} difficulty ×${mult}`, Math.round(sub * (mult - 1))]); }
  if (extra.stageBonus) lines.push([extra.firstClear ? 'Stage cleared!' : 'Stage replay', extra.firstClear ? extra.stageBonus : Math.round(extra.stageBonus / 4)]);
  return { lines, stars, mult, me };
}
export function grantRewards(summary, extra = {}) {
  const { lines, stars, mult, me } = rewardLines(summary, extra);
  const coins = lines.reduce((s, l) => s + l[1], 0);
  const xp = Math.round(((summary.won ? 80 : 30) + me.damage * 0.35 + me.headshots * 12) * mult);
  const before = { level: profile.level, xp: profile.xp, need: xpForLevel(profile.level), coins: profile.coins };
  profile.coins += coins; profile.xp += xp;
  let levelUp = 0;
  while (profile.xp >= xpForLevel(profile.level)) { profile.xp -= xpForLevel(profile.level); profile.level++; levelUp++; profile.coins += 100; }
  if (levelUp) lines.push([`Level up bonus`, 100 * levelUp]);
  profile.totals.matches++; if (summary.won) profile.totals.wins++;
  profile.totals.headshots += me.headshots; profile.totals.damage += me.damage;
  save();
  return { coins: coins + 100 * levelUp, xp, stars, lines, levelUp: levelUp > 0, before, after: { level: profile.level, xp: profile.xp, need: xpForLevel(profile.level), coins: profile.coins } };
}
