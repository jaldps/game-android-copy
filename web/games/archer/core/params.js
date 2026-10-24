// Parsed URL testing hooks (see SPEC.md / brief). Read-only after load.
import { params } from '../../../shared/platform.js';

const num = (k, d) => { const v = params.get(k); return v === null || v === '' || isNaN(+v) ? d : +v; };
export const P = {
  autoplay: params.get('autoplay') === '1',
  scene: params.get('scene') || '',          // menu | play | over | shop
  seed: params.has('seed') ? (num('seed', 1) >>> 0) : null,
  warp: Math.max(0, num('warp', 0)),
  fixedstep: params.get('fixedstep') === '1',
  map: params.get('map') || '',
  char: params.get('char') || '',
  outfit: params.get('outfit') || '',
  arrow: params.get('arrow') || '',
  quality: params.get('quality') || '',
  hud: params.get('hud') !== '0',
};
