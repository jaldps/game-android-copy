// Map registry (owner: Maps specialist). The core imports ONLY from this file. Interface: see MODULES.md "Maps".
import sunspire from './sunspire.js';
import frostpeak from './frostpeak.js';
import { createTerrainMaterial } from './terrainMaterial.js';
import { PROP_TYPES, createPropMaterial } from './props.js';

export const MAPS = [sunspire, frostpeak];
export const getMap = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];
export { PROP_TYPES, createPropMaterial };
/** Terrain material for a map (a map may override with def.createTerrainMaterial(palette)). */
export function terrainMaterialFor(def) { return def.createTerrainMaterial ? def.createTerrainMaterial(def.palette) : createTerrainMaterial(def.palette); }
