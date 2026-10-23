// Menu, hero select, campaign ladder, match setup, pause, settings, hot-seat handover and results screens
// (owner: Meta specialist). Pure DOM over the live 3D scene; flow/wiring lives in index.js.
import { CHARACTERS, getCharacter, getOutfit, outfitsFor, PERK_TYPES, computeStats } from '../characters/index.js';
import { MAPS, getMap } from '../maps/index.js';
import { profile, xpForLevel, owns, priceOf, blocker, rewardLines } from './progression.js';
import { CAMPAIGN, DIFFS } from './modes.js';

export const ICONS = {
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#e8a21a"/><circle cx="12" cy="11.3" r="9.6" fill="#ffc83a"/><circle cx="12" cy="11.3" r="6.8" fill="#ffdf6a" stroke="#e8a21a" stroke-width="1.4"/><path d="M12 7v8.6M9.6 9h3.9a1.5 1.5 0 0 1 0 3h-2.9a1.5 1.5 0 0 0 0 3h3.9" stroke="#c07a10" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 4.5v-2l-2.3-.6a7 7 0 0 0-.8-1.9l1.2-2-1.4-1.4-2 1.2a7 7 0 0 0-1.9-.8L13.2 3h-2l-.6 2.3a7 7 0 0 0-1.9.8l-2-1.2-1.4 1.4 1.2 2a7 7 0 0 0-.8 1.9L3 11v2l2.3.6c.2.7.4 1.3.8 1.9l-1.2 2 1.4 1.4 2-1.2c.6.4 1.2.6 1.9.8l.6 2.3h2l.6-2.3c.7-.2 1.3-.4 1.9-.8l2 1.2 1.4-1.4-1.2-2c.4-.6.6-1.2.8-1.9z" fill="currentColor"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  duo: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="16.5" cy="9" r="3" fill="currentColor"/><path d="M2 20c.6-4 3-6 6-6s5.4 2 6 6zm12.5 0c-.3-2.2-1-3.7-2-4.8 1-.8 2.4-1.2 4-1.2 2.7 0 4.6 1.8 5.1 6z" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="currentColor"/></svg>',
  bow: '<svg viewBox="0 0 24 24"><path d="M6 3c7 3 10 8 9 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3 15 18" stroke="currentColor" stroke-width="1.2"/><path d="M3 20 20 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 5l-4.5 1 3.5 3.5z" fill="currentColor"/></svg>',
  wind: '<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m4 12.5 5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><path d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.6 1.2 4.4 3 5.5V20h11v-4c1.8-1.1 3-2.9 3-5.5 0-4.6-3.5-8-8.5-8z" fill="currentColor"/><circle cx="8.6" cy="11" r="2.1" fill="#1a1030"/><circle cx="15.4" cy="11" r="2.1" fill="#1a1030"/><path d="M10 20v-2.5M14 20v-2.5" stroke="#1a1030" stroke-width="1.4"/></svg>',
};
export const hex = (n) => '#' + ((n ?? 0x888888) >>> 0).toString(16).padStart(6, '0').slice(-6);
export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/** Stylized CSS portrait from a hero's palette (hair crest, face, eyes) — readable at 40-70px. */
export function portrait(def, size = 46, cls = '') {
  const P = def.palette;
  return `<span class="portrait ${def.gender === 'f' ? 'f' : 'm'} ${cls}" style="--sz:${size}px;--skin:${hex(P.skin)};--hair:${hex(P.hair)};--hair2:${hex(P.hair2 ?? P.hair)};--eye:${hex(P.eyes)}"><i class="p-hair"></i><i class="p-face"></i><i class="p-eye l"></i><i class="p-eye r"></i><i class="p-mouth"></i></span>`;
}
export function perkBadge(outfit, short = false) {
  const T = PERK_TYPES[outfit.type] ?? {};
  return `<span class="perk" style="--pc:${T.color ?? '#fff'}">${T.icon ?? ''}<span>${short ? T.label ?? '' : outfit.perkText}</span></span>`;
}
export const perkIcon = (outfit) => { const T = PERK_TYPES[outfit.type] ?? {}; return `<span class="perk-ic" style="--pc:${T.color ?? '#fff'}">${T.icon ?? ''}</span>`; };

