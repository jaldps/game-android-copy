// Outfit registry (owner: Characters specialist). Each outfit = palette overrides + clothing builder + a perk.
// Shape: { id, char, name, type: keyof PERK_TYPES, price, perkText, mods (see perks.js), colors, bow?, build(ctx) }
// Outfits live per hero in outfits/<char>.js. Within a hero, the FIRST outfit is the free starter (price 0).
// colors.hatOn = 1 tells the hero's build() that headgear replaces the top of the hairdo.
import vela from './outfits/vela.js';
import brock from './outfits/brock.js';
import nyx from './outfits/nyx.js';
import kaito from './outfits/kaito.js';
import sahra from './outfits/sahra.js';
import bjorn from './outfits/bjorn.js';

export const OUTFITS = { ...vela, ...brock, ...nyx, ...kaito, ...sahra, ...bjorn };
