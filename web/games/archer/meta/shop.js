// Shop (owner: Meta specialist): heroes, outfits (with their perk icon + one-line perk, read from the outfit defs)
// and arrow unlocks + quiver loadout. Prices live on the registry entries (def.price). Selecting a card previews it on
// the live 3D turntable via h.preview(charId, outfitId). Purchases go through h.buy() (coins, feedback, persistence).
import { CHARACTERS, OUTFITS, getCharacter, outfitsFor, PERK_TYPES, computeStats } from '../characters/index.js';
import { ARROWS, trayArrows } from '../arrows/index.js';
import { profile, owns, blocker, loadout, toggleLoadout, LOADOUT_SLOTS } from './progression.js';
import { ICONS, portrait, perkBadge, perkIcon, statBars } from './screens.js';

const TABS = [['heroes', 'HEROES'], ['outfits', 'OUTFITS'], ['arrows', 'ARROWS']];

export function shopScreen(h) {
  let tab = 'heroes', focus = profile.equipped.char, scroll = 0;
  const node = document.createElement('section'); node.className = 'screen shop';
  const priceBtn = (kind, id, price) => {
    const b = blocker(kind, id);
    if (b === 'hero') return `<span class="need">${ICONS.lock}<small>UNLOCK HERO</small></span>`;
    return `<button class="buy ${b === 'coins' ? 'poor' : ''}">${ICONS.coin}<b>${price}</b></button>`;
  };
  const render = () => {
    const cards = [];
    if (tab === 'heroes') for (const c of CHARACTERS) {
      const own = owns('chars', c.id), eq = profile.equipped.char === c.id, s = computeStats(c, null);
      cards.push(`<div class="card-item hero ${eq ? 'eq' : ''} ${focus === c.id ? 'focus' : ''}" data-kind="chars" data-id="${c.id}" data-char="${c.id}">
        ${portrait(c, 52)}
        <div class="ci-body"><b>${c.name}</b><small>${c.title}</small>
          <div class="statline"><span>HP <i>${s.maxHp}</i></span><span>MOVE <i>${s.moveGauge.toFixed(1)}</i></span><span>WIND <i>${Math.round(s.windResist * 100)}%</i></span><span>DRAW <i>${Math.round(c.stats?.drawSpeed * 100 || 100)}</i></span></div></div>
        ${eq ? '<span class="owned on">EQUIPPED</span>' : own ? '<button class="equip">EQUIP</button>' : priceBtn('chars', c.id, c.price)}</div>`);
    }
    if (tab === 'outfits') for (const c of CHARACTERS) {
      const heroOwned = owns('chars', c.id);
      cards.push(`<div class="group-h">${portrait(c, 22)}${c.name.toUpperCase()}${heroOwned ? '' : `<em>${ICONS.lock} hero locked</em>`}</div>`);
      for (const o of outfitsFor(c.id)) {
        const own = owns('outfits', o.id), eq = profile.equipped.outfit[c.id] === o.id && heroOwned;
        cards.push(`<div class="card-item outfit ${eq ? 'eq' : ''} ${focus === o.id ? 'focus' : ''}" data-kind="outfits" data-id="${o.id}" data-char="${c.id}">
          ${perkIcon(o)}
          <div class="ci-body"><b>${o.name}</b><small>${(PERK_TYPES[o.type]?.label ?? o.type).toUpperCase()} · ${c.name.toUpperCase()}</small><p>${o.perkText}</p></div>
          ${eq ? '<span class="owned on">EQUIPPED</span>' : own ? (heroOwned ? '<button class="equip">EQUIP</button>' : '<span class="owned">OWNED</span>') : priceBtn('outfits', o.id, o.price)}</div>`);
      }
    }
    if (tab === 'arrows') {
      const l = loadout();
      cards.push(`<div class="group-h">QUIVER ${l.length}/${LOADOUT_SLOTS} — specials you bring into every match</div>`);
      for (const a of trayArrows()) {
        const own = owns('arrows', a.id), inQ = a.uses === Infinity || l.includes(a.id);
        cards.push(`<div class="card-item arrow ${own && inQ ? 'eq' : ''}" data-kind="arrows" data-id="${a.id}">
          <span class="arrow-ic" style="--ac:${a.color}">${a.icon}</span>
          <div class="ci-body"><b>${a.name}</b><small>${a.uses === Infinity ? 'UNLIMITED' : a.uses + ' PER MATCH'}${a.delay ? ` · +${a.delay} DELAY` : ''}</small><p>${a.desc ?? ''}</p></div>
          ${!own ? priceBtn('arrows', a.id, a.price) : a.uses === Infinity ? '<span class="owned on">ALWAYS</span>' : `<button class="qtoggle ${inQ ? 'on' : ''}">${inQ ? ICONS.check + 'IN QUIVER' : 'ADD'}</button>`}</div>`);
      }
    }
    const fc = getCharacter(OUTFITS[focus]?.char ?? focus), fo = OUTFITS[focus] ?? OUTFITS[profile.equipped.outfit[fc.id]];
    node.innerHTML = `
      <header class="topbar">
        <button class="pill-btn back" aria-label="Back">${ICONS.left}</button>
        <h2>SHOP</h2><div class="spacer"></div>
        <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      </header>
      <div class="shop-panel">
        <nav class="tabs">${TABS.map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
        <div class="cards">${cards.join('')}</div>
      </div>
      ${tab === 'arrows' ? '' : `<div class="shop-inspect"><div class="si-head"><b>${fc.name}</b><em>${fo?.name ?? ''}</em></div>${statBars(fc, fo)}${fo ? perkBadge(fo) : ''}</div>`}`;
    const list = node.querySelector('.cards'); list.scrollTop = scroll; list.onscroll = () => (scroll = list.scrollTop);
    node.querySelector('.back').onclick = h.back;
    node.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; scroll = 0; h.click(); render(); }));
    node.querySelectorAll('.card-item').forEach((card) => {
      const kind = card.dataset.kind, id = card.dataset.id;
      card.onclick = () => {
        if (kind === 'chars') { focus = id; h.preview(id, profile.equipped.outfit[id]); }
        else if (kind === 'outfits') { focus = id; h.preview(OUTFITS[id].char, id); }
        else return;
        h.click(); render();
      };
      const b = card.querySelector('.buy, .equip, .qtoggle');
      if (b) b.onclick = (ev) => {
        ev.stopPropagation();
        if (b.classList.contains('qtoggle')) { if (toggleLoadout(id)) h.click(); else h.error(); render(); return; }
        if (b.classList.contains('buy')) { if (!h.buy(kind, id, b)) return; }
        if (kind === 'chars') { focus = id; h.equip(id, profile.equipped.outfit[id]); }
        if (kind === 'outfits' && owns('chars', OUTFITS[id].char)) { focus = id; h.equip(OUTFITS[id].char, id); }
        render();
        if (b.classList.contains('buy')) node.querySelector(`.card-item[data-id="${id}"]`)?.classList.add('bought');
      };
    });
  };
  render();
  node.refresh = render;
  return node;
}
export { ARROWS };
