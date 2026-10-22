// Characters registry + factory (owner: Characters specialist). The core imports ONLY from this file.
//   CHARACTERS            ordered list of character defs (roster/*.js)
//   getCharacter(id)      def or the first one
//   OUTFITS / getOutfit(id) / outfitsFor(charId)
//   PERK_TYPES, computeStats(charDef, outfitDef)
//   createCharacter(def, outfit) -> Character (see rig.js for the runtime API)
import vela from './roster/vela.js';
import brock from './roster/brock.js';
import { OUTFITS } from './outfits.js';
import { PERK_TYPES, computeStats } from './perks.js';
import { RigBuilder, Character, createCharacterMaterial } from './rig.js';
import { makeCtx, buildBody, buildHead, buildBow } from './body.js';

export const CHARACTERS = [vela, brock];
export { OUTFITS, PERK_TYPES, computeStats };
export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
export const getOutfit = (id) => OUTFITS[id] ?? null;
export const outfitsFor = (charId) => Object.values(OUTFITS).filter((o) => o.char === charId);
export const defaultOutfit = (charId) => outfitsFor(charId)[0] ?? null;

/** Build a fully rigged, animated character. outfit may be null (defaults to the character's first outfit). */
export function createCharacter(def, outfit = null) {
  outfit = outfit ?? defaultOutfit(def.id);
  const colors = { ...def.palette, ...(outfit?.colors ?? {}) };
  const rig = new RigBuilder(def.body);
  const ctx = makeCtx(rig, def, colors);
  buildBody(ctx);
  buildHead(ctx, { ...def.face, lips: def.face?.lips ?? (def.gender === 'f' ? colors.lips : undefined) });
  def.build?.(ctx);
  outfit?.build?.(ctx);
  const parts = rig.build(createCharacterMaterial());
  const bow = buildBow({ ...(def.bow ?? {}), ...(outfit?.bow ?? {}) });
  const ch = new Character(parts, def.body, bow, def);
  ch.outfit = outfit;
  return ch;
}
