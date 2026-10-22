// Game modes -> match configs (owner: Meta specialist). A match config is the ONLY thing the core needs:
// { mode, mapId, seed, hotseat?, fastIntro?, players: [{ charId, outfitId, controller: 'human'|'ai', difficulty, name, team }] }
import { CHARACTERS, outfitsFor } from '../characters/index.js';
import { MAPS } from '../maps/index.js';
import { profile, equipped } from './progression.js';

export const CAMPAIGN = [
  { id: 'c1', name: 'Island Hopper', map: 'sunspire', foe: { charId: 'brock', outfitId: 'brock_beach', difficulty: 'easy' }, bonus: 60 },
  { id: 'c2', name: 'Cold Welcome', map: 'frostpeak', foe: { charId: 'vela', outfitId: 'vela_robes', difficulty: 'easy' }, bonus: 80 },
  { id: 'c3', name: 'Tower Siege', map: 'sunspire', foe: { charId: 'brock', outfitId: 'brock_iron', difficulty: 'normal' }, bonus: 100 },
  { id: 'c4', name: 'Keep Breaker', map: 'frostpeak', foe: { charId: 'brock', outfitId: 'brock_iron', difficulty: 'normal' }, bonus: 130 },
  { id: 'c5', name: 'Starfall Duel', map: 'sunspire', foe: { charId: 'vela', outfitId: 'vela_robes', difficulty: 'hard' }, bonus: 170 },
  { id: 'c6', name: 'Frostpeak Crown', map: 'frostpeak', foe: { charId: 'vela', outfitId: 'vela_leathers', difficulty: 'expert' }, bonus: 240 },
];

function pickFoe(rng, notChar) {
  const pool = CHARACTERS.filter((c) => c.id !== notChar);
  const c = (pool.length ? pool : CHARACTERS)[Math.floor(rng() * (pool.length || CHARACTERS.length))];
  const outs = outfitsFor(c.id); const o = outs[Math.floor(rng() * outs.length)];
  return { charId: c.id, outfitId: o?.id };
}
const me = (over = {}) => { const e = equipped(); return { charId: over.charId ?? e.charId, outfitId: over.outfitId ?? e.outfitId, controller: 'human', team: 0, name: 'You' }; };

export function quickMatch(rng, seed, over = {}) {
  const p = me(over);
  const foe = pickFoe(rng, p.charId);
  const map = over.mapId ?? MAPS[Math.floor(rng() * MAPS.length)].id;
  const diff = profile.level < 3 ? 'easy' : profile.level < 7 ? 'normal' : 'hard';
  return { mode: 'quick', mapId: map, seed, players: [p, { ...foe, controller: 'ai', difficulty: diff, team: 1 }] };
}
export function campaignMatch(stage, seed, over = {}) {
  const S = CAMPAIGN[Math.min(stage, CAMPAIGN.length - 1)];
  return { mode: 'campaign', stage, mapId: S.map, seed, players: [me(over), { ...S.foe, controller: 'ai', team: 1 }] };
}
export function hotseatMatch(rng, seed, over = {}) {
  const p1 = { ...me(over), name: 'P1' }, f = pickFoe(rng, p1.charId);
  return { mode: 'hotseat', hotseat: true, mapId: over.mapId ?? MAPS[Math.floor(rng() * MAPS.length)].id, seed, players: [p1, { ...f, controller: 'human', team: 1, name: 'P2' }] };
}
export function autoplayMatch(rng, seed, over = {}) {
  const a = over.charId ? { charId: over.charId, outfitId: over.outfitId } : pickFoe(rng, null);
  const b = pickFoe(rng, a.charId);
  const map = over.mapId || MAPS[seed % MAPS.length].id;
  return { mode: 'autoplay', fastIntro: true, mapId: map, seed, players: [{ ...a, controller: 'ai', difficulty: 'hard', team: 0 }, { ...b, controller: 'ai', difficulty: 'normal', team: 1 }] };
}
