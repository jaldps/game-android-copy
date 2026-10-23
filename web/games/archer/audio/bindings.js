// Event-driven sounds (owner: Arrows/VFX/Audio specialist). The core plays turn/UI/impact sounds itself; this module adds
// the ones it leaves to us by listening to core events (MODULES.md section 7). Imported once by audio/sfx.js.
// Note: core/audio.js imports sfx.js, which imports this file, so `audio` is only touched inside callbacks (never at load).
import { events } from '../core/events.js';
import { audio } from '../core/audio.js';
import * as sfxModule from './sfx.js';

const o1 = { minGap: 0.15 }, oCrumble = { r: 1, minGap: 0.12 }, oGrunt = { female: false, n: 20, minGap: 0.08 }, oWind = { s: 0, minGap: 0.5 };

events.on('projectile:spawn', (p) => { const id = p?.def?.sfx?.flight; if (id) audio.play(id, o1); });
events.on('terrain:carve', (x, y, r) => { oCrumble.r = r; audio.play('crumble', oCrumble); });
events.on('actor:damage', (a, n) => { oGrunt.female = a?.charDef?.gender === 'f'; oGrunt.n = n; audio.play('grunt', oGrunt); });
events.on('actor:death', (a, cause) => { audio.play(cause === 'fell' ? 'fall' : 'death'); });
events.on('wind', (w) => { oWind.s = w?.strength ?? 0; audio.play('wind_change', oWind); });

// Test hook: ?sfxlog=1 records every recipe that actually synthesizes into window.__sfxLog (id list), so headless runs can
// verify the audio graph is built for each event without hearing it.
if (typeof location !== 'undefined' && /[?&]sfxlog=1/.test(location.search)) {
  window.__sfxLog = [];
  setTimeout(() => {
    const S = sfxModule.SFX;
    for (const id of Object.keys(S)) {
      const fn = S[id];
      S[id] = (k, o) => { fn(k, o); window.__sfxLog.push(id); };
    }
  }, 0);
}