/** Rendered thumbnails (data URLs) come from the core once it has drawn each map; until then a palette sketch is shown. */
let thumbSrc = null;
export function setThumbSource(fn) { thumbSrc = fn; }
/** Mini landscape thumbnail of a map: a real rendered frame when available, else painted from its palette + lighting. */
export function mapThumb(def, cls = '') {
  const url = thumbSrc?.(def.id);
  if (url) return `<span class="map-thumb photo ${cls}"><img src="${url}" alt=""><b>${def.name}</b></span>`;
  const L = def.lighting ?? {}, P = def.palette ?? {};
  const sky = hex(L.hemiSky ?? 0x8fd0ff), fog = hex(L.fog ?? 0xcfe8ff), top = hex(P.snow ? 0xf4f8ff : P.grass ?? 0x6cc04a), rock = hex(P.rock ?? 0xc49a6c), deep = hex(P.deep ?? P.rock2 ?? 0x7a5a3a);
  return `<span class="map-thumb ${cls}" style="--sky:${sky};--fog:${fog}"><svg viewBox="0 0 120 60" preserveAspectRatio="none">
    <path d="M0 44 18 30 30 36 44 22 58 34 70 28 86 38 100 26 120 36V60H0z" fill="${fog}" opacity=".55"/>
    <path d="M6 40h30l-4 10-8 6-10-6z" fill="${rock}"/><path d="M6 40h30v3H6z" fill="${top}"/><path d="M14 50l6 6 6-6z" fill="${deep}"/>
    <path d="M70 32h38l-5 12-12 8-14-8z" fill="${rock}"/><path d="M70 32h38v3.5H70z" fill="${top}"/><path d="M80 44l11 8 9-8z" fill="${deep}"/>
    <path d="M44 46h14l-3 6h-8z" fill="${rock}"/><path d="M44 46h14v2H44z" fill="${top}"/></svg><b>${def.name}</b></span>`;
}

const STAT_RANGES = { hp: [80, 140], move: [5.5, 12.5], wind: [0, 0.6], draw: [0.75, 1.3] };
export function statBars(def, outfit) {
  const s = computeStats(def, outfit), draw = 1.5 / s.drawTime;
  const bar = (label, v, [a, b], txt) => `<div class="sbar"><small>${label}</small><span><i style="--k:${Math.max(0.06, Math.min(1, (v - a) / (b - a))).toFixed(3)}"></i></span><b>${txt}</b></div>`;
  return `<div class="sbars">${bar('HP', s.maxHp, STAT_RANGES.hp, s.maxHp)}${bar('MOVE', s.moveGauge, STAT_RANGES.move, s.moveGauge.toFixed(1))}${bar('WIND RES', s.windResist, STAT_RANGES.wind, Math.round(s.windResist * 100) + '%')}${bar('DRAW', draw, STAT_RANGES.draw, Math.round(draw * 100))}</div>`;
}
const diffPill = (d) => `<span class="diff d-${d}">${d.toUpperCase()}</span>`;
const campaignStars = () => CAMPAIGN.reduce((s, S) => s + (profile.campaign.stars[S.id] ?? 0), 0);

