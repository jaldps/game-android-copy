// Menu, pause and results screens (owner: Meta specialist). Pure DOM over the live 3D scene.
import { CHARACTERS, getCharacter, getOutfit, outfitsFor, PERK_TYPES } from '../characters/index.js';
import { getMap } from '../maps/index.js';
import { profile, xpForLevel, owns } from './progression.js';
import { CAMPAIGN } from './modes.js';

export const ICONS = {
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffc83a"/><circle cx="12" cy="12" r="7" fill="#ffdf6a" stroke="#e8a21a" stroke-width="1.6"/><path d="M12 7.5v9M9.5 9.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4" stroke="#c07a10" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 4.5v-2l-2.3-.6a7 7 0 0 0-.8-1.9l1.2-2-1.4-1.4-2 1.2a7 7 0 0 0-1.9-.8L13.2 3h-2l-.6 2.3a7 7 0 0 0-1.9.8l-2-1.2-1.4 1.4 1.2 2a7 7 0 0 0-.8 1.9L3 11v2l2.3.6c.2.7.4 1.3.8 1.9l-1.2 2 1.4 1.4 2-1.2c.6.4 1.2.6 1.9.8l.6 2.3h2l.6-2.3c.7-.2 1.3-.4 1.9-.8l2 1.2 1.4-1.4-1.2-2c.4-.6.6-1.2.8-1.9z" fill="currentColor"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  duo: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.4" fill="currentColor"/><circle cx="16.5" cy="9" r="3" fill="currentColor"/><path d="M2 20c.6-4 3-6 6-6s5.4 2 6 6zm12.5 0c-.3-2.2-1-3.7-2-4.8 1-.8 2.4-1.2 4-1.2 2.7 0 4.6 1.8 5.1 6z" fill="currentColor"/></svg>',
};
export const hex = (n) => '#' + (n ?? 0x888888).toString(16).padStart(6, '0');
export function portrait(def, size = 46) {
  const P = def.palette;
  return `<span class="portrait" style="--sz:${size}px;--skin:${hex(P.skin)};--hair:${hex(P.hair)};--hair2:${hex(P.hair2 ?? P.hair)};--eye:${hex(P.eyes)}"><i class="p-hair"></i><i class="p-face"></i><i class="p-eye l"></i><i class="p-eye r"></i></span>`;
}
export function perkBadge(outfit) {
  const T = PERK_TYPES[outfit.type] ?? {};
  return `<span class="perk" style="--pc:${T.color ?? '#fff'}">${T.icon ?? ''}<span>${outfit.perkText}</span></span>`;
}
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export function menuScreen(h) {
  const e = equippedSel(), def = getCharacter(e.charId), out = getOutfit(e.outfitId);
  const stage = profile.campaign.stage, S = CAMPAIGN[Math.min(stage, CAMPAIGN.length - 1)];
  const xpNeed = xpForLevel(profile.level);
  const node = el(`<section class="screen menu">
    <header class="topbar">
      <button class="pill-btn home" aria-label="Arcade home">${ICONS.home}</button>
      <div class="spacer"></div>
      <div class="pill lvl"><b>LV ${profile.level}</b><i style="--k:${Math.min(1, profile.xp / xpNeed)}"></i></div>
      <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      <button class="pill-btn settings" aria-label="Settings">${ICONS.gear}</button>
    </header>
    <div class="menu-left">
      <h1 class="logo"><span class="l1">BOW</span><span class="l2">BRAWL</span></h1>
      <p class="tagline">Turn-based archery artillery</p>
      <div class="menu-btns">
        <button class="mbtn primary quick">${ICONS.play}<span><b>QUICK MATCH</b><small>vs AI · random arena</small></span></button>
        <button class="mbtn campaign">${ICONS.flag}<span><b>CAMPAIGN</b><small>Stage ${Math.min(stage + 1, CAMPAIGN.length)}/${CAMPAIGN.length} · ${S.name}</small></span></button>
        <div class="row2">
          <button class="mbtn small hotseat">${ICONS.duo}<span><b>2P HOT-SEAT</b></span></button>
          <button class="mbtn small shop">${ICONS.bag}<span><b>SHOP</b></span></button>
        </div>
      </div>
    </div>
    <div class="hero-plate">
      <button class="arrow-btn prev" aria-label="Previous hero">${ICONS.left}</button>
      <div class="plate"><small>${def.title}</small><b>${def.name}</b><em>${out ? out.name : ''}</em>${out ? perkBadge(out) : ''}</div>
      <button class="arrow-btn next" aria-label="Next hero">${ICONS.right}</button>
    </div>
  </section>`);
  node.querySelector('.quick').onclick = () => h.quick();
  node.querySelector('.campaign').onclick = () => h.campaign();
  node.querySelector('.hotseat').onclick = () => h.hotseat();
  node.querySelector('.shop').onclick = () => h.shop();
  node.querySelector('.home').onclick = () => h.home();
  node.querySelector('.settings').onclick = () => h.settings();
  node.querySelector('.prev').onclick = () => h.cycle(-1);
  node.querySelector('.next').onclick = () => h.cycle(1);
  return node;
}
function equippedSel() { const c = profile.equipped.char; return { charId: c, outfitId: profile.equipped.outfit[c] }; }

