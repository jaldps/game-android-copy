// Game modes -> match configs (owner: Meta specialist). A MatchConfig is the ONLY thing the core needs:
// { mode, mapId, seed, stage?, hotseat?, fastIntro?, players: [{ charId, outfitId, controller, difficulty, name, team, ammo? }] }
// Everything reads the registries at runtime, so heroes/maps added by other specialists join automatically.
import { CHARACTERS, outfitsFor, getCharacter } from '../characters/index.js';
import { MAPS, getMap } from '../maps/index.js';
import { profile, equipped, ammoFor, owns } from './progression.js';

export const DIFFS = ['easy', 'normal', 'hard', 'expert'];

// Campaign ladder: two passes over every map with rising difficulty. Stage i is fought on MAPS[i % n].
const LADDER = [
  ['Island Hopper', 'easy', 60], ['Cold Welcome', 'easy', 80], ['Ruin Raiders', 'normal', 100], ['Into the Forge', 'normal', 120],
  ['Neon Nights', 'normal', 140], ['Sky Siege', 'hard', 170], ['Whiteout', 'hard', 200], ['Sandstorm', 'hard', 230],
  ['Molten Crown', 'expert', 270], ['Champion of Heights', 'expert', 350],
];
export const CAMPAIGN = LADDER.map(([name, difficulty, bonus], i) => {
  const map = MAPS[i % MAPS.length];
  const c = CHARACTERS[(i * 5 + 1) % CHARACTERS.length], outs = outfitsFor(c.id);
  const o = outs[(i >> 1) % Math.max(1, outs.length)];
  return { id: 'c' + (i + 1), n: i + 1, name, map: map.id, bonus, foe: { charId: c.id, outfitId: o?.id, difficulty } };
});

export function pickFoe(rng, notChar) {
  const pool = CHARACTERS.filter((c) => c.id !== notChar);
  const list = pool.length ? pool : CHARACTERS;
  const c = list[Math.floor(rng() * list.length)];
  const outs = outfitsFor(c.id); const o = outs[Math.floor(rng() * outs.length)];
  return { charId: c.id, outfitId: o?.id };
}
const foeOf = (charId, rng) => { const outs = outfitsFor(charId); return { charId, outfitId: outs[Math.floor(rng() * outs.length)]?.id }; };

/** The human player's slot from the profile (equipped hero + outfit + arrow loadout). */
export function me(over = {}) {
  // over.force (the ?char= / ?outfit= test hooks) shows any hero, owned or not
  const e = equipped(), c = over.charId && (over.force || owns('chars', over.charId)) ? getCharacter(over.charId).id : e.charId;
  return { charId: c, outfitId: over.outfitId ?? profile.equipped.outfit[c], controller: 'human', team: 0, name: 'You', ammo: ammoFor() };
}
const randomMap = (rng) => MAPS[Math.floor(rng() * MAPS.length)].id;

/** over: { mapId?, foeId?, difficulty?, charId?, outfitId? } (null / 'random' = random). */
export function quickMatch(rng, seed, over = {}) {
  const p = me(over);
  const foe = over.foeId && over.foeId !== 'random' ? foeOf(getCharacter(over.foeId).id, rng) : pickFoe(rng, p.charId);
  const map = over.mapId && over.mapId !== 'random' ? getMap(over.mapId).id : randomMap(rng);
  const diff = over.difficulty ?? profile.quick?.difficulty ?? 'normal';
  return { mode: 'quick', mapId: map, seed, difficulty: diff, players: [p, { ...foe, controller: 'ai', difficulty: diff, team: 1, name: getCharacter(foe.charId).name }] };
}
export function campaignMatch(stage, seed, over = {}) {
  const S = CAMPAIGN[Math.max(0, Math.min(stage, CAMPAIGN.length - 1))];
  return { mode: 'campaign', stage: S.n - 1, mapId: S.map, seed, difficulty: S.foe.difficulty,
    players: [me(over), { ...S.foe, controller: 'ai', team: 1, name: getCharacter(S.foe.charId).name }] };
}
/** over: { mapId?, p1?, p2? } — both hot-seat heroes come from the owned roster, each with its equipped outfit. */
export function hotseatMatch(rng, seed, over = {}) {
  const p1c = over.p1 && owns('chars', over.p1) ? over.p1 : equipped().charId;
  const p1 = { ...me({ charId: p1c }), name: 'P1' };
  const p2c = over.p2 && owns('chars', over.p2) ? over.p2 : (CHARACTERS.find((c) => owns('chars', c.id) && c.id !== p1c) ?? getCharacter(p1c)).id;
  const p2 = { charId: p2c, outfitId: profile.equipped.outfit[p2c], controller: 'human', team: 1, name: 'P2', ammo: ammoFor() };
  const map = over.mapId && over.mapId !== 'random' ? getMap(over.mapId).id : randomMap(rng);
  return { mode: 'hotseat', hotseat: true, mapId: map, seed, players: [p1, p2] };
}
export function autoplayMatch(rng, seed, over = {}) {
  const a = over.charId ? { charId: over.charId, outfitId: over.outfitId } : pickFoe(rng, null);
  const b = pickFoe(rng, a.charId);
  const map = over.mapId || MAPS[seed % MAPS.length].id;
  return { mode: 'autoplay', fastIntro: true, mapId: map, seed, players: [
    { ...a, controller: 'ai', difficulty: 'hard', team: 0, name: getCharacter(a.charId).name },
    { ...b, controller: 'ai', difficulty: 'normal', team: 1, name: getCharacter(b.charId).name }] };
}
/** Live AI-vs-AI duel behind the title screen, starring the equipped hero. */
export function menuBackdrop(rng, seed) {
  const e = equipped(), b = pickFoe(rng, e.charId);
  return { mode: 'menubg', fastIntro: true, mapId: randomMap(rng), seed, players: [
    { ...e, controller: 'ai', difficulty: 'hard', team: 0, name: getCharacter(e.charId).name },
    { ...b, controller: 'ai', difficulty: 'hard', team: 1, name: getCharacter(b.charId).name }] };
}
