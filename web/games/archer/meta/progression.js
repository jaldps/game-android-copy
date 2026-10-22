// Profile, economy and rewards (owner: Meta specialist). Persisted under archer.profile (see core/store.js).
import { store } from '../core/store.js';
import { CHARACTERS, OUTFITS, defaultOutfit } from '../characters/index.js';
import { ARROWS } from '../arrows/index.js';

const DEFAULT = () => ({
  v: 1, coins: 400, xp: 0, level: 1,
  owned: {
    chars: CHARACTERS.filter((c) => !c.price).map((c) => c.id),
    outfits: Object.values(OUTFITS).filter((o) => !o.price).map((o) => o.id),
    arrows: ARROWS.filter((a) => !a.price).map((a) => a.id),
  },
  equipped: { char: CHARACTERS[0].id, outfit: Object.fromEntries(CHARACTERS.map((c) => [c.id, defaultOutfit(c.id)?.id])) },
  campaign: { stage: 0, stars: {} },
  totals: { matches: 0, wins: 0, headshots: 0 },
  settings: { quality: 'high' },
});

export const profile = (() => {
  const p = store.get('profile', null);
  const d = DEFAULT();
  if (!p || p.v !== 1) return d;
  // merge new registry entries (specialists add content later)
  for (const k of ['chars', 'outfits', 'arrows']) for (const id of d.owned[k]) if (!p.owned[k].includes(id)) p.owned[k].push(id);
  for (const c of CHARACTERS) if (!p.equipped.outfit[c.id]) p.equipped.outfit[c.id] = d.equipped.outfit[c.id];
  return { ...d, ...p, settings: { ...d.settings, ...p.settings } };
})();

export function save() { store.set('profile', profile); }
export const xpForLevel = (lv) => 200 + (lv - 1) * 120;
export function owns(kind, id) { return profile.owned[kind].includes(id); }
export function buy(kind, id, price) {
  if (owns(kind, id) || profile.coins < price) return false;
  profile.coins -= price; profile.owned[kind].push(id); save(); return true;
}
export function equipChar(id) { profile.equipped.char = id; save(); }
export function equipOutfit(charId, outfitId) { profile.equipped.outfit[charId] = outfitId; save(); }
export function equipped() { const c = profile.equipped.char; return { charId: c, outfitId: profile.equipped.outfit[c] }; }

/** Stars: 1 = win, 2 = win with >= 40% HP left, 3 = win with >= 70% HP left or 2+ headshots. */
export function starsFor(summary) {
  if (!summary.won) return 0;
  const me = summary.actors.find((a) => a.human) ?? summary.actors[0];
  const k = me.hp / me.maxHp;
  return 1 + (k >= 0.4 ? 1 : 0) + (k >= 0.7 || me.headshots >= 2 ? 1 : 0);
}
/** Apply match rewards; returns a breakdown for the results screen. */
export function grantRewards(summary, extra = {}) {
  const me = summary.actors.find((a) => a.human) ?? summary.actors[0];
  const stars = starsFor(summary);
  const coins = Math.round((summary.won ? 120 : 40) + me.damage * 0.6 + me.headshots * 25 + stars * 20 + (extra.bonus ?? 0));
  const xp = Math.round((summary.won ? 90 : 35) + me.damage * 0.4 + me.headshots * 15);
  const before = { level: profile.level, xp: profile.xp };
  profile.coins += coins; profile.xp += xp;
  let levelUp = false;
  while (profile.xp >= xpForLevel(profile.level)) { profile.xp -= xpForLevel(profile.level); profile.level++; levelUp = true; profile.coins += 100; }
  profile.totals.matches++; if (summary.won) profile.totals.wins++; profile.totals.headshots += me.headshots;
  save();
  return { coins, xp, stars, levelUp, before, after: { level: profile.level, xp: profile.xp, need: xpForLevel(profile.level) } };
}