export function pauseScreen(h, quality) {
  const node = el(`<section class="screen pause"><div class="card">
    <h2>PAUSED</h2>
    <button class="mbtn primary resume">${ICONS.play}<span><b>RESUME</b></span></button>
    <div class="row2">
      <button class="mbtn small quality"><span><b>GRAPHICS: ${quality.toUpperCase()}</b></span></button>
      <button class="mbtn small sound"><span><b>SOUND: ${h.muted() ? 'OFF' : 'ON'}</b></span></button>
    </div>
    <div class="row2">
      <button class="mbtn small quit"><span><b>QUIT MATCH</b></span></button>
      <button class="mbtn small home">${ICONS.home}<span><b>ARCADE</b></span></button>
    </div>
    <p class="hint">Drag near your archer to aim · hold FIRE to draw · release to shoot. The white marker on the power bar is your last shot.</p>
  </div></section>`);
  node.querySelector('.resume').onclick = () => h.resume();
  node.querySelector('.quit').onclick = () => h.quit();
  node.querySelector('.home').onclick = () => h.home();
  node.querySelector('.quality').onclick = () => h.quality();
  node.querySelector('.sound').onclick = (ev) => { h.toggleSound(); ev.currentTarget.querySelector('b').textContent = 'SOUND: ' + (h.muted() ? 'OFF' : 'ON'); };
  return node;
}

export function resultsScreen(summary, reward, h) {
  const meA = summary.actors.find((a) => a.human) ?? summary.actors[0];
  const won = summary.won, acc = meA.shots ? Math.round(meA.hits / meA.shots * 100) : 0;
  const map = getMap(summary.mapId);
  const stars = [0, 1, 2].map((i) => `<i class="star ${i < reward.stars ? 'on' : ''}" style="--d:${0.35 + i * 0.22}s">${ICONS.star}</i>`).join('');
  const k = reward.after.xp / reward.after.need;
  const title = summary.mode === 'hotseat' ? `${(summary.actors.find((a) => a.team === summary.winnerTeam)?.name ?? 'NOBODY').toUpperCase()} WINS!` : won ? 'VICTORY!' : 'DEFEAT';
  const node = el(`<section class="screen results ${won || summary.mode === 'hotseat' ? 'win' : 'lose'}"><div class="card">
    <h2 class="res-title">${title}</h2>
    <div class="stars">${stars}</div>
    <p class="res-sub">${map.name} · ${summary.turns} turns</p>
    <div class="stats">
      <div><small>DAMAGE</small><b>${meA.damage}</b></div>
      <div><small>HEADSHOTS</small><b>${meA.headshots}</b></div>
      <div><small>ACCURACY</small><b>${acc}%</b></div>
      <div><small>HP LEFT</small><b>${meA.hp}</b></div>
    </div>
    <div class="rewards">
      <div class="pill coins big">${ICONS.coin}<b>+${reward.coins}</b></div>
      <div class="xp"><small>LV ${reward.after.level}${reward.levelUp ? ' · LEVEL UP!' : ''}</small><div class="xpbar"><i style="--k:${k.toFixed(3)}"></i></div><em>+${reward.xp} XP</em></div>
    </div>
    <div class="row2 res-btns">
      <button class="mbtn small menu-b"><span><b>MENU</b></span></button>
      <button class="mbtn primary again">${ICONS.play}<span><b>${summary.mode === 'campaign' && won ? 'NEXT STAGE' : 'REMATCH'}</b></span></button>
    </div>
  </div></section>`);
  node.querySelector('.again').onclick = () => h.again();
  node.querySelector('.menu-b').onclick = () => h.menu();
  return node;
}

export function settingsScreen(h, quality) {
  const node = el(`<section class="screen pause"><div class="card">
    <h2>SETTINGS</h2>
    <div class="row2">
      <button class="mbtn small quality"><span><b>GRAPHICS: ${quality.toUpperCase()}</b></span></button>
      <button class="mbtn small sound"><span><b>SOUND: ${h.muted() ? 'OFF' : 'ON'}</b></span></button>
    </div>
    <button class="mbtn primary back"><span><b>DONE</b></span></button>
  </div></section>`);
  node.querySelector('.back').onclick = () => h.back();
  node.querySelector('.quality').onclick = () => h.quality();
  node.querySelector('.sound').onclick = (ev) => { h.toggleSound(); ev.currentTarget.querySelector('b').textContent = 'SOUND: ' + (h.muted() ? 'OFF' : 'ON'); };
  return node;
}
export { CHARACTERS, outfitsFor, owns };
