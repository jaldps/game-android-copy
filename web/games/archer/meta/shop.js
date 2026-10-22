// Shop (owner: Meta specialist): heroes, outfits (with visible perks) and arrow unlocks. Prices live on the
// registry entries (def.price). Selecting a card previews it on the live 3D showcase via h.preview(charId, outfitId).
import { CHARACTERS, OUTFITS, getCharacter, outfitsFor, PERK_TYPES } from '../characters/index.js';
import { ARROWS } from '../arrows/index.js';
import { profile, owns, buy, equipChar, equipOutfit } from './progression.js';
import { ICONS, portrait, perkBadge, hex } from './screens.js';

const TABS = [['heroes', 'HEROES'], ['outfits', 'OUTFITS'], ['arrows', 'ARROWS']];

export function shopScreen(h) {
  let tab = 'heroes', focusChar = profile.equipped.char;
  const node = document.createElement('section'); node.className = 'screen shop';
  const render = () => {
    const cards = [];
    if (tab === 'heroes') for (const c of CHARACTERS) {
      const own = owns('chars', c.id), eq = profile.equipped.char === c.id;
      const s = c.stats;
      cards.push(`<div class="card-item ${eq ? 'eq' : ''}" data-kind="chars" data-id="${c.id}">
        ${portrait(c, 54)}
        <div class="ci-body"><b>${c.name}</b><small>${c.title}</small>
          <div class="statline"><span>HP <i>${s.hp}</i></span><span>MOVE <i>${Math.round(s.move * 100)}</i></span><span>DRAW <i>${Math.round(s.drawSpeed * 100)}</i></span></div></div>
        ${btn(own, eq, c.price)}</div>`);
    }
    if (tab === 'outfits') {
      for (const c of CHARACTERS) {
        cards.push(`<div class="group-h">${c.name.toUpperCase()}</div>`);
        for (const o of outfitsFor(c.id)) {
          const own = owns('outfits', o.id), eq = profile.equipped.outfit[c.id] === o.id && profile.equipped.char === c.id;
          const sw = ['top', 'bottom', 'boots'].map((k) => `<i style="background:${hex(o.colors?.[k])}"></i>`).join('');
          cards.push(`<div class="card-item ${eq ? 'eq' : ''}" data-kind="outfits" data-id="${o.id}">
            <span class="swatch">${sw}</span>
            <div class="ci-body"><b>${o.name}</b><small>${(PERK_TYPES[o.type]?.label ?? '').toUpperCase()}</small>${perkBadge(o)}</div>
            ${btn(own, eq, o.price)}</div>`);
        }
      }
    }
    if (tab === 'arrows') for (const a of ARROWS.filter((x) => !x.hidden)) {
      const own = owns('arrows', a.id);
      cards.push(`<div class="card-item" data-kind="arrows" data-id="${a.id}">
        <span class="arrow-ic" style="--ac:${a.color}">${a.icon}</span>
        <div class="ci-body"><b>${a.name}</b><small>${a.uses === Infinity ? 'UNLIMITED' : a.uses + ' PER MATCH'}</small><p>${a.desc}</p></div>
        ${own ? '<span class="owned">OWNED</span>' : `<button class="buy">${ICONS.coin}<b>${a.price}</b></button>`}</div>`);
    }
    node.innerHTML = `
      <header class="topbar">
        <button class="pill-btn back" aria-label="Back">${ICONS.left}</button>
        <h2>SHOP</h2><div class="spacer"></div>
        <div class="pill coins">${ICONS.coin}<b>${profile.coins}</b></div>
      </header>
      <div class="shop-panel">
        <nav class="tabs">${TABS.map(([id, label]) => `<button class="tab ${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
        <div class="cards">${cards.join('')}</div>
      </div>`;
    node.querySelector('.back').onclick = () => h.back();
    node.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; h.click(); render(); }));
    node.querySelectorAll('.card-item').forEach((card) => {
      const kind = card.dataset.kind, id = card.dataset.id;
      card.onclick = () => {
        if (kind === 'chars') { focusChar = id; h.preview(id, profile.equipped.outfit[id]); }
        if (kind === 'outfits') { const o = OUTFITS[id]; focusChar = o.char; h.preview(o.char, id); }
        h.click();
      };
      const b = card.querySelector('.buy, .equip');
      if (b) b.onclick = (ev) => {
        ev.stopPropagation();
        if (b.classList.contains('buy')) {
          const price = kind === 'chars' ? getCharacter(id).price : kind === 'outfits' ? OUTFITS[id].price : ARROWS.find((x) => x.id === id).price;
          if (!buy(kind, id, price)) { h.error(); card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 400); return; }
          h.bought();
        }
        if (kind === 'chars') { equipChar(id); h.preview(id, profile.equipped.outfit[id]); }
        if (kind === 'outfits') { const o = OUTFITS[id]; equipChar(o.char); equipOutfit(o.char, id); h.preview(o.char, id); }
        render();
      };
    });
  };
  function btn(own, eq, price) {
    if (eq) return '<span class="owned on">EQUIPPED</span>';
    if (own) return '<button class="equip">EQUIP</button>';
    return `<button class="buy">${ICONS.coin}<b>${price}</b></button>`;
  }
  render();
  return node;
}
