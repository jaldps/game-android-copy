// Meta layer entry (owner: Meta specialist): screens, flow between them, rewards, campaign, hot-seat handover,
// the live title backdrop, the hero turntable and AI controllers.
// The core (main.js) calls ONLY: createMeta(app) -> { showMenu, showShop, showResults, onMatchEnd, showPause, hidePause,
//   isPauseOpen, isBlocking, back, setMode, mode, createController, autoplayConfig, quickConfig }.
import { menuScreen, heroScreen, campaignScreen, setupScreen, pauseScreen, resultsScreen, settingsScreen, handoverScreen, ICONS, setThumbSource } from './screens.js';
export { portrait, setPortraitSource } from './screens.js';
import { shopScreen } from './shop.js';
import { createAIController } from './ai.js';
import { profile, save, grantRewards, equipChar, equipOutfit, buy, blocker, priceOf, starsFor } from './progression.js';
import { quickMatch, campaignMatch, hotseatMatch, autoplayMatch, CAMPAIGN } from './modes.js';
import { MAPS } from '../maps/index.js';
import { events } from '../core/events.js';

const MENUISH = new Set(['menu', 'campaign', 'setup', 'settings']);

export function createMeta(app) {
  const root = document.getElementById('screens');
  let current = null, mode = 'none', pauseNode = null, handNode = null, lastCfg = null, lastOver = null, cur = null;
  let pendingHand = null, lastHandTeam = -1, spin = null;
  const sfx = (id) => app.audio.play(id);
  const sfxLevel = () => { const g = app.audio.sfx; if (g) g.gain.value = mode === 'play' ? 0.9 : 0.3; };
  window.addEventListener('pointerdown', () => setTimeout(sfxLevel, 0), { capture: true });
  events.on('match:start', (m) => { cur = m; });

  const mount = (node, m) => {
    if (current) { const old = current; old.classList.add('leaving'); setTimeout(() => old.remove(), 260); }
    current = node; mode = m; sfxLevel();
    if (node) { root.appendChild(node); requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('in'))); }
    if (m !== 'heroes' && m !== 'shop') stopSpin();
  };
  const start = (cfg) => {
    lastCfg = cfg; lastHandTeam = -1; pendingHand = null;
    mount(null, 'play');
    app.startMatch(cfg);
    if (pendingHand) { const a = pendingHand; pendingHand = null; showHandover(handInfo(a)); }
  };
  // ---------------------------------------------------------------- live backdrops
  // Title backdrop = the equipped hero, large, in the open right-hand area (feet above the hero plate), on a map
  // picked once per session.
  const menuMap = MAPS[Math.floor(app.rng() * MAPS.length)].id;
  const MENU_VIEW = { mapId: menuMap, offset: 3.4, zoom: 6.4, feet: 0.66 };
  const backdrop = () => {
    app.showcase(profile.equipped.char, profile.equipped.outfit[profile.equipped.char], MENU_VIEW);
    app.hud(false); app.audio.playMusic('menu');
  };
  const showcase = (c, o) => { app.showcase(c, o, { mapId: menuMap }); app.audio.playMusic('menu'); };
  setThumbSource((id) => app.mapThumb?.(id) ?? null);
  // turntable: spin the showcase hero; drag on the empty right side to turn it by hand
  function startSpin(node) {
    stopSpin();
    const s = spin = { yaw: -0.5, vel: 0.55, drag: false, lx: 0, t: performance.now(), raf: 0 };
    const ch = () => (cur?.cfg.showcase ? cur.actors[0]?.character : null);
    const loop = (now) => {
      if (spin !== s) return;
      const dt = Math.min(0.05, (now - s.t) / 1000); s.t = now;
      if (!s.drag) { s.vel += (0.55 - s.vel) * Math.min(1, dt * 1.5); s.yaw += s.vel * dt; }
      const c = ch(); if (c) c.root.rotation.y = s.yaw;
      s.raf = requestAnimationFrame(loop);
    };
    s.raf = requestAnimationFrame(loop);
    node.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, .hero-panel, .shop-panel, .shop-inspect, .topbar')) return;
      s.drag = true; s.lx = e.clientX; s.vel = 0;
    });
    node.addEventListener('pointermove', (e) => { if (!s.drag) return; const d = (e.clientX - s.lx) * 0.012; s.yaw += d; s.vel = d * 30; s.lx = e.clientX; });
    const up = () => { s.drag = false; };
    node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up); node.addEventListener('pointerleave', up);
  }
  function stopSpin() {
    if (!spin) return;
    cancelAnimationFrame(spin.raf); spin = null;
    const c = cur?.cfg.showcase ? cur.actors[0]?.character : null; if (c) c.root.rotation.y = 0;
  }
  // ---------------------------------------------------------------- purchases (shared by shop + hero select)
  function floatText(anchor, text, cls) {
    const r = anchor.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'float-txt ' + cls; f.innerHTML = text;
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top - 6) + 'px';
    root.appendChild(f); setTimeout(() => f.remove(), 1200);
  }
  function doBuy(kind, id, btn) {
    const why = blocker(kind, id), price = priceOf(kind, id);
    if (why) {
      sfx('error');
      const card = btn.closest('.card-item, .hero-act') ?? btn; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      if (why === 'coins') floatText(btn, `Need ${price - profile.coins} more`, 'bad');
      if (why === 'hero') floatText(btn, 'Unlock the hero first', 'bad');
      return false;
    }
    buy(kind, id); sfx('buy'); setTimeout(() => sfx('coin'), 120);
    floatText(btn, `${ICONS.coin}-${price}`, 'spend');
    setTimeout(() => { const c = current?.querySelector('.pill.coins'); c?.classList.add('bump'); setTimeout(() => c?.classList.remove('bump'), 500); }, 0);
    return true;
  }
  const equip = (c, o) => { equipChar(c); equipOutfit(c, o); app.restyle(c, profile.equipped.outfit[c]); sfx('select'); };

  // ---------------------------------------------------------------- hot-seat handover
  const handInfo = (a) => ({ name: a.name, team: a.team, charId: a.charDef.id, outfitId: a.outfitDef?.id,
    wind: { strength: cur?.wind.strength ?? 0, angle: cur?.wind.angle ?? 0 }, turn: cur?.turnNo ?? 1 });
  events.on('turn:start', (a) => {
    if (lastCfg?.mode !== 'hotseat' || !a.human || mode !== 'play') return;
    if (a.team === lastHandTeam) return;
    lastHandTeam = a.team;
    // the first turn starts inside the Match constructor, before match:start hands us the new match
    if (!cur || cur.cfg !== lastCfg) pendingHand = a; else showHandover(handInfo(a));
  });
  function showHandover(info) {
    hideHandover();
    handNode = handoverScreen(info, { ready: () => { sfx('ui_click'); hideHandover(); app.setPaused(false); } });
    root.appendChild(handNode); requestAnimationFrame(() => handNode?.classList.add('in'));
    app.setPaused(true); sfx('turn_start');
  }
  function hideHandover() { if (handNode) { handNode.remove(); handNode = null; } }

  const api = {
    showMenu() {
      hideHandover();
      backdrop();
      mount(menuScreen({
        quick: () => { sfx('ui_click'); api.showSetup('quick'); },
        campaign: () => { sfx('ui_click'); api.showCampaign(); },
        hotseat: () => { sfx('ui_click'); api.showSetup('hotseat'); },
        shop: () => { sfx('ui_click'); api.showShop(); },
        heroes: () => { sfx('ui_click'); api.showHeroes(); },
        home: () => app.goHome(),
        settings: () => { sfx('ui_click'); api.showSettings(); },
      }), 'menu');
    },
    showHeroes() {
      showcase(profile.equipped.char, profile.equipped.outfit[profile.equipped.char]);
      const node = heroScreen({
        back: () => { sfx('ui_back'); api.showMenu(); },
        preview: (c, o) => app.restyle(c, o), click: () => sfx('ui_click'),
        buy: doBuy, equip,
      });
      mount(node, 'heroes'); startSpin(node);
    },
    showShop() {
      showcase(profile.equipped.char, profile.equipped.outfit[profile.equipped.char]);
      const node = shopScreen({
        back: () => { sfx('ui_back'); api.showMenu(); },
        preview: (c, o) => app.restyle(c, o),
        click: () => sfx('ui_click'), error: () => sfx('error'),
        buy: doBuy, equip,
      });
      mount(node, 'shop'); startSpin(node);
    },
    showCampaign() {
      backdrop();
      mount(campaignScreen({
        back: () => { sfx('ui_back'); api.showMenu(); },
        click: () => sfx('ui_click'), error: () => sfx('error'),
        play: (i) => { sfx('ui_click'); lastOver = null; start(campaignMatch(i, app.newSeed())); },
      }), 'campaign');
    },
    showSetup(kind) {
      backdrop();
      app.requestMapThumbs?.(() => { if (mode === 'setup') current?.refresh?.(); });
      mount(setupScreen(kind, {
        back: () => { sfx('ui_back'); api.showMenu(); },
        click: () => sfx('ui_click'), select: () => sfx('select'),
        start: (st) => {
          sfx('ui_click');
          if (kind === 'quick') {
            profile.quick = { mapId: st.map, foe: st.p2, difficulty: st.diff }; if (st.p1 !== profile.equipped.char) equipChar(st.p1); save();
            lastOver = { mapId: st.map, foeId: st.p2, difficulty: st.diff };
            start(quickMatch(app.rng, app.newSeed(), lastOver));
          } else {
            profile.hotseat = { mapId: st.map, p2: st.p2 }; save();
            lastOver = { mapId: st.map, p1: st.p1, p2: st.p2 };
            start(hotseatMatch(app.rng, app.newSeed(), lastOver));
          }
        },
      }), 'setup');
    },
    showSettings() {
      backdrop();
      mount(settingsScreen({
        back: () => { sfx('ui_back'); api.showMenu(); }, quality: () => app.toggleQuality(), muted: () => app.audio.muted,
        toggleSound: () => { app.audio.unlock(); app.audio.setMuted(!app.audio.muted); sfx('ui_click'); },
      }, app.quality()), 'settings');
    },
    showResults(summary, reward) {
      app.hud(false); hideHandover();
      mount(resultsScreen(summary, reward, {
        again: () => {
          sfx('ui_click');
          if (summary.mode === 'campaign') start(campaignMatch(summary.won ? Math.min(profile.campaign.stage, (summary.stage ?? 0) + 1) : summary.stage ?? profile.campaign.stage, app.newSeed()));
          else if (summary.mode === 'hotseat') start(hotseatMatch(app.rng, app.newSeed(), lastOver ?? { mapId: summary.mapId }));
          else start(quickMatch(app.rng, app.newSeed(), lastOver ?? {}));
        },
        menu: () => { sfx('ui_back'); api.showMenu(); },
        tick: () => sfx('coin'),
      }), 'results');
      sfx(summary.won || summary.mode === 'hotseat' ? 'victory' : 'defeat');
    },
    /** Called by the core when a match finishes. */
    onMatchEnd(summary) {
      if (summary.mode === 'menubg') { if (MENUISH.has(mode)) { cur = null; backdrop(); } return; }
      // showcase never ends; autoplay matches (incl. the ?scene=over stand-in) never pay out; never stack results screens
      if (summary.mode === 'showcase' || summary.mode === 'autoplay' || mode === 'results') return;
      summary.stage = lastCfg?.stage;
      let reward;
      if (summary.mode === 'hotseat') {
        const w = summary.actors.find((a) => a.team === summary.winnerTeam);
        const k = w ? w.hp / Math.max(1, w.maxHp) : 0;
        reward = { coins: 0, xp: 0, stars: w ? 1 + (k >= 0.4 ? 1 : 0) + (k >= 0.7 || w.headshots >= 2 ? 1 : 0) : 0, after: { level: profile.level, xp: profile.xp, need: 1 } };
      } else if (summary.mode === 'campaign') {
        const S = CAMPAIGN[summary.stage ?? 0], had = profile.campaign.stars[S.id] ?? 0;
        reward = grantRewards(summary, { difficulty: lastCfg?.difficulty, stageBonus: summary.won ? S.bonus : 0, firstClear: summary.won && !had });
        if (summary.won) {
          profile.campaign.stars[S.id] = Math.max(had, starsFor(summary));
          if (S.n - 1 >= profile.campaign.stage) profile.campaign.stage = Math.min(CAMPAIGN.length - 1, S.n);
          save();
        }
      } else reward = grantRewards(summary, { difficulty: lastCfg?.difficulty });
      api.showResults(summary, reward);
    },
    showPause() {
      if (pauseNode || mode !== 'play' || handNode) return;
      pauseNode = pauseScreen({
        resume: () => { sfx('ui_click'); api.hidePause(); },
        quit: () => { sfx('ui_back'); api.hidePause(); app.endMatch(); cur = null; api.showMenu(); },
        home: () => app.goHome(), quality: () => app.toggleQuality(), muted: () => app.audio.muted,
        toggleSound: () => { app.audio.unlock(); app.audio.setMuted(!app.audio.muted); sfx('ui_click'); },
      }, app.quality());
      root.appendChild(pauseNode); requestAnimationFrame(() => pauseNode?.classList.add('in'));
      app.setPaused(true);
    },
    hidePause() { if (!pauseNode) return; pauseNode.remove(); pauseNode = null; if (!handNode) app.setPaused(false); },
    isPauseOpen: () => !!pauseNode,
    /** True while a menu-type screen covers the game (input to the match is blocked). */
    isBlocking: () => !!pauseNode || !!handNode || (mode !== 'play' && mode !== 'none'),
    /** Hardware back. Returns true if consumed. */
    back() {
      if (pauseNode) { api.hidePause(); return true; }
      if (handNode) return true;
      if (mode === 'play') { api.showPause(); return true; }
      if (mode === 'menu') return false;
      if (mode === 'results' || mode === 'none') { api.showMenu(); return true; }
      sfx('ui_back'); api.showMenu(); return true;
    },
    createController(pc, slot) { return createAIController(pc.difficulty ?? 'normal', (app.seed() + slot * 977) >>> 0); },
    autoplayConfig: (seed, over) => autoplayMatch(app.rng, seed, over),
    quickConfig: (seed, over) => quickMatch(app.rng, seed, over),
    setMode(m) { mode = m; sfxLevel(); },
    get mode() { return mode; },
  };
  return api;
}
