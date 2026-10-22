// Meta layer entry (owner: Meta specialist): screens, flow between them, rewards, AI controllers.
// The core (main.js) calls ONLY: createMeta(app) -> { showMenu, showShop, showResults, onMatchEnd, showPause, hidePause,
//   isBlocking, back, createController, autoplayConfig, quickConfig }.
import { menuScreen, pauseScreen, resultsScreen, settingsScreen } from './screens.js';
import { shopScreen } from './shop.js';
import { createAIController } from './ai.js';
import { profile, save, grantRewards, equipChar, owns } from './progression.js';
import { quickMatch, campaignMatch, hotseatMatch, autoplayMatch, CAMPAIGN } from './modes.js';
import { CHARACTERS } from '../characters/index.js';

export function createMeta(app) {
  const root = document.getElementById('screens');
  let current = null, mode = 'none', pauseNode = null, lastCfg = null, overlay = null;
  const sfx = (id) => app.audio.play(id);
  const mount = (node, m) => {
    if (current) { const old = current; old.classList.add('leaving'); setTimeout(() => old.remove(), 220); }
    current = node; mode = m; if (node) { root.appendChild(node); requestAnimationFrame(() => node.classList.add('in')); }
  };
  const start = (cfg) => { lastCfg = cfg; mount(null, 'play'); app.startMatch(cfg); };

  const api = {
    showMenu() {
      app.showcase(profile.equipped.char, profile.equipped.outfit[profile.equipped.char]);
      app.audio.playMusic('menu');
      mount(menuScreen({
        quick: () => { sfx('ui_click'); start(quickMatch(app.rng, app.newSeed())); },
        campaign: () => { sfx('ui_click'); start(campaignMatch(profile.campaign.stage, app.newSeed())); },
        hotseat: () => { sfx('ui_click'); start(hotseatMatch(app.rng, app.newSeed())); },
        shop: () => { sfx('ui_click'); api.showShop(); },
        home: () => app.goHome(),
        settings: () => { sfx('ui_click'); api.showSettings(); },
        cycle: (d) => {
          const owned = CHARACTERS.filter((c) => owns('chars', c.id));
          const i = owned.findIndex((c) => c.id === profile.equipped.char);
          const next = owned[(i + d + owned.length) % owned.length];
          equipChar(next.id); sfx('select'); api.showMenu();
        },
      }), 'menu');
    },
    showShop() {
      app.showcase(profile.equipped.char, profile.equipped.outfit[profile.equipped.char]);
      mount(shopScreen({
        back: () => { sfx('ui_back'); api.showMenu(); },
        preview: (c, o) => app.restyle(c, o),
        click: () => sfx('ui_click'), error: () => sfx('error'), bought: () => sfx('buy'),
      }), 'shop');
    },
    showSettings() {
      mount(settingsScreen({
        back: () => { sfx('ui_back'); api.showMenu(); }, quality: () => app.toggleQuality(), muted: () => app.audio.muted,
        toggleSound: () => { app.audio.unlock(); app.audio.setMuted(!app.audio.muted); sfx('ui_click'); },
      }, app.quality()), 'settings');
    },
    showResults(summary, reward) {
      app.hud(false);
      mount(resultsScreen(summary, reward, {
        again: () => {
          sfx('ui_click');
          if (summary.mode === 'campaign') start(campaignMatch(profile.campaign.stage, app.newSeed()));
          else if (summary.mode === 'hotseat') start(hotseatMatch(app.rng, app.newSeed(), { mapId: summary.mapId }));
          else start(quickMatch(app.rng, app.newSeed()));
        },
        menu: () => { sfx('ui_back'); api.showMenu(); },
      }), 'results');
      sfx(summary.won || summary.mode === 'hotseat' ? 'victory' : 'defeat');
    },
    /** Called by the core when a match finishes. */
    onMatchEnd(summary) {
      let bonus = 0;
      if (summary.mode === 'campaign' && summary.won) {
        const st = lastCfg?.stage ?? profile.campaign.stage, S = CAMPAIGN[st];
        bonus = S?.bonus ?? 0;
        profile.campaign.stars[S.id] = Math.max(profile.campaign.stars[S.id] ?? 0, 1);
        if (st === profile.campaign.stage && st < CAMPAIGN.length - 1) profile.campaign.stage++;
        save();
      }
      const reward = summary.mode === 'hotseat' ? { coins: 0, xp: 0, stars: 3, levelUp: false, after: { level: profile.level, xp: profile.xp, need: 1 } } : grantRewards(summary, { bonus });
      api.showResults(summary, reward);
    },
    showPause() {
      if (pauseNode) return;
      pauseNode = pauseScreen({
        resume: () => { sfx('ui_click'); api.hidePause(); },
        quit: () => { sfx('ui_back'); api.hidePause(true); app.endMatch(); api.showMenu(); },
        home: () => app.goHome(), quality: () => app.toggleQuality(), muted: () => app.audio.muted,
        toggleSound: () => { app.audio.unlock(); app.audio.setMuted(!app.audio.muted); sfx('ui_click'); },
      }, app.quality());
      root.appendChild(pauseNode); requestAnimationFrame(() => pauseNode?.classList.add('in'));
      app.setPaused(true);
    },
    hidePause(silent) { if (!pauseNode) return; pauseNode.remove(); pauseNode = null; if (!silent) app.setPaused(false); else app.setPaused(false); },
    isPauseOpen: () => !!pauseNode,
    /** True while a menu-type screen covers the game (input to the match is blocked). */
    isBlocking: () => !!pauseNode || (mode !== 'play' && mode !== 'none'),
    /** Hardware back. Returns true if consumed. */
    back() {
      if (pauseNode) { api.hidePause(); return true; }
      if (mode === 'play') { api.showPause(); return true; }
      if (mode === 'shop' || mode === 'settings' || mode === 'results') { api.showMenu(); return true; }
      return false;
    },
    createController(pc, slot) { return createAIController(pc.difficulty ?? 'normal', (app.seed() + slot * 977) >>> 0); },
    autoplayConfig: (seed, over) => autoplayMatch(app.rng, seed, over),
    quickConfig: (seed, over) => quickMatch(app.rng, seed, over),
    setMode(m) { mode = m; },
    get mode() { return mode; },
  };
  return api;
}