// ------------------------------------------------------------------ title
export function menuScreen(h) {
  const c = profile.equipped.char, def = getCharacter(c), out = getOutfit(profile.equipped.outfit[c]);
  const stage = Math.min(profile.campaign.stage, CAMPAIGN.length - 1), S = CAMPAIGN[stage];
  const xpNeed = xpForLevel(profile.level), done = profile.campaign.stage >= CAMPAIGN.length - 1 && profile.campaign.stars[S.id];
  const node = el(`<section class="screen menu">
    <header class="topbar">
      <button class="pill-btn home" aria-label="Arcade home">${ICONS.home}</button>
      <div class="spacer"></div>
      <div class="pill lvl"><span class="lv-badge">${profile.level}</span><span class="lv-col"><b>LEVEL ${profile.level}</b><i style="--k:${Math.min(1, profile.xp / xpNeed).toFixed(3)}"></i></span></div>
      <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      <button class="pill-btn settings" aria-label="Settings">${ICONS.gear}</button>
    </header>
    <div class="menu-left">
      <h1 class="logo"><span class="l1">BOW</span><span class="l2">BRAWL</span></h1>
      <div class="menu-btns">
        <button class="mbtn primary campaign">${ICONS.flag}<span><b>CAMPAIGN</b><small>${done ? 'Ladder complete · replay for stars' : `Stage ${stage + 1}/${CAMPAIGN.length} · ${S.name}`}</small></span><em class="mstars">${ICONS.star}${campaignStars()}/${CAMPAIGN.length * 3}</em></button>
        <div class="row2">
          <button class="mbtn quick">${ICONS.play}<span><b>QUICK MATCH</b><small>Pick arena &amp; rival</small></span></button>
          <button class="mbtn hotseat">${ICONS.duo}<span><b>2 PLAYERS</b><small>One phone</small></span></button>
        </div>
        <div class="row2">
          <button class="mbtn small heroes-b">${ICONS.bow}<span><b>HEROES</b></span></button>
          <button class="mbtn small shop gold">${ICONS.bag}<span><b>SHOP</b></span></button>
        </div>
      </div>
    </div>
    <button class="hero-plate">
      ${portrait(def, 52)}
      <span class="plate"><small>${def.title}</small><b>${def.name}</b><em>${out ? out.name : ''}</em>${out ? perkBadge(out) : ''}</span>
      <span class="chev">${ICONS.right}</span>
    </button>
  </section>`);
  const on = (sel, fn) => (node.querySelector(sel).onclick = fn);
  on('.quick', h.quick); on('.campaign', h.campaign); on('.hotseat', h.hotseat); on('.shop', h.shop);
  on(".heroes-b", h.heroes); on('.hero-plate', h.heroes); on('.home', h.home); on('.settings', h.settings);
  return node;
}

