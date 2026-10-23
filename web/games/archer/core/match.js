// Match: builds the world for a map, runs the Gunbound-style turn loop (delay-ordered turns, move -> aim -> charge -> fly
// -> settle), resolves damage/knockback/craters, directs the camera and exposes the arrow `api` and AI `view`.
import * as THREE from 'three';
import { TURN, COMBAT, PHYS } from './config.js';
import { Terrain, MAT } from './terrain.js';
import { TerrainMesh } from './terrainMesh.js';
import { PropLayer } from './props.js';
import { Actor } from './actors.js';
import { Projectiles } from './projectiles.js';
import { simulateShot, stepBody, distToShapes, launchSpeed } from './physics.js';
import { cam, lookAt, frameBox, boxHeight, cyFor, setInset, addShake, addPunch, setBounds, snap } from './camera.js';
import { makeRng, clamp, damp, DEG } from './util.js';
import { events } from './events.js';
import { audio } from './audio.js';
import { applyLighting, R } from './render.js';
import { getMap, terrainMaterialFor, PROP_TYPES, createPropMaterial } from '../maps/index.js';
import { getCharacter, getOutfit, defaultOutfit, createCharacter, computeStats } from '../characters/index.js';
import { getArrow, trayArrows } from '../arrows/index.js';

const TEAM_COLORS = ['#3fa8ff', '#ff5a4a', '#5ee07a', '#ffcf3a'];
const _pt = { x: 0, y: 0 }, _sim = { x: 0, y: 0, vx: 0, vy: 0 }, _res = {};

