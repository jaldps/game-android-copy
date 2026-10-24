// In-match HUD. Bottom control strip (DOM, updated only on change), top cluster (timer, turn order, wind, minimap,
// pause/mute) and one overlay canvas for per-frame world-anchored drawing (HP bars, angle gauge, edge indicators,
// floating damage numbers). Budget: <= ~18% of the screen.
import { project, cam } from './camera.js';
import { R, insetRect } from './render.js';
import { portrait } from '../meta/index.js';
import { events } from './events.js';
import { trayArrows, getArrow } from '../arrows/index.js';
import { TURN } from './config.js';
import { DEG, clamp } from './util.js';
import { input, holdButton, stepButton } from './input.js';
import { audio } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const SVG = {
  left: '<svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  bow: '<svg viewBox="0 0 24 24"><path d="M6 3c7 3 7 15 0 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3v18M3 12h18m-4-3 4 3-4 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export class Hud {
  constructor(root, opts) {
    this.opts = opts; this.match = null; this.root = root;
    root.innerHTML = `
      <canvas class="hud-overlay"></canvas>
      <div class="hud-top-left">
        <div class="timer" aria-label="Turn time left"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="ring-bg"/><circle cx="22" cy="22" r="18" class="ring"/></svg><b>20</b><small>SEC</small></div>
        <div class="order"></div>
      </div>
      <div class="hud-wind" aria-label="Wind">
        <div class="compass"><i class="tick n"></i><i class="tick e"></i><i class="tick s"></i><i class="tick w"></i><div class="needle"><span></span></div><b>0</b></div>
        <small>WIND</small>
      </div>
      <div class="hud-top-right">
        <canvas class="minimap"></canvas>
        <button class="hbtn mute" aria-label="Sound">${SVG.sound}</button>
        <button class="hbtn pause" aria-label="Pause">${SVG.pause}</button>
      </div>
      <div class="strip">
        <div class="moves"><button class="sbtn mv-l" aria-label="Walk left">${SVG.left}</button><button class="sbtn mv-r" aria-label="Walk right">${SVG.right}</button></div>
        <div class="angle"><button class="sbtn ang-up" aria-label="Raise angle">${SVG.up}</button><div class="ang-read"><small>ANGLE</small><b>45°</b></div><button class="sbtn ang-dn" aria-label="Lower angle">${SVG.down}</button></div>
        <div class="gauges">
          <div class="power"><div class="fill"></div><div class="ticks"></div><div class="last"><i></i></div></div><span class="pv">0</span>
          <div class="move"><div class="fill"></div><small>MOVE</small></div>
        </div>
        <div class="tray"></div>
        <button class="fire" aria-label="Hold to draw, release to shoot">${SVG.bow}<span>HOLD</span></button>
      </div>
      <div class="banner"><span></span></div>
      <div class="callouts"></div>`;
    this.cv = $('.hud-overlay', root); this.ctx = this.cv.getContext('2d');
    this.mm = $('.minimap', root); this.mmCtx = this.mm.getContext('2d');
    this.el = {
      time: $('.timer b', root), ring: $('.timer .ring', root), timer: $('.timer', root), order: $('.order', root),
      needle: $('.needle', root), windVal: $('.compass b', root), ang: $('.ang-read b', root),
      powerFill: $('.power .fill', root), powerLast: $('.power .last', root), pv: $('.gauges .pv', root), moveFill: $('.move .fill', root),
      tray: $('.tray', root), fire: $('.fire', root), strip: $('.strip', root), banner: $('.banner', root), bannerText: $('.banner span', root),
      callouts: $('.callouts', root), mute: $('.mute', root), pause: $('.pause', root),
    };
    $('.power .ticks', root).innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="left:${(i + 1) * 10}%"></i>`).join('');
    holdButton($('.mv-l', root), (v) => (input.left = v));
    holdButton($('.mv-r', root), (v) => (input.right = v));
    stepButton($('.ang-up', root), 1);
    stepButton($('.ang-dn', root), -1);
    holdButton(this.el.fire, (v) => (input.fire = v));
    this.el.pause.addEventListener('click', () => { audio.play('ui_click'); opts.onPause?.(); });
    this.el.mute.addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.muted); this._syncMute(); audio.play('ui_click'); });
    this._syncMute();
    this.clock = 0; this.last = {}; this.floaters = []; for (let i = 0; i < 12; i++) this.floaters.push({ t0: -9, x: 0, y: 0, text: '', color: '#fff', ring: '#fff', big: false });
    this.ir = { x: 0, y: 0, w: 0, h: 0 };
    this.pt = { x: 0, y: 0, vis: false, nx: 0, ny: 0 }; this.order = [];
    this._mmDirty = true;
    this._bind();
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  _syncMute() { this.el.mute.innerHTML = audio.muted ? SVG.mute : SVG.sound; this.el.mute.classList.toggle('off', audio.muted); }
  _bind() {
    events.on('turn:start', (a) => {
      const you = a.human && !this.match?.cfg.hotseat;
      this.banner(a.human ? (this.match?.cfg.hotseat ? `${a.name.toUpperCase()}'S TURN` : 'YOUR TURN') : `${a.name.toUpperCase()}'S TURN`, you ? 'you' : 'foe');
      this._order(); this._tray();
    });
    events.on('turn:end', () => this._order());
    events.on('arrow:select', () => this._tray());
    events.on('shot', () => this._tray());
    events.on('callout', (text, kind) => this.callout(text, kind));
    events.on('actor:damage', (a, n, from, info) => { if (n > 0) this.float(a, '-' + n, info?.head ? '#ffe14a' : info?.direct ? '#ffb35c' : '#ffffff', !!(info?.head || n >= 30)); });
    events.on('actor:death', (a, cause) => { this.callout(cause === 'fell' ? `${a.name.toUpperCase()} FELL!` : `${a.name.toUpperCase()} DOWN!`, 'kill'); this._order(); });
    events.on('terrain:carve', () => (this._mmDirty = true));
    events.on('wind', (w) => this._wind(w));
  }
  attach(match) {
    this.match = match; this._mmDirty = true; this.last = {};
    for (const f of this.floaters) f.t0 = -9;
    this.el.callouts.innerHTML = ''; this._order(); this._tray(); this._wind(match.wind);
  }
  show(v) { const was = !this.root.classList.contains('hidden'); this.root.classList.toggle('hidden', !v); if (v && !was) this.resize(); }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr; this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
    const r = this.mm.getBoundingClientRect(), cw = r.width || (innerHeight <= 360 ? 120 : 148), ch = r.height || (innerHeight <= 360 ? 36 : 42);
    this.mm.width = Math.max(1, Math.round(cw * dpr)); this.mm.height = Math.max(1, Math.round(ch * dpr));
    this._mmDirty = true;
  }

  banner(text, kind) {
    const b = this.el.banner; this.el.bannerText.textContent = text;
    b.className = 'banner ' + kind; void b.offsetWidth; b.classList.add('show');
  }
  callout(text, kind = 'info') {
    const d = document.createElement('div'); d.className = 'callout ' + kind; d.textContent = text;
    this.el.callouts.appendChild(d); setTimeout(() => d.remove(), 1500);
  }
  /** World-anchored damage number over an actor's head. Wall-clock lifetime (FLOAT_LIFE) so it never lingers. */
  float(a, text, color, big) {
    let f = this.floaters[0]; for (const g of this.floaters) if (g.t0 < f.t0) f = g;
    // stack on a number that is still fresh over the same actor instead of overlapping it
    let k = 0; const now = this.clock;
    for (const g of this.floaters) if (g.a === a && now - g.t0 < 0.5) k++;
    f.t0 = now; f.a = a; f.x = a.hitShapes.hx + a.facing * -0.2; f.y = a.hitShapes.hy + 1.25 + k * 0.75;
    f.text = text; f.color = color; f.ring = a.color; f.big = big;
  }
  _wind(w) {
    if (!w) return;
    this.el.needle.style.transform = `rotate(${(-w.angle / DEG).toFixed(1)}deg) scaleX(${w.strength ? 0.55 + 0.45 * w.strength / TURN.windMax : 0.001})`;
    this.el.windVal.textContent = String(w.strength);
  }
  _order() {
    const m = this.match; if (!m) return;
    m.turnOrder(this.order);
    const hot = !!m.cfg.hotseat;
    // portrait chips with the team colour as a ring + a tag, so mirror matches stay readable
    this.el.order.innerHTML = this.order.slice(0, 4).map((a, i) => {
      const tag = a.human ? (hot ? a.name : 'YOU') : 'CPU';
      return `<span class="chip ${i === 0 ? 'now' : ''}" style="--tc:${a.color}">${portrait(a.charDef, i === 0 ? 30 : 24)}<i>${tag}</i></span>`;
    }).join('');
  }
  _tray() {
    const m = this.match; if (!m) return;
    const a = m.active ?? m.actors[0]; if (!a) return;
    this.el.tray.innerHTML = trayArrows().map((d, i) => {
      const n = a.ammo[d.id] ?? 0, sel = a.arrowId === d.id;
      return `<button class="slot ${sel ? 'sel' : ''} ${n > 0 ? '' : 'empty'}" data-i="${i}" style="--ac:${d.color}" aria-label="${d.name}">${d.icon}<em>${n === Infinity ? '∞' : n}</em></button>`;
    }).join('');
    this.el.tray.querySelectorAll('.slot').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.unlock(); input.arrowPick = +b.dataset.i; }));
  }
  _set(key, v, fn) { if (this.last[key] !== v) { this.last[key] = v; fn(v); } }

  update(dt) {
    const m = this.match; if (!m) return;
    this.clock += dt;   // game-time clock: damage numbers live 1.2 s of play, not of wall time (slow devices, headless)
    const a = m.active, el = this.el;
    if (a) {
      const myTurn = a.human && m.phase === 'act';
      this._set('mine', myTurn, (v) => el.strip.classList.toggle('locked', !v));
      this._set('ang', Math.round(a.angle), (v) => (el.ang.textContent = v + '°'));
      const pw = a.charging ? a.power : (m.phase === 'act' ? 0 : a.lastPower > 0 && m.phase !== 'intro' ? a.lastPower : 0);
      this._set('pw', Math.round(pw * 2) / 2, (v) => { el.powerFill.style.transform = `scaleX(${v / 100})`; el.pv.textContent = Math.round(v); });
      this._set('lp', a.lastPower, (v) => { el.powerLast.style.left = Math.min(v, 96) + '%'; el.powerLast.style.opacity = v >= 0 ? 1 : 0; });
      this._set('mv', Math.round(a.moveLeft / a.stats.moveGauge * 200) / 200, (v) => (el.moveFill.style.transform = `scaleX(${v})`));
      this._set('chg', a.charging, (v) => el.fire.classList.toggle('charging', v));
      const tl = Math.max(0, Math.ceil(m.timer));
      const live = m.phase === 'act' || m.phase === 'intro';
      this._set('tl', live, (v) => el.timer.classList.toggle('idle', !v));
      this._set('t', live ? tl : -1, (v) => {
        if (v >= 0) el.time.textContent = String(v);
        el.ring.style.strokeDashoffset = String(113.1 * (1 - Math.max(0, v) / TURN.time));
        el.timer.classList.toggle('low', v >= 0 && v <= 5);
        if (v >= 0 && v <= 5 && m.phase === 'act') audio.play('timer_tick');
      });
    }
    this._draw(dt);
    this._minimap();
  }

  _draw(dt) {
    const m = this.match, c = this.ctx, d = this.dpr, W = innerWidth, H = innerHeight, pt = this.pt;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const strip = H - 70;
    // angle gauge around the active archer
    const a = m.active;
    if (a && a.alive && m.phase === 'act') {
      project(a.x, a.y + 1.45, 0.8, pt);
      const s = a.grounded ? a.slope(m.terrain) : 0, f = a.facing;
      const R = 50, base = f > 0 ? -s : Math.PI + s;           // screen angles (y down)
      const from = f > 0 ? base - Math.PI / 2 : base, to = f > 0 ? base : base + Math.PI / 2;
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(10,18,40,0.45)'; c.lineWidth = 9; c.beginPath(); c.arc(pt.x, pt.y, R, from, to); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.beginPath(); c.arc(pt.x, pt.y, R, from, to); c.stroke();
      for (let k = 0; k <= 6; k++) { const t = from + (to - from) * k / 6; c.lineWidth = k % 3 ? 1.5 : 2.5; c.beginPath(); c.moveTo(pt.x + Math.cos(t) * (R - 6), pt.y + Math.sin(t) * (R - 6)); c.lineTo(pt.x + Math.cos(t) * (R + 4), pt.y + Math.sin(t) * (R + 4)); c.stroke(); }
      const ang = (deg) => (f > 0 ? base - deg * DEG : base + deg * DEG);
      if (a.lastAngle >= 0 && a.human) { const t = ang(a.lastAngle); c.strokeStyle = 'rgba(255,225,74,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(pt.x + Math.cos(t) * (R - 9), pt.y + Math.sin(t) * (R - 9)); c.lineTo(pt.x + Math.cos(t) * (R + 9), pt.y + Math.sin(t) * (R + 9)); c.stroke(); }
      const t = ang(a.angle);
      c.strokeStyle = a.color; c.lineWidth = 5; c.beginPath(); c.moveTo(pt.x + Math.cos(t) * 16, pt.y + Math.sin(t) * 16); c.lineTo(pt.x + Math.cos(t) * (R + 12), pt.y + Math.sin(t) * (R + 12)); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(pt.x + Math.cos(t) * (R + 12), pt.y + Math.sin(t) * (R + 12), 4, 0, 7); c.fill();
    }
    // HP bars + names (the active archer's label sits above its angle gauge)
    const gaugeTop = a && a.alive && m.phase === 'act' ? (project(a.x, a.y + 1.45, 0.8, pt), pt.y - 50 - 16) : 1e9;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const I = R.inset, insetActor = I.on && I.ready ? I.actor : null;
    for (const b of m.actors) {
      if (!b.alive && b.deathCause === 'fell') continue;
      project(b.x, b.hitShapes.hy + 0.62, 0, pt);
      if (b === a && pt.y > gaugeTop) pt.y = gaugeTop;
      if (pt.vis && pt.y < strip) {
        const w = 56, h = 7, x = pt.x - w / 2, y = Math.max(76, pt.y - 4);
        // name plate on a dark pill so it reads over foliage and bright skies
        c.font = '800 11px Nunito, sans-serif';
        const label = b === a && m.phase !== 'end' ? '▼ ' + b.name : b.name, tw = c.measureText(label).width;
        c.fillStyle = 'rgba(8,14,32,0.62)'; rr(c, pt.x - tw / 2 - 6, y - 17, tw + 12, 15, 7.5); c.fill();
        c.fillStyle = 'rgba(8,14,32,0.72)'; rr(c, x - 2, y - 2, w + 4, h + 4, 5); c.fill();
        const k = clamp(b.hpShown / b.stats.maxHp, 0, 1), k2 = clamp(b.hp / b.stats.maxHp, 0, 1);
        c.fillStyle = '#ffffff'; rr(c, x, y, w * k, h, 3.5); c.fill();
        c.fillStyle = b.color; rr(c, x, y, w * k2, h, 3.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; rr(c, x + 1, y + 1, Math.max(0, w * k2 - 2), 2, 1); c.fill();
        c.fillStyle = b === a ? '#ffe14a' : '#ffffff'; c.fillText(label, pt.x, y - 6);
      } else if (b.alive && b !== insetActor) this._edge(b);
    }
    if (insetActor) this._insetFrame(insetActor);
    this._arrowMarker();
    // floating damage numbers: pop-scale in, drift up, fade by FLOAT_LIFE; never inside the top HUD band
    const now = this.clock;
    c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (const f of this.floaters) {
      const t = now - f.t0; if (t > FLOAT_LIFE || t < 0) continue;
      project(f.x, f.y + t * 0.9, 0, pt); if (!pt.vis) continue;
      const y = clamp(pt.y, 92, H - 96);
      const pop = t < 0.09 ? 0.4 + 0.95 * t / 0.09 : t < 0.22 ? 1.35 - 0.35 * (t - 0.09) / 0.13 : 1;
      const al = t > FLOAT_LIFE - 0.35 ? Math.max(0, (FLOAT_LIFE - t) / 0.35) : 1, sz = (f.big ? 42 : 32) * pop;
      c.globalAlpha = al; c.font = `400 ${sz.toFixed(1)}px 'Lilita One', sans-serif`;
      c.lineWidth = 9; c.strokeStyle = '#1a1030'; c.strokeText(f.text, pt.x, y);
      c.lineWidth = 3.2; c.strokeStyle = f.ring; c.strokeText(f.text, pt.x, y);
      c.fillStyle = f.color; c.fillText(f.text, pt.x, y); c.globalAlpha = 1;
    }
    c.textBaseline = 'alphabetic';
  }
  /** Border + label for the picture-in-picture view of a far target (render.js draws the picture). */
  _insetFrame(b) {
    const c = this.ctx, r = insetRect(R.inset.side, this.ir), side = R.inset.side;
    c.lineWidth = 3; c.strokeStyle = b.color; rr(c, r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3, 13); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.55)'; rr(c, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 10); c.stroke();
    const ref = this.match.active && this.match.active !== b ? this.match.active.x : cam.x, dist = Math.round(Math.abs(b.x - ref));
    const text = `${b.name}  ${dist}m`;
    c.font = '800 11px Nunito, sans-serif'; const tw = c.measureText(text).width + 26;
    const lx = side > 0 ? r.x + r.w - tw - 6 : r.x + 6, ly = r.y + r.h - 22;
    c.fillStyle = 'rgba(8,14,32,0.78)'; rr(c, lx, ly, tw, 17, 8.5); c.fill();
    c.fillStyle = b.color; c.beginPath();
    const ax = side > 0 ? lx + 10 : lx + 10; c.moveTo(ax - 4 * side, ly + 4); c.lineTo(ax + 5 * side, ly + 8.5); c.lineTo(ax - 4 * side, ly + 13); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(text, lx + 19, ly + 12.5); c.textAlign = 'center';
    const k = clamp(b.hp / b.stats.maxHp, 0, 1), bw = r.w - 24;
    c.fillStyle = 'rgba(8,14,32,0.72)'; rr(c, r.x + 12, r.y + 7, bw, 6, 3); c.fill();
    c.fillStyle = b.color; rr(c, r.x + 12, r.y + 7, bw * k, 6, 3); c.fill();
  }
  /** Chevron on the top edge when the arrow climbs above the view. */
  _arrowMarker() {
    const m = this.match, p = m.projectiles.leader(); if (!p || m.phase !== 'flight') return;
    const pt = this.pt; project(p.x, p.y, 0, pt);
    if (pt.y > innerHeight * 0.18 || pt.x < 0 || pt.x > innerWidth) return;   // above the view or under the top HUD band
    const c = this.ctx, x = clamp(pt.x, 30, innerWidth - 30), y = 84;
    c.fillStyle = 'rgba(8,14,32,0.7)'; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill();
    c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 6, y + 3); c.lineTo(x - 6, y + 3); c.closePath(); c.fill();
  }
  _edge(b) {
    const c = this.ctx, pt = this.pt, W = innerWidth, H = innerHeight;
    project(b.x, b.y + 1, 0, pt);
    const cx = W / 2, cy = H / 2 - 20; let dx = pt.nx, dy = -pt.ny;
    if (!isFinite(dx) || !isFinite(dy)) return;
    const s = Math.max(Math.abs(dx), Math.abs(dy) * (W / H)) || 1; dx /= s; dy /= s;
    const x = clamp(cx + dx * (W / 2 - 34), 34, W - 34);
    let y = clamp(cy + dy * (H / 2 - 34), 56, H - 96);
    if (R.inset.on && R.inset.ready) { const r = R.inset.rect; if (x > r.x - 30 && x < r.x + r.w + 30 && y < r.y + r.h + 26) y = r.y + r.h + 28; }
    const ang = Math.atan2(pt.y - y, pt.x - x);
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(8,14,32,0.75)'; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.fill();
    c.strokeStyle = b.color; c.lineWidth = 3; c.stroke();
    c.rotate(ang); c.fillStyle = b.color; c.beginPath(); c.moveTo(25, 0); c.lineTo(17, -7); c.lineTo(17, 7); c.closePath(); c.fill();
    c.rotate(-ang); c.fillStyle = '#fff'; c.font = "400 15px 'Lilita One', sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.charDef.name[0], 0, 1);
    c.restore(); c.textBaseline = 'alphabetic';
    const ref = this.match.active && this.match.active !== b ? this.match.active.x : cam.x, dist = Math.round(Math.abs(b.x - ref));
    c.font = '800 10px Nunito, sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(8,14,32,0.8)'; c.lineWidth = 3; c.strokeText(dist + 'm', x, y + 30); c.fillText(dist + 'm', x, y + 30);
  }
  _minimap() {
    const m = this.match, T = m.terrain, c = this.mmCtx, w = this.mm.width, h = this.mm.height;
    if (!w || !h) return;
    const b = m.map.bounds ?? { minX: -60, maxX: 60, minY: -12, maxY: 34 };
    const sx = (x) => (x - b.minX) / (b.maxX - b.minX) * w, sy = (y) => h - (y - b.minY) / (b.maxY - b.minY) * h;
    if (this._mmDirty) {
      this._mmDirty = false;
      if (!this.mmBase || this.mmBase.width !== w || this.mmBase.height !== h) { this.mmBase = document.createElement('canvas'); this.mmBase.width = w; this.mmBase.height = h; }
      const bc = this.mmBase.getContext('2d'), img = bc.createImageData(w, h), D = img.data;
      for (let py = 0; py < h; py++) {
        const wy = b.minY + (1 - (py + 0.5) / h) * (b.maxY - b.minY);
        for (let px = 0; px < w; px++) {
          const wx = b.minX + (px + 0.5) / w * (b.maxX - b.minX), o = (py * w + px) * 4;
          if (T.solid(wx, wy)) { const top = !T.solid(wx, wy + (b.maxY - b.minY) / h * 1.5); D[o] = top ? 160 : 112; D[o + 1] = top ? 236 : 150; D[o + 2] = top ? 120 : 168; D[o + 3] = 255; }
          else if (wy < m.killY) { D[o] = 40; D[o + 1] = 110; D[o + 2] = 170; D[o + 3] = 200; }
        }
      }
      bc.putImageData(img, 0, 0);
    }
    c.clearRect(0, 0, w, h);
    c.drawImage(this.mmBase, 0, 0);
    // camera window
    const aspect = innerWidth / innerHeight, hw = cam.h * aspect / 2, hh = cam.h / 2;
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = Math.max(1, this.dpr); c.strokeRect(sx(cam.x - hw), sy(cam.y + hh), (hw * 2) / (b.maxX - b.minX) * w, (hh * 2) / (b.maxY - b.minY) * h);
    for (const a of m.actors) {
      if (!a.alive) continue;
      c.fillStyle = a.color; c.beginPath(); c.arc(sx(a.x), sy(a.y + 0.8), 3.2 * this.dpr, 0, 7); c.fill();
      c.strokeStyle = a === m.active ? '#fff' : 'rgba(0,0,0,0.6)'; c.lineWidth = this.dpr; c.stroke();
    }
    const p = m.projectiles.leader();
    if (p) { c.fillStyle = '#ffe14a'; c.beginPath(); c.arc(sx(p.x), sy(p.y), 2.2 * this.dpr, 0, 7); c.fill(); }
  }
}
const FLOAT_LIFE = 1.2;
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); if (w <= 0) return; c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