// ------------------------------------------------------------------ hero select (3D turntable on the right)
export function heroScreen(h) {
  let sel = profile.equipped.char, outSel = profile.equipped.outfit[sel];
  const node = el('<section class="screen heroes"></section>');
  const render = () => {
    const def = getCharacter(sel), outs = outfitsFor(sel), out = getOutfit(outSel) ?? outs[0];
    const ownHero = owns('chars', sel), ownOut = owns('outfits', out.id);
    const isEq = profile.equipped.char === sel && profile.equipped.outfit[sel] === out.id;
    let action;
    if (!ownHero) action = `<button class="mbtn primary act-buy ${blocker('chars', sel) === 'coins' ? 'poor' : ''}">${ICONS.coin}<span><b>UNLOCK ${priceOf('chars', sel)}</b></span></button>`;
    else if (!ownOut) action = `<button class="mbtn primary act-buy ${blocker('outfits', out.id) === 'coins' ? 'poor' : ''}">${ICONS.coin}<span><b>BUY OUTFIT ${priceOf('outfits', out.id)}</b></span></button>`;
    else action = isEq ? `<button class="mbtn primary act-ok">${ICONS.check}<span><b>READY</b></span></button>` : `<button class="mbtn primary act-eq">${ICONS.check}<span><b>SELECT</b></span></button>`;
    node.innerHTML = `
      <header class="topbar">
        <button class="pill-btn back" aria-label="Back">${ICONS.left}</button>
        <h2>HEROES</h2><div class="spacer"></div>
        <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      </header>
      <div class="hero-panel">
        <div class="hero-grid">${CHARACTERS.map((c) => `<button class="htile ${c.id === sel ? 'on' : ''} ${owns('chars', c.id) ? '' : 'locked'}" data-id="${c.id}">${portrait(c, 44)}<b>${c.name}</b>${owns('chars', c.id) ? (profile.equipped.char === c.id ? `<i class="eqdot">${ICONS.check}</i>` : '') : `<i class="lk">${ICONS.lock}</i>`}</button>`).join('')}</div>
        <div class="hero-info">
          <div class="hi-head"><small>${def.title}</small><b>${def.name}</b><p>${def.blurb ?? ''}</p></div>
          ${statBars(def, out)}
        </div>
        <div class="outfit-row">${outs.map((o) => `<button class="ochip ${o.id === out.id ? 'on' : ''} ${owns('outfits', o.id) ? '' : 'locked'}" data-id="${o.id}">${perkIcon(o)}<span><b>${o.name}</b><small>${owns('outfits', o.id) ? (PERK_TYPES[o.type]?.label ?? '') : `${ICONS.coin}${o.price}`}</small></span></button>`).join('')}</div>
        <div class="perk-line">${perkBadge(out)}</div>
        <div class="hero-act">${action}</div>
      </div>
      <p class="turn-hint">${ICONS.left} drag to spin ${ICONS.right}</p>`;
    node.querySelector('.back').onclick = h.back;
    node.querySelectorAll('.htile').forEach((b) => (b.onclick = () => { sel = b.dataset.id; outSel = profile.equipped.outfit[sel]; h.click(); h.preview(sel, outSel); render(); }));
    node.querySelectorAll('.ochip').forEach((b) => (b.onclick = () => { outSel = b.dataset.id; h.click(); h.preview(sel, outSel); render(); }));
    const q = (s) => node.querySelector(s);
    if (q('.act-buy')) q('.act-buy').onclick = () => {
      const kind = ownHero ? 'outfits' : 'chars', id = ownHero ? out.id : sel;
      if (h.buy(kind, id, q('.act-buy'))) { if (kind === 'chars') h.equip(sel, profile.equipped.outfit[sel]); else h.equip(sel, out.id); render(); }
    };
    if (q('.act-eq')) q('.act-eq').onclick = () => { h.equip(sel, out.id); render(); };
    if (q('.act-ok')) q('.act-ok').onclick = h.back;
  };
  render();
  return node;
}