export class Match {
  /**
   * cfg: { mapId, seed, mode, showcase?, players: [{ charId, outfitId, controller, name?, team, difficulty?, ammo? }] }
   * hooks: { scene, fx, controllers: (playerCfg, slot) => controller, onEnd(summary) }
   */
  constructor(cfg, hooks) {
    this.cfg = cfg; this.hooks = hooks; this.fx = hooks.fx;
    this.seed = cfg.seed >>> 0; this.rng = makeRng(this.seed); this.fx.setRandom(makeRng(this.seed ^ 0x9e3779b9));
    this.map = getMap(cfg.mapId); this.killY = this.map.killY ?? -9.5;
    // What falling off the map looks/sounds like: water by default, but lava and street maps name their own.
    // Fall back to the splash if the named preset isn't registered, rather than playing nothing.
    this.fallVfx = this.fx?.has(this.map.fallVfx) ? this.map.fallVfx : 'splash';
    this.fallSfx = audio.has(this.map.fallSfx) ? this.map.fallSfx : 'splash';
    // per-map impact accent (embers on lava, snow powder, sand...) + the surface colour debris chips take
    this.accentVfx = this.fx?.has('accent_' + this.map.id) ? 'accent_' + this.map.id : null;
    this._fxo = { terrainColor: 0, topColor: 0, scale: 1, dirX: 0, dirY: 1 };
    this.root = new THREE.Group(); this.root.name = 'match'; hooks.scene.add(this.root);
    applyLighting(this.map.lighting);
    this.topColor = this.map.palette?.snow ? 0xf4f8ff : (this.map.palette?.grass ?? 0x6cc04a);
    // terrain
    this.terrain = new Terrain();
    this.gen = this.map.generate(this.terrain, this.rng) ?? { spawns: [] };
    this.terrainMesh = new TerrainMesh(this.terrain, terrainMaterialFor(this.map), this.root);
    this.terrainMesh.update();
    // props + backdrop
    this.props = new PropLayer(this.root, PROP_TYPES, createPropMaterial);
    this.map.decorate?.({ terrain: this.terrain, rng: this.rng, props: this.props, gen: this.gen, MAT });
    this.props.build();
    this.backdrop = this.map.buildBackdrop?.({ rng: this.rng, gen: this.gen }) ?? null;
    if (this.backdrop) this.root.add(this.backdrop.group);
    const b = this.map.bounds ?? { minX: -60, maxX: 60, minY: -12, maxY: 34 };
    setBounds(b.minX, b.maxX, b.minY, b.maxY);
    // projectiles
    this.projectiles = new Projectiles(this.root, this.fx);
    this.api = this._makeApi(); this.projectiles.setApi(this.api);
    // actors
    this.actors = [];
    cfg.players.forEach((pc, i) => this._addActor(pc, i));
    // preview dots (aim guide)
    this.preview = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }), 24);
    this.preview.frustumCulled = false; this.preview.count = 0; this.preview.renderOrder = 7; this.root.add(this.preview);
    this._pm = new THREE.Matrix4(); this._pv = new THREE.Vector3(); this._ps = new THREE.Vector3(); this._pq = new THREE.Quaternion();
    // state
    this.time = 0; this.turnNo = 0; this.phase = cfg.showcase ? 'showcase' : 'intro'; this.phaseT = 0; this.timer = TURN.time;
    this.active = null; this.timeScale = 1; this.slowTarget = 1; this.slowHold = 0; this.hitStop = 0; this.settleT = 0; this.lastImpact = null;
    this.wind = { x: 0, y: 0, strength: 0, angle: 0 }; this.windTarget = 0;
    this.over = false; this.winnerTeam = -1; this.endT = 0; this.movedThisTurn = 0; this.firedThisTurn = false; this.shotArrow = 'standard';
    this.intent = { move: 0, aimDelta: 0, aimTo: null, facing: 0, charge: false, arrow: null, skip: false };
    this._wasCharging = false; this.startT = 0;
    if (!cfg.showcase) { this._beginTurn(this._nextActor()); snap(); }
    else this._showcaseCam(true);
    if (!cfg.thumb) events.emit('match:start', this);
  }

  // ------------------------------------------------------------------ setup
  _addActor(pc, i) {
    const def = getCharacter(pc.charId);
    let outfit = getOutfit(pc.outfitId); if (!outfit || outfit.char !== def.id) outfit = defaultOutfit(def.id);
    const character = createCharacter(def, outfit);
    const stats = computeStats(def, outfit);
    const a = new Actor({ slot: i, team: pc.team ?? i, name: pc.name ?? def.name, color: TEAM_COLORS[(pc.team ?? i) % 4], charDef: def, outfitDef: outfit, stats, character,
      human: pc.controller === 'human', controller: this.hooks.controllers(pc, i), difficulty: pc.difficulty ?? 'normal' });
    for (const ad of trayArrows()) a.ammo[ad.id] = pc.ammo?.[ad.id] ?? ad.uses;
    this.root.add(character.root);
    const sp = this.gen.spawns?.[i] ?? { x: (i % 2 ? 1 : -1) * 30 };
    a.spawnAt(sp.x, this.terrain);
    a.delay = i * 10 + (this.rng() * 4 | 0);
    a.facing = sp.x < 0 ? 1 : -1;
    a.angle = 40 + this.rng() * 10;
    this.actors.push(a);
    return a;
  }
  /** Replace an actor's visuals (shop / menu preview). */
  restyle(slot, charId, outfitId) {
    const a = this.actors[slot]; if (!a) return;
    const def = getCharacter(charId);
    let outfit = getOutfit(outfitId); if (!outfit || outfit.char !== def.id) outfit = defaultOutfit(def.id);
    this.root.remove(a.character.root); a.character.dispose();
    a.character = createCharacter(def, outfit); a.charDef = def; a.outfitDef = outfit; a.stats = computeStats(def, outfit);
    a.hitShapes = a.character.hitShapes; a.root = a.character.root; this.root.add(a.root); a._sync();
  }

  _makeApi() {
    const m = this;
    return {
      match: m, get terrain() { return m.terrain; }, get wind() { return m.wind; }, get actors() { return m.actors; }, get rng() { return m.rng; },
      explode: (x, y, o) => m.explode(x, y, o),
      spawn: (id, x, y, vx, vy, o) => m.projectiles.spawn(id, x, y, vx, vy, o),
      carve: (x, y, r) => m.carve(x, y, r),
      fx: (id, x, y, o) => m.fx.burst(id, x, y, o),
      emitParticles: (emitter, x, y, o) => m.fx.emit(emitter, x, y, o),
      sfx: (id, o) => audio.play(id, o),
      shake: (a) => addShake(a),
      slowmo: (scale, dur) => { m.slowTarget = scale; m.slowHold = dur; },
      callout: (text, kind) => events.emit('callout', text, kind ?? 'info'),
      emit: (name, a, b) => events.emit(name, a, b),
    };
  }

  // ------------------------------------------------------------------ combat
  terrainColorAt(x, y) {
    const P = this.map.palette ?? {}, mt = this.terrain.matAt(x, y - 0.2);
    return mt === MAT.BRICK ? (P.brick ?? 0xd8c3a0) : mt === MAT.WOOD ? (P.wood ?? 0x9a6438) : mt === MAT.ICE ? (P.ice ?? 0xbfefff) : mt === MAT.SAND ? (P.sand ?? 0xf0d590) : (P.rock ?? 0xc49a6c);
  }
  carve(x, y, r) {
    if (this.terrain.carve(x, y, r, (this.rng() * 1000) | 0)) {
      this.props.disturb(x, y, r, this.terrain, this.rng);
      events.emit('terrain:carve', x, y, r);
    }
  }
  /**
   * Explosion/impact. o: { base, radius, crater, knockback, owner, direct (actor), part ('head'|'body'), vfx, sfx, arrow }
   */
  explode(x, y, o) {
    const tc = this.terrainColorAt(x, y);
    if (o.crater > 0) this.carve(x, y, o.crater);
    let total = 0, best = 0, bestActor = null;
    for (const a of this.actors) {
      if (!a.alive) continue;
      let d = a === o.direct ? 0 : Math.max(0, distToShapes(a.hitShapes, x, y));
      if (d >= o.radius) continue;
      const f = Math.pow(1 - d / o.radius, COMBAT.falloffPow);
      let dmg = o.base * f;
      const info = { direct: a === o.direct, head: a === o.direct && o.part === 'head', arrow: o.arrow };
      if (info.direct) dmg *= COMBAT.directBonus * (o.owner?.stats.directMult ?? 1);
      if (info.head) dmg *= COMBAT.headshotBonus * (o.owner?.stats.headshotMult ?? 1);
      const n = a.damage(dmg, o.owner, info);
      if (o.owner && o.owner !== a) { o.owner.stat.damage += n; if (n > 0) o.owner.stat.hits++; if (info.head) o.owner.stat.headshots++; }
      total += n; if (n > best) { best = n; bestActor = a; }
      // knockback
      const cx = (a.hitShapes.ax + a.hitShapes.bx) / 2, cy = (a.hitShapes.ay + a.hitShapes.by) / 2;
      let dx = cx - x, dy = cy - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const imp = (o.knockback ?? 4) * f * a.stats.knockbackMult;
      if (imp > 1.2) { a.vx += dx * imp; a.vy += Math.max(0.35, dy) * imp * 0.9; a.grounded = false; }
      if (info.head) { this.hitStop = 0.45; addPunch(0.18); events.emit('callout', 'HEADSHOT!', 'headshot'); this.fx.burst('headshot', a.hitShapes.hx, a.hitShapes.hy); audio.play('headshot'); }
      else if (info.direct) { this.hitStop = Math.max(this.hitStop, 0.16); addPunch(0.08); events.emit('callout', 'DIRECT HIT!', 'direct'); }
    }
    const fo = this._fxo; fo.terrainColor = tc; fo.topColor = this.topColor; fo.scale = Math.max(0.7, o.radius / 1.5); fo.dirX = o.nx; fo.dirY = o.ny;
    this.fx.burst(o.vfx ?? 'impact_dirt', x, y, fo);
    if (this.accentVfx) { fo.scale = Math.min(1.5, Math.max(0.6, o.radius / 2)); this.fx.burst(this.accentVfx, x, y, fo); }
    if (o.sfx) audio.play(o.sfx);
    this.lastImpact = { x, y, t: this.time }; this.settleT = 0;
    events.emit('impact', x, y, o, total);
    if (total === 0 && o.owner && !this.firedHit) { /* miss tracked by settle */ }
    if (total > 0) this.firedHit = true;
    return total;
  }

  // ------------------------------------------------------------------ turns
  _alive() { return this.actors.filter((a) => a.alive); }
  _nextActor() {
    let best = null;
    for (const a of this.actors) if (a.alive && (!best || a.delay < best.delay - 1e-6)) best = a;
    return best;
  }
  /** Order of upcoming turns (for the HUD strip). */
  turnOrder(out) {
    out.length = 0; for (const a of this.actors) if (a.alive) out.push(a);
    out.sort((p, q) => p.delay - q.delay); return out;
  }
  _rollWind() {
    const r = this.rng();
    const strength = Math.round(r < 0.12 ? 0 : Math.pow(this.rng(), 0.8) * TURN.windMax);
    const ang = Math.round(this.rng() * 24) / 24 * Math.PI * 2;
    this.wind.strength = strength; this.wind.angle = ang;
    this.wind.x = Math.cos(ang) * strength; this.wind.y = Math.sin(ang) * strength * 0.5;
    this.props.setWind(this.wind.x / TURN.windMax);
    events.emit('wind', this.wind);
  }
  _beginTurn(a) {
    if (!a) return;
    this.active = a; this.turnNo++; this.phase = 'intro'; this.phaseT = 0; this.timer = TURN.time;
    a.moveLeft = a.stats.moveGauge; a.power = 0; a.charging = false; this.movedThisTurn = 0; this.firedThisTurn = false; this.firedHit = false;
    if (!(a.ammo[a.arrowId] > 0)) a.arrowId = 'standard';
    cam.panX = 0; cam.panY = 0;
    this._rollWind();
    a.controller?.beginTurn?.(a, this);
    const foe = this.nearestFoe(a);
    if (foe) a.facing = foe.x > a.x ? 1 : -1;
    this._actCam(a);
    events.emit('turn:start', a, this.turnNo);
    audio.play('turn_start');
  }
  _endTurn(skipped) {
    const a = this.active; if (!a) return;
    const arrowDelay = this.firedThisTurn ? (getArrow(this.shotArrow).delay ?? 0) : 0;
    a.delay += (TURN.baseDelay + arrowDelay + this.movedThisTurn * TURN.moveDelay + (skipped ? TURN.idleDelay : 0)) * a.stats.delayMult;
    events.emit('turn:end', a, skipped);
    this.phase = 'settle'; this.phaseT = 0; this.settleT = 0;
  }
  nearestFoe(a) {
    let best = null, bd = 1e9;
    for (const b of this.actors) if (b.alive && b.team !== a.team) { const d = Math.abs(b.x - a.x); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  _checkWin() {
    const teams = new Set(); for (const a of this.actors) if (a.alive) teams.add(a.team);
    if (teams.size <= 1) { this.over = true; this.winnerTeam = teams.size ? [...teams][0] : -1; this.phase = 'end'; this.phaseT = 0; this._celebrate(); return true; }
    return false;
  }
  _celebrate() {
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.character.setAnim(a.team === this.winnerTeam ? 'victory' : 'defeat');
    }
    const w = this.actors.find((a) => a.alive && a.team === this.winnerTeam);
    setInset(false);
    if (w) this._frameActor(w, 10, 0.62, 2);
    events.emit('match:over', this.winnerTeam);
  }

  // ------------------------------------------------------------------ AI / controller view
  /** Simulate a shot for AI planning (pure). Returns a shared result object (copy what you need). */
  simulate(actor, angleRelDeg, power, arrowId, target = null, facing = actor.facing) {
    const ang0 = actor.angle, f0 = actor.facing;
    actor.angle = angleRelDeg; actor.facing = facing;
    const ang = actor.aimWorld(this.terrain);
    actor.angle = ang0; actor.facing = f0;
    actor.muzzleAt(ang, _pt);
    return simulateShot({ terrain: this.terrain, x: _pt.x, y: _pt.y, angle: ang, power, phys: getArrow(arrowId).physics, wind: this.wind, windResist: actor.stats.windResist,
      actors: this.actors, owner: actor, killY: this.killY, target }, _res);
  }

  // ------------------------------------------------------------------ update
  update(dtReal) {
    if (this.hitStop > 0) { this.hitStop -= dtReal; this._visualOnly(dtReal * 0.05); return; }
    this.slowHold = Math.max(0, (this.slowHold ?? 0) - dtReal);
    this.timeScale = damp(this.timeScale, this.slowHold > 0 ? this.slowTarget : 1, 10, dtReal);
    const dt = dtReal * this.timeScale;
    this.time += dt; this.phaseT += dt;
    const T = this.terrain;
    if (this.phase === 'showcase') { this._updateActors(dt); this._showcaseCam(false); this._common(dt); return; }

    const a = this.active;
    if (this.phase === 'intro') {
      this._updateActors(dt);
      if (this.phaseT > (this.cfg.fastIntro ? 0.5 : 1.0)) { this.phase = 'act'; this.phaseT = 0; events.emit('turn:act', a); }
    } else if (this.phase === 'act') {
      this.timer -= dt;
      const it = this.intent; it.move = 0; it.aimDelta = 0; it.aimTo = null; it.facing = 0; it.arrow = null; it.skip = false;
      a.controller?.update?.(dt, a, this, it);
      if (it.arrow && a.ammo[it.arrow] > 0) { if (a.arrowId !== it.arrow) { a.arrowId = it.arrow; events.emit('arrow:select', a, it.arrow); audio.play('select'); } }
      if (it.facing) a.facing = it.facing;
      if (it.aimTo !== null) a.angle = clamp(it.aimTo, -5, 90);
      if (it.aimDelta) a.angle = clamp(a.angle + it.aimDelta, -5, 90);
      // walking (not while charging)
      a.walking = 0;
      if (it.move && !a.charging && a.grounded) {
        const d = a.walk(it.move, dt, T);
        if (d > 0) { this.movedThisTurn += d; a.walking = it.move; a.stepT += dt; if (a.stepT > 0.28) { a.stepT = 0; audio.play('step'); this.fx.burst('step_dust', a.x, a.y, { terrainColor: this.terrainColorAt(a.x, a.y) }); } }
      }
      // charging
      if (it.charge && !a.charging && a.grounded) { a.charging = true; a.power = 0; audio.play('draw_start'); }
      if (a.charging) {
        a.power = Math.min(100, a.power + dt * 100 / a.stats.drawTime);
        if (!it.charge || a.power >= 100 || this.timer <= 0) this._fire(a);
      } else if (this.timer <= 0 || it.skip) { a.charging = false; this._endTurn(true); }
      this._updateActors(dt);
      this._actCam(a);
    } else if (this.phase === 'flight') {
      this._updateActors(dt);
      this.projectiles.update(dt, this);
      this._flightCam(dt);
      if (this.projectiles.active === 0) { this._endTurn(false); }
    } else if (this.phase === 'settle') {
      this._updateActors(dt);
      this.projectiles.update(dt, this);
      this.settleT += dt;
      let faller = null;
      for (let i = 0; i < this.actors.length; i++) { const x = this.actors[i]; if (x.alive && !x.grounded) { faller = x; break; } }
      const moving = !!faller || this.projectiles.active > 0;
      if (faller) { setInset(false); this._frameActor(faller, 13, 0.6, 3.5); }
      else if (this.settleT < 0.6) {
        // frame where the shot ended: the last explosion, or (sea / lava / off-map) where the arrow was last seen
        const I = this.lastImpact, F = this.lastFlight, L = I && (!F || I.t >= F.t - 0.05) ? I : F;
        if (L) { setInset(false); lookAt(L.x, cyFor(Math.max(L.y, this.killY + 1), 0.56, 13), 13, 3.5); }
      }
      if (!moving && this.settleT > 0.85) {
        if (!this._checkWin()) this._beginTurn(this._nextActor());
      }
    } else if (this.phase === 'end') {
      this._updateActors(dt);
      this.projectiles.update(dt, this);
      if (this.phaseT > 2.6 && !this.endFired) { this.endFired = true; this.hooks.onEnd?.(this.summary()); }
    }
    this._common(dt);
  }
  _visualOnly(dt) { for (const a of this.actors) a.character.update(dt); }
  _common(dt) {
    this.fx.update(dt, this.terrain);
    this.terrainMesh.update();
    this.props.update(dt, this.terrain, this.killY, this.time);
    this.backdrop?.update(dt, this.time, cam, this.wind.x / TURN.windMax);
    this._updatePreview();
    for (const a of this.actors) a.hpShown = damp(a.hpShown, a.hp, 4, dt);
  }
  _updateActors(dt) {
    const T = this.terrain;
    for (const a of this.actors) {
      const ch = a.character;
      if (this.phase === 'showcase') { ch.setAnim('pose'); a.update(dt, T, this.killY, this.fx, this); continue; }
      if (a.alive && !this.over) {
        const isActive = a === this.active && this.phase === 'act';
        if (!a.grounded && a.airT > 0.12) ch.setAnim('fall');
        else if (a.walking) { ch.setAnim('walk'); ch.setWalkSpeed(1); }
        else if (isActive) ch.setAnim('aim');
        else if (a.releaseT < 0.5) ch.setAnim('release');
        else ch.setAnim('idle');
        if (!isActive && a.grounded && a.releaseT > 0.6) { const f = this.nearestFoe(a); if (f && this.phase !== 'flight') a.facing = f.x > a.x ? 1 : -1; }
        ch.setAim(a.aimWorld(T), isActive ? (a.charging ? 0.15 + 0.85 * a.power / 100 : 0.12) : 0);
        const wantArrow = isActive && !a.walking;
        if (wantArrow) { const m = this._nockModel(a); ch.setNockedArrow(m); } else ch.setNockedArrow(null);
      }
      a.update(dt, T, this.killY, this.fx, this);
    }
  }
  _nockModel(a) {
    a._nock = a._nock ?? {};
    return a._nock[a.arrowId] ?? (a._nock[a.arrowId] = getArrow(a.arrowId).createModel());
  }
  _fire(a) {
    a.charging = false;
    const T = this.terrain, ang = a.aimWorld(T);
    a.muzzleAt(ang, _pt);
    // never spawn inside terrain: walk the spawn point back toward the body if needed
    let mx = _pt.x, my = _pt.y;
    if (T.solid(mx, my)) { mx = a.x; my = a.y + 1.3; }
    const id = a.arrowId;
    if (a.ammo[id] !== Infinity) a.ammo[id] = Math.max(0, a.ammo[id] - 1);
    this.shotArrow = id;
    a.lastPower = a.power; a.lastAngle = a.angle; a.stat.shots++; a.releaseT = 0;
    a.character.setAnim('release');
    this.projectiles.launch(a, id, mx, my, ang, a.power);
    const def = getArrow(id);
    if (def.sfx?.launch) audio.play(def.sfx.launch, { power: a.power });
    this.fx.burst('muzzle', mx, my, { dirX: Math.cos(ang), dirY: Math.sin(ang) });
    addShake(0.08);
    this.firedThisTurn = true; this.phase = 'flight'; this.phaseT = 0;
    if (!(a.ammo[a.arrowId] > 0)) a.arrowId = 'standard';
    events.emit('shot', a, id, a.power, ang);
  }

  // ------------------------------------------------------------------ camera direction
  // All framing goes through the HUD-safe region (camera.js SAFE): the top cluster and the control strip never cover
  // an actor's feet. Aiming is a close shot of the shooter (upper two-thirds, offset away from the target so the arc
  // has room); if the target doesn't fit at that zoom it is shown in a picture-in-picture inset instead.
  _height(a) { return a.character.height || 2.6; }
  _frameActor(a, H, feetFrac, rate) { lookAt(a.x, cyFor(a.y, feetFrac, H), H, rate); }
  /** Is a world box currently on screen (inside the safe region) with the camera's *current* state? */
  _onScreen(x0, y0, x1, y1) {
    const H = cam.th, W = H * R.camera.aspect, cx = cam.tx + cam.panX, cy = cam.ty + cam.panY;
    return x0 > cx - W * 0.47 && x1 < cx + W * 0.47 && y0 > cy - H * 0.29 && y1 < cy + H * 0.34;
  }
  _insetOn(foe) {
    const h = this._height(foe);
    if (this._onScreen(foe.x - 1, foe.y, foe.x + 1, foe.y + h)) { setInset(false); return; }
    setInset(true, foe.x, foe.y + h * 0.62, 6.4); R.inset.side = foe.x > cam.x ? 1 : -1; R.inset.actor = foe;
  }
  _actCam(a) {
    const AIM_H = 9.4, PAIR_MAX = 14.5, f = a.facing, foe = this.nearestFoe(a), h = this._height(a);
    if (foe) {
      const fh = this._height(foe);
      const x0 = Math.min(a.x - 1.6, foe.x - 1.6), x1 = Math.max(a.x + 1.6, foe.x + 1.6);
      const y0 = Math.min(a.y, foe.y) - 0.3, y1 = Math.max(a.y + h, foe.y + fh) + 1.3;
      if (boxHeight(x0, y0, x1, y1) <= PAIR_MAX) { frameBox(x0, y0, x1, y1, 3.6, AIM_H, PAIR_MAX); setInset(false); return; }
    }
    const W = AIM_H * R.camera.aspect;
    lookAt(a.x + f * W * 0.13, cyFor(a.y, 0.66, AIM_H), AIM_H, 3.6);
    if (foe) this._insetOn(foe); else setInset(false);
  }
  _flightCam(dt) {
    const p = this.projectiles.leader(); if (!p) return;
    const LF = this.lastFlight ?? (this.lastFlight = { x: 0, y: 0, t: 0 }); LF.x = p.x; LF.y = p.y; LF.t = this.time;
    const RATE = 4.5, FLY_MIN = 15, FLY_MAX = 23;
    // lead by v/rate so the exponential follow keeps the arrow centred instead of trailing it
    const lx = p.x + clamp(p.vx / RATE, -11, 11), ly = p.y + clamp(p.vy / RATE, -8, 8);
    const foe = this._flightTarget(p);
    if (foe) {
      const h = this._height(foe);
      let x0 = Math.min(lx - 3, foe.x - 1.6), x1 = Math.max(lx + 3, foe.x + 1.6);
      let y0 = Math.min(ly - 2, foe.y - 0.3), y1 = Math.max(ly + 2, foe.y + h + 1);
      const o = p.owner;   // right after the release keep the shooter in shot too, if it fits
      if (o && p.age < 0.5 && boxHeight(Math.min(x0, o.x - 1.6), Math.min(y0, o.y - 0.3), Math.max(x1, o.x + 1.6), Math.max(y1, o.y + h + 1)) <= FLY_MAX) {
        x0 = Math.min(x0, o.x - 1.6); x1 = Math.max(x1, o.x + 1.6); y0 = Math.min(y0, o.y - 0.3); y1 = Math.max(y1, o.y + h + 1);
      }
      if (boxHeight(x0, y0, x1, y1) <= FLY_MAX) { frameBox(x0, y0, x1, y1, RATE, FLY_MIN, FLY_MAX); setInset(false); }
      else { this._frameArrow(p, lx, ly, RATE, FLY_MIN + 1); this._insetOn(foe); }
    } else { this._frameArrow(p, lx, ly, RATE, FLY_MIN + 1); setInset(false); }
    // slow-mo when about to land near someone
    _sim.x = p.x; _sim.y = p.y; _sim.vx = p.vx; _sim.vy = p.vy;
    let near = false, landing = false;
    for (let k = 0; k < 24 && !near; k++) {
      stepBody(_sim, 1 / 60, this.wind, p.phys, p.windResist);
      if (this.terrain.solid(_sim.x, _sim.y) || _sim.y < this.killY) {
        landing = k < 9;
        for (const a of this.actors) if (a.alive && a !== p.owner && Math.hypot(a.x - _sim.x, a.y + 1 - _sim.y) < 4.5) near = true;
        break;
      }
      for (const a of this.actors) if (a.alive && a !== p.owner && Math.hypot(a.hitShapes.hx - _sim.x, a.hitShapes.hy - _sim.y) < 1.4) near = true;
    }
    if (near && p.age > 0.3) { this.slowTarget = 0.28; this.slowHold = 0.14; }
    else if (landing && p.age > 0.5 && this.slowHold <= 0) { this.slowTarget = 0.55; this.slowHold = 0.08; }   // brief beat before any impact
  }
  /** Follow the arrow alone (keeping its shooter in the shot for the first moments when it fits). */
  _frameArrow(p, lx, ly, rate, H) {
    let x0 = lx - 3, x1 = lx + 3, y0 = ly - 2, y1 = ly + 2;
    const o = p.owner;
    if (o && p.age < 0.6) {
      const a0 = Math.min(x0, o.x - 1.6), a1 = Math.max(x1, o.x + 1.6), b0 = Math.min(y0, o.y - 0.3), b1 = Math.max(y1, o.y + this._height(o) + 1);
      if (boxHeight(a0, b0, a1, b1) <= H + 3) { x0 = a0; x1 = a1; y0 = b0; y1 = b1; }
    }
    frameBox(x0, y0, x1, y1, rate, H, H + 3);
  }
  /** The foe the camera should keep an eye on during a flight: the one closest to where the arrow is heading. */
  _flightTarget(p) {
    let best = null, bd = 1e9; const ax = p.x + p.vx * 0.6;
    for (const a of this.actors) if (a.alive && (!p.owner || a.team !== p.owner.team)) { const d = Math.abs(a.x - ax); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  _showcaseCam(snapNow) {
    setInset(false);
    const a = this.actors[0]; if (!a) return;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const H = this.cfg.showcaseZoom ?? 6.2, feet = this.cfg.showcaseFeet;
    lookAt(a.x - (this.cfg.showcaseOffset ?? 2.4) * Math.min(1.6, aspect / 1.4), feet ? cyFor(a.y, feet, H) : a.y + 1.3, H, 2);
    if (snapNow) snap();
  }

  _updatePreview() {
    const a = this.active, P = this.preview;
    if (this.phase !== 'act' || !a || !a.human || a.walking) { P.count = 0; return; }
    const T = this.terrain, ang = a.aimWorld(T);
    const pw = a.charging ? Math.max(a.power, 8) : (a.lastPower > 0 ? a.lastPower : 55);
    a.muzzleAt(ang, _pt);
    _sim.x = _pt.x; _sim.y = _pt.y; const sp = launchSpeed(pw); _sim.vx = Math.cos(ang) * sp; _sim.vy = Math.sin(ang) * sp;
    const ph = getArrow(a.arrowId).physics, len = a.stats.previewLen; let dist = 0, next = 0.5, n = 0;
    const noWind = { x: 0, y: 0 };
    for (let k = 0; k < 400 && n < 24 && dist < len; k++) {
      const ox = _sim.x, oy = _sim.y; stepBody(_sim, 1 / 240, noWind, ph); dist += Math.hypot(_sim.x - ox, _sim.y - oy);
      if (T.solid(_sim.x, _sim.y)) break;
      if (dist >= next) {
        next += 0.42; const s = 1 - dist / len * 0.55;
        this._pv.set(_sim.x, _sim.y, 0); this._ps.set(s, s, s); this._pm.compose(this._pv, this._pq, this._ps); P.setMatrixAt(n++, this._pm);
      }
    }
    P.count = n; P.instanceMatrix.needsUpdate = true;
  }

  summary() {
    const human = this.actors.find((a) => a.human);
    const youTeam = human ? human.team : 0;
    return {
      mode: this.cfg.mode, mapId: this.map.id, seed: this.seed, turns: this.turnNo, duration: this.time,
      winnerTeam: this.winnerTeam, won: this.winnerTeam === youTeam, youTeam,
      actors: this.actors.map((a) => ({ name: a.name, charId: a.charDef.id, outfitId: a.outfitDef?.id, team: a.team, human: a.human, hp: a.hp, maxHp: a.stats.maxHp, alive: a.alive, ...a.stat })),
    };
  }
  dispose() {
    setInset(false);
    this.projectiles.clear(); if (!this.cfg.thumb) this.fx.clear(); this.props.dispose();
    for (const a of this.actors) { this.root.remove(a.character.root); a.character.dispose(); }
    for (const m of this.terrainMesh.meshes) m.geometry.dispose();
    this.root.traverse((o) => { if (o.isMesh || o.isPoints) { o.geometry?.dispose(); } });
    this.hooks.scene.remove(this.root);
  }
}