// ------------------------------------------------------------------ campaign ladder
export function campaignScreen(h) {
  const unlocked = Math.min(profile.campaign.stage, CAMPAIGN.length - 1);
  let sel = unlocked;
  const node = el('<section class="screen campaign-s"></section>');
  const render = () => {
    const S = CAMPAIGN[sel], foe = getCharacter(S.foe.charId), fo = getOutfit(S.foe.outfitId), map = getMap(S.map);
    const best = profile.campaign.stars[S.id] ?? 0, first = !best;
    node.innerHTML = `
      <header class="topbar">
        <button class="pill-btn back" aria-label="Back">${ICONS.left}</button>
        <h2>CAMPAIGN</h2>
        <div class="pill starsum">${ICONS.star}<b>${campaignStars()}/${CAMPAIGN.length * 3}</b></div>
        <div class="spacer"></div>
        <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      </header>
      <div class="ladder"><svg class="path" viewBox="0 0 1000 100" preserveAspectRatio="none"><path d="M40 70 C 120 10, 180 10, 240 50 S 380 95, 440 45 S 560 0, 640 50 S 780 95, 840 45 S 940 10, 980 40" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/></svg>
        ${CAMPAIGN.map((s, i) => {
          const st = profile.campaign.stars[s.id] ?? 0, lock = i > unlocked;
          return `<button class="node ${i === sel ? 'on' : ''} ${lock ? 'locked' : ''} ${st ? 'cleared' : ''}" data-i="${i}" style="--i:${i}">
            ${mapThumb(getMap(s.map), 'disc')}<span class="num">${lock ? ICONS.lock : s.n}</span>
            <span class="nstars">${[0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}">${ICONS.star}</i>`).join('')}</span></button>`;
        }).join('')}
      </div>
      <div class="stage-card">
        ${mapThumb(map, 'wide')}
        <div class="sc-body">
          <small>STAGE ${S.n} · ${map.name}</small><b>${S.name}</b>
          <div class="sc-foe">${portrait(foe, 40)}<span><em>VS</em> ${foe.name}<small>${fo ? fo.name : foe.title}</small></span>${diffPill(S.foe.difficulty)}</div>
        </div>
        <div class="sc-side">
          <span class="sc-rew">${ICONS.coin}<b>+${first ? S.bonus : Math.round(S.bonus / 4)}</b><small>${first ? 'CLEAR BONUS' : 'REPLAY BONUS'}</small></span>
          <button class="mbtn primary go">${ICONS.play}<span><b>${first ? 'FIGHT' : 'REPLAY'}</b></span></button>
        </div>
      </div>`;
    node.querySelector('.back').onclick = h.back;
    node.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.i; if (i > unlocked) { h.error(); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; }
      sel = i; h.click(); render();
    }));
    node.querySelector('.go').onclick = () => h.play(sel);
  };
  render();
  return node;
}

// ------------------------------------------------------------------ quick match / hot-seat setup
export function setupScreen(kind, h) {
  const owned = CHARACTERS.filter((c) => owns('chars', c.id)).map((c) => c.id);
  const st = kind === 'quick'
    ? { map: profile.quick.mapId ?? 'random', p1: profile.equipped.char, p2: profile.quick.foe ?? 'random', diff: profile.quick.difficulty ?? 'normal' }
    : { map: profile.hotseat.mapId ?? 'random', p1: profile.equipped.char, p2: profile.hotseat.p2 && owned.includes(profile.hotseat.p2) ? profile.hotseat.p2 : owned.find((c) => c !== profile.equipped.char) ?? owned[0] };
  const node = el(`<section class="screen setup"></section>`);
  const p2pool = kind === 'quick' ? ['random', ...CHARACTERS.map((c) => c.id)] : owned;
  const cycle = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];
  const slot = (label, id, key, sub) => {
    const def = id === 'random' ? null : getCharacter(id), o = def ? getOutfit(profile.equipped.outfit[id]) : null;
    return `<div class="vslot ${key}"><small>${label}</small>
      <button class="cyc prev" data-k="${key}" data-d="-1" aria-label="Previous">${ICONS.left}</button>
      ${def ? portrait(def, 50) : `<span class="portrait rnd" style="--sz:50px">${ICONS.dice}</span>`}
      <span class="sl-name"><b>${def ? def.name : 'Random'}</b><em>${sub ?? (def ? (o?.name ?? def.title) : 'Any rival')}</em></span>
      <button class="cyc next" data-k="${key}" data-d="1" aria-label="Next">${ICONS.right}</button></div>`;
  };
  const render = () => {
    node.innerHTML = `
      <header class="topbar">
        <button class="pill-btn back" aria-label="Back">${ICONS.left}</button>
        <h2>${kind === 'quick' ? 'QUICK MATCH' : '2 PLAYERS · ONE PHONE'}</h2><div class="spacer"></div>
        <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      </header>
      <div class="setup-card">
        <small class="sec">ARENA</small>
        <div class="maps"><button class="mt ${st.map === 'random' ? 'on' : ''}" data-m="random"><span class="map-thumb rnd">${ICONS.dice}<b>Random</b></span></button>${MAPS.map((m) => `<button class="mt ${st.map === m.id ? 'on' : ''}" data-m="${m.id}">${mapThumb(m)}</button>`).join('')}</div>
        <small class="sec">${kind === 'quick' ? 'FIGHTERS' : 'PLAYERS'}</small>
        <div class="versus">
          ${slot(kind === 'quick' ? 'YOU' : 'PLAYER 1', st.p1, 'p1')}
          <span class="vs">VS</span>
          ${slot(kind === 'quick' ? 'RIVAL (AI)' : 'PLAYER 2', st.p2, 'p2', kind === 'quick' && st.p2 !== 'random' ? null : undefined)}
        </div>
        <div class="setup-foot">
          ${kind === 'quick' ? `<div class="diffs">${DIFFS.map((d) => `<button class="dbtn d-${d} ${st.diff === d ? 'on' : ''}" data-d="${d}">${d.toUpperCase()}</button>`).join('')}</div>`
            : `<p class="hs-hint">${ICONS.phone} Take turns on this phone — we'll tell you when to pass it.</p>`}
          <button class="mbtn primary go">${ICONS.play}<span><b>START</b></span></button>
        </div>
      </div>`;
    node.querySelector('.back').onclick = h.back;
    node.querySelectorAll('.mt').forEach((b) => (b.onclick = () => { st.map = b.dataset.m; h.click(); render(); }));
    node.querySelectorAll('.dbtn').forEach((b) => (b.onclick = () => { st.diff = b.dataset.d; h.click(); render(); }));
    node.querySelectorAll('.cyc').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k, d = +b.dataset.d;
      st[k] = cycle(k === 'p1' ? owned : p2pool, st[k], d); h.select(); render();
    }));
    node.querySelector('.go').onclick = () => h.start({ ...st });
  };
  render();
  node.refresh = render;      // re-run when rendered map thumbnails arrive
  return node;
}

// ------------------------------------------------------------------ pause / settings / hot-seat handover
export function pauseScreen(h, quality) {
  const node = el(`<section class="screen pause"><div class="card">
    <h2>PAUSED</h2>
    <button class="mbtn primary resume">${ICONS.play}<span><b>RESUME</b></span></button>
    <div class="row2">
      <button class="mbtn small quality"><span><b>GRAPHICS: ${quality.toUpperCase()}</b></span></button>
      <button class="mbtn small sound"><span><b>SOUND: ${h.muted() ? 'OFF' : 'ON'}</b></span></button>
    </div>
    <div class="row2">
      <button class="mbtn small quit">${ICONS.left}<span><b>QUIT TO MENU</b></span></button>
      <button class="mbtn small home">${ICONS.home}<span><b>ARCADE</b></span></button>
    </div>
    <p class="hint">Drag near your archer to aim · hold FIRE to draw, release to shoot. The marker on the power bar is your last shot — adjust for the wind!</p>
  </div></section>`);
  node.querySelector('.resume').onclick = h.resume;
  node.querySelector('.quit').onclick = h.quit;
  node.querySelector('.home').onclick = h.home;
  node.querySelector('.quality').onclick = h.quality;
  node.querySelector('.sound').onclick = (ev) => { h.toggleSound(); ev.currentTarget.querySelector('b').textContent = 'SOUND: ' + (h.muted() ? 'OFF' : 'ON'); };
  return node;
}

export function settingsScreen(h, quality) {
  const t = profile.totals;
  const node = el(`<section class="screen pause"><div class="card">
    <h2>SETTINGS</h2>
    <div class="row2">
      <button class="mbtn small quality"><span><b>GRAPHICS: ${quality.toUpperCase()}</b></span></button>
      <button class="mbtn small sound"><span><b>SOUND: ${h.muted() ? 'OFF' : 'ON'}</b></span></button>
    </div>
    <div class="stats"><div><small>MATCHES</small><b>${t.matches}</b></div><div><small>WINS</small><b>${t.wins}</b></div><div><small>HEADSHOTS</small><b>${t.headshots}</b></div><div><small>DAMAGE</small><b>${t.damage ?? 0}</b></div></div>
    <button class="mbtn primary back"><span><b>DONE</b></span></button>
  </div></section>`);
  node.querySelector('.back').onclick = h.back;
  node.querySelector('.quality').onclick = h.quality;
  node.querySelector('.sound').onclick = (ev) => { h.toggleSound(); ev.currentTarget.querySelector('b').textContent = 'SOUND: ' + (h.muted() ? 'OFF' : 'ON'); };
  return node;
}

/** Hot-seat "pass the phone" card. info: { name, team, charId, outfitId, wind, turn } */
export function handoverScreen(info, h) {
  const def = getCharacter(info.charId), w = info.wind;
  const arrow = w.strength ? `<i class="wa" style="transform:rotate(${(-w.angle * 180 / Math.PI).toFixed(0)}deg)">${ICONS.right}</i>` : '';
  const node = el(`<section class="screen handover team${info.team}"><div class="ho-card">
    <div class="ho-phone">${ICONS.phone}</div>
    <small>${info.turn === 1 ? 'FIRST TURN' : 'PASS THE PHONE TO'}</small>
    <h2>${info.name}</h2>
    <div class="ho-hero">${portrait(def, 54)}<span><b>${def.name}</b><em>${getOutfit(info.outfitId)?.name ?? def.title}</em></span></div>
    <div class="ho-wind">${ICONS.wind}<b>WIND ${w.strength}</b>${arrow}</div>
    <button class="mbtn primary ready">${ICONS.play}<span><b>I'M READY</b></span></button>
  </div></section>`);
  node.querySelector('.ready').onclick = h.ready;
  return node;
}

// ------------------------------------------------------------------ results (stars, stats, animated rewards)
export function resultsScreen(summary, reward, h) {
  const hot = summary.mode === 'hotseat';
  const meA = hot ? (summary.actors.find((a) => a.team === summary.winnerTeam) ?? summary.actors[0]) : (summary.actors.find((a) => a.human) ?? summary.actors[0]);
  const foeA = summary.actors.find((a) => a !== meA) ?? meA;
  const won = hot || summary.won, acc = meA.shots ? Math.round(meA.hits / meA.shots * 100) : 0;
  const map = getMap(summary.mapId);
  // a reward without a breakdown (e.g. the ?scene=over hook) gets one derived from the summary, so the numbers add up
  // (stars and coins passed in are shown exactly; the breakdown is balanced to add up to them)
  if (!reward.lines && !hot) {
    const R = rewardLines(summary), stars = reward.stars ?? R.stars;
    const lines = R.lines.filter((l) => !/^Stars/.test(l[0]));
    if (stars > 0) lines.push([`Stars ×${stars}`, stars * 25]);
    const sum = lines.reduce((t, l) => t + l[1], 0), coins = reward.coins ?? sum;
    if (coins !== sum) lines.push(['Match bonus', coins - sum]);
    reward = { ...reward, lines, stars, coins };
  }
  const lines = reward.lines ?? [], stars = reward.stars ?? 0;
  const title = hot ? `${(meA.name ?? 'P1').toUpperCase()} WINS!` : won ? 'VICTORY!' : 'DEFEAT';
  const st = summary.mode === 'campaign' ? CAMPAIGN[summary.stage ?? 0] : null;
  const sub = `${st ? `Stage ${st.n} · ${st.name} · ` : ''}${map.name} · ${summary.turns} turns`;
  const before = reward.before ?? { level: reward.after.level, xp: Math.max(0, reward.after.xp - reward.xp), need: reward.after.need, coins: profile.coins - reward.coins };
  const node = el(`<section class="screen results ${won ? 'win' : 'lose'}">
    <div class="rays"></div>
    <div class="res-wrap">
      <div class="res-left">
        <h2 class="res-title">${title}</h2>
        <div class="stars">${[0, 1, 2].map((i) => `<i class="star ${i < stars ? 'on' : ''}" style="--d:${0.45 + i * 0.25}s">${ICONS.star}</i>`).join('')}</div>
        <p class="res-sub">${sub}</p>
        <div class="duel">${portrait(getCharacter(meA.charId), 40, meA.alive ? '' : 'ko')}<b>${meA.name}</b><span class="hpk">${meA.hp} HP</span><em>VS</em><span class="hpk">${foeA.hp} HP</span><b>${foeA.name}</b>${portrait(getCharacter(foeA.charId), 40, foeA.alive ? '' : 'ko')}</div>
        <div class="stats">
          <div><small>DAMAGE</small><b data-n="${meA.damage}">0</b></div>
          <div><small>HEADSHOTS</small><b data-n="${meA.headshots}">0</b></div>
          <div><small>ACCURACY</small><b data-n="${acc}" data-s="%">0%</b></div>
          <div><small>SHOTS</small><b data-n="${meA.shots}">0</b></div>
        </div>
      </div>
      <div class="res-right">
        ${hot ? `<div class="hs-note">${ICONS.duo}<b>Friendly match</b><small>Hot-seat games don't award coins.</small></div>` : `
        <div class="rlines">${lines.map((l, i) => `<div class="rl" style="--d:${0.6 + i * 0.18}s"><span>${l[0]}</span><b>${ICONS.coin}${l[1] >= 0 ? '+' : '−'}${Math.abs(l[1])}</b></div>`).join('')}</div>
        <div class="rtotal"><div class="pill coins big">${ICONS.coin}<b class="cnt">+0</b></div><span class="bank">Total <b class="bankn">${before.coins}</b></span></div>
        <div class="xp"><div class="xp-top"><span class="lv-badge">${before.level}</span><small class="lvtxt">LEVEL ${before.level}</small><em>+${reward.xp} XP</em></div><div class="xpbar"><i style="--k:${(before.xp / before.need).toFixed(3)}"></i></div><div class="lvup">LEVEL UP!</div></div>`}
        <div class="row2 res-btns">
          <button class="mbtn small menu-b">${ICONS.home}<span><b>MENU</b></span></button>
          <button class="mbtn primary again">${ICONS.play}<span><b>${summary.mode === 'campaign' && won && (summary.stage ?? 0) < CAMPAIGN.length - 1 ? 'NEXT STAGE' : 'REMATCH'}</b></span></button>
        </div>
      </div>
    </div>
  </section>`);
  node.querySelector('.again').onclick = h.again;
  node.querySelector('.menu-b').onclick = h.menu;
  // ---- count-up animation (stats, coins, bank total, XP bar with level wrap)
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const nums = [...node.querySelectorAll('.stats b[data-n]')];
  const cnt = node.querySelector('.cnt'), bank = node.querySelector('.bankn'), bar = node.querySelector('.xpbar i'), lvtxt = node.querySelector('.lvtxt'), badge = node.querySelector('.xp .lv-badge');
  const t0 = performance.now();
  let lastTick = -1;
  const tick = (now) => {
    if (!node.isConnected && now - t0 > 500) return;
    const s = (now - t0) / 1000;
    for (const b of nums) b.textContent = Math.round(+b.dataset.n * ease((s - 0.3) / 0.9)) + (b.dataset.s ?? '');
    if (cnt) {
      const k = ease((s - 0.9) / 1.4), c = Math.round(reward.coins * k);
      cnt.textContent = '+' + c; bank.textContent = before.coins + c;
      if (c !== lastTick && k > 0 && k < 1 && Math.round(s * 12) % 2 === 0) { lastTick = c; h.tick?.(); }
      // XP: from before.xp at before.level to after (possibly across levels)
      const kx = ease((s - 1.2) / 1.6);
      let lv = before.level, xp = before.xp + reward.xp * kx, need = before.need;
      while (xp >= need && lv < reward.after.level) { xp -= need; lv++; need = xpForLevel(lv); }
      bar.style.setProperty('--k', Math.min(1, xp / need).toFixed(3));
      lvtxt.textContent = 'LEVEL ' + lv; badge.textContent = lv;
      if (lv > before.level) node.querySelector('.xp').classList.add('up');
    }
    if (s < 3.2) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return node;
}
