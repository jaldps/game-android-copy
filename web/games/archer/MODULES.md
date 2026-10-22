# Bowbrawl — module contracts (binding for specialists)

Bowbrawl is a Gunbound-style, turn-based artillery game with archers, rendered in stylized 3D (three.js r186).
The **core** owns the engine: turn loop, terrain field + mesher, physics, camera, input, HUD, FX/audio engines.
Four specialists extend the game **only through registries** in their own folders. Adding a character,
outfit, arrow, map, VFX preset, sound, screen or mode must never require editing a core file. If you believe
you need a core change, write it up in your report instead of making it.

Coordinate system: x = horizontal (left/right), y = up, z = depth (toward the camera is +z). All combatants and
projectiles live on the plane **z = 0**. Terrain is extruded from z = -2.6 (back) to z = +2.6 (front cap).
World field bounds: x ∈ [-60, 60], y ∈ [-14, 32] (`core/config.js` FIELD). 1 world unit ≈ 1/2.6 of a hero's height.

---

## 1. File ownership

| Role | Owns (create/edit freely) | Must not edit |
|---|---|---|
| **Core** (lead) | `main.js`, `index.html`, `style.css`, `core/**`, `MODULES.md` | — |
| **1. Characters & outfits** | `characters/**`, `dev/chars.html` | everything else |
| **2. Maps & terrain art** | `maps/**` | everything else |
| **3. Arrows, VFX & audio** | `arrows/**`, `vfx/**`, `audio/**` | everything else |
| **4. Meta** (shop, progression, modes, AI, menus/results) | `meta/**` (incl. `meta/meta.css`) | everything else |

Shared read-only helpers anyone may import: `core/util.js` (math, seeded RNG, noise), `core/config.js` (constants),
`core/terrain.js` (`MAT` ids, `Terrain` queries), `core/events.js`, `core/store.js`. `meta.json`, `thumb.jpg`,
`CREDITS.md`: append-only for everyone (add your asset credits; never remove others').

Each specialist works in its own git worktree. Since folders are disjoint, merges are conflict-free **as long as you
stay inside your folder**. Cross-module imports are allowed only through each module's `index.js`.

---

## 2. Global rules

1. **No per-frame allocations** in anything called every frame (`update`, hooks, shaders' JS side): no `new`,
   no array/object literals, no closures, no `.map/.filter` in hot paths. Allocate at build time and reuse.
   Hooks that run on discrete events (impact, spawn, purchase) may allocate.
2. **Draw-call budget**: whole frame < 150. A character is 1 skinned mesh + bow (≈ 6 meshes). Props are instanced
   per type. Prefer merged geometry with vertex colours over many meshes. Max one extra material per new prop type.
3. **Determinism**: anything that affects gameplay uses the seeded `rng` you are given (never `Math.random()`).
   Pure visuals may use `Math.random()`.
4. **Zero console errors and zero repeated warnings.** Check `shots/archer/*-console.txt` after every screenshot run.
5. **Materials**: colours are sRGB hex numbers (`0xRRGGBB`); three converts them. Use `MeshStandardMaterial`
   (or its `onBeforeCompile` patches) so ACES tone mapping, shadows and fog stay consistent. Set
   `customProgramCacheKey` when you patch shaders.
6. **Art direction**: bright, saturated, chunky, soft-shadowed toon 3D (see `screenshots/hole/final_play-6000.png`).
   No flat untextured surfaces, no placeholder grey. Characters are clearly adult; female heroes are glamorous
   stylized hourglass pin-up figures, never explicit (12+/Teen store level; no sexualized poses or camera framing).
7. **Persistence** only via `core/store.js` (`archer.` prefix). Only Meta writes the profile.
8. **Testing** (from repo root): `tools/shot.sh "games/archer/index.html?autoplay=1&warp=20&seed=3" shots/archer/<you>/x --landscape --times 3000`
   then LOOK at the PNG and read the console file. Hooks: `?autoplay=1 ?scene=menu|play|over|shop ?seed=N ?warp=N
   ?fixedstep=1 ?map=<id> ?char=<id> ?outfit=<id> ?quality=low|high ?hud=0`. `window.__game` exposes state.
   Characters can be previewed in isolation: `dev/chars.html?anim=idle|pose|walk|aim|victory|defeat|dead|fall&angle=40&draw=1`.

---

## 3. Characters & outfits (`characters/`)

Core imports only from `characters/index.js`:

```js
CHARACTERS: CharacterDef[]          // order = menu/shop order
getCharacter(id) -> CharacterDef    // falls back to the first
OUTFITS: { [id]: OutfitDef }
getOutfit(id), outfitsFor(charId), defaultOutfit(charId)
PERK_TYPES: { [type]: { icon: svgString, label, color } }
computeStats(charDef, outfitDef) -> Stats          // the ONLY stats the core reads
createCharacter(charDef, outfitDef|null) -> Character
```

### CharacterDef
```js
{ id, name, title, gender: 'm'|'f', price /*coins, 0 = starter*/, blurb,
  stats: { hp: 100, move: 1.0, windResist: 0..0.3, drawSpeed: 1.0 },   // small differences, never pay-to-win
  palette: { skin, hair, hair2, eyes, lips?, brow, ... },               // any extra keys are free for your builders
  outfits: [outfitId, ...],
  bow: { wood, trim, grip, gem?, length?, string? },                    // buildBow() options
  scale?: 1.2,                                                          // world scale of the rig
  body: { legLen, hipW, thighLen, shinLen, thighR:[top,bot], shinR, calf?, footL, footW, footH,
          waistY, shoulderY, shoulderW, neckY, neckLen, neckR, upperArm, foreArm, upperArmR, foreArmR, deltR?, bicep?, handR,
          headR, bodyR /*hit capsule radius*/, torso: [[y, rx, rz, zOffset], ...] /*loft rings bottom->top*/,
          extras?: [[bone|'torso', [x,y,z], [rx,ry,rz], colourKey], ...] },
  face: { eyeSize, eyeTall, eyeSpread, eyeY, lashes?, browThick, browY, browTilt, chin?, jawX, jawY, jawZ, mouthW?, smirk?, lips? },
  build(ctx) { /* hair, faces, character-specific extras */ } }
```

### OutfitDef (outfits.js)
```js
{ id, char, name, type: 'armor'|'robes'|'swimwear'|'leathers'|<new PERK_TYPES key>, price,
  perkText: 'one line shown in the shop with the perk icon',
  mods: { hp?, move?, knockback?, windResist?, preview?, delay?, headshot?, direct?, drawSpeed? },  // see perks.js
  colors: { top, bottom, boots, ... },     // merged over the character palette for this outfit
  bow?: { ...buildBow options },
  build(ctx) { /* clothing shells, armour plates, accessories */ } }
```
Perk archetypes from the brief: **armor** = +HP, −knockback, −move · **robes** = +wind resistance, longer aim guide ·
**swimwear** = +move, faster turn-delay recovery · **leathers** = +headshot/direct-hit damage. Perks must be visible
(icon + one line, rendered by Meta from `PERK_TYPES[type].icon` + `perkText`) and actually applied (via `mods`).

### Stats (returned by `computeStats`, consumed by the core)
`{ maxHp, moveGauge, windResist (0..0.8), drawTime (s for 0→100 power), knockbackMult, previewLen (world units of
aim guide), delayMult (turn delay), headshotMult, directMult }`.

### Builder context (`ctx`, from body.js `makeCtx`)
Everything is built in **rig space** = bind pose: standing at origin, facing +Z, character's LEFT on +X, arms down.
- `ctx.add(bone, geometry, colour | (x,y,z)=>colour, { rough, metal, emissive, bind })` — add a part bound to a bone.
  `bind: (x,y,z)=>[boneA, boneB, weightB]` for soft skinning (e.g. `ctx.torsoBind`).
- `ctx.addLocal(bone, geo, colour, opts)` — geometry relative to the bone joint.
- `ctx.torsoShell(y0, y1, colour, inflate, opts)` — clothing band around the torso (auto-skinned hips→spine→chest→neck).
- `ctx.limbShell(seg /*upperArm|foreArm|thigh|shin*/, from, to, colour, inflate, { side, flare, ... })`.
- `ctx.pair(boneBase, geoBuiltForLeft, colour)` — mirrored pair. `ctx.headPos()` → head centre `[x,y,z]`.
- `ctx.B` body proportions, `ctx.J` joint positions, `ctx.C` merged palette.
- Geometry helpers in `parts.js`: `limb, lathe, ball, box, cyl, cone, torus, tube, blade, xf, mirrorX`; `loft` in body.js.
- Bones: `root hips spine chest neck head upperArmL/R foreArmL/R handL/R thighL/R shinL/R footL/R`.
  Long hair should bind to `chest`, not `head`, so it follows the torso when the head turns to aim.

### Character runtime API (rig.js `Character`) — what the core calls
```js
ch.root                     // Object3D; core sets root.position (feet) each frame
ch.S, ch.height             // world scale, world height
ch.update(dt)               // animate (core calls once per sim step)
ch.setFacing(±1)            // +1 = facing +x; implemented as a mirror
ch.setAnim(name)            // 'idle'|'pose'|'walk'|'aim'|'release'|'hit'|'fall'|'victory'|'defeat'|'dead'
ch.setAim(worldAngleRad, draw0to1)
ch.setWalkSpeed(k)
ch.hit(strength)            // hit reaction + flash
ch.setNockedArrow(object3D|null)    // model from the arrows registry; tip at origin, shaft along -X
ch.hitShapes                // { hx,hy,hr (head circle), ax,ay,bx,by,br (body capsule) } in WORLD, updated in update()
ch.getMuzzle(out)           // visual bow position (the core uses Actor.muzzleAt for the real launch point)
ch.dispose()
```
New animations: add a branch in `Character._pose()`; new anim names must also be added to `ANIMS`.
**Example — new character:** create `characters/roster/kaito.js` exporting a CharacterDef, add two OutfitDefs with
`char: 'kaito'` to `outfits.js`, then `import kaito from './roster/kaito.js'` and append it to `CHARACTERS` in
`index.js`. Shop, menu cycling, AI opponents and `?char=kaito` pick it up automatically.

---

## 4. Maps & terrain art (`maps/`)

Core imports only from `maps/index.js`: `MAPS`, `getMap(id)`, `terrainMaterialFor(def)`, `PROP_TYPES`, `createPropMaterial(emissive)`.

### MapDef
```js
{ id, name, subtitle, music: 'battle' /* audio/music.js track id */,
  killY: -9.5,                     // falling below = death (into the sea / void)
  waterY?: -9,                     // visual sea level (backdrop)
  bounds: { minX, maxX, minY, maxY },   // camera limits + minimap extent
  palette: { grass, grass2, dirt, rock, rock2, deep, brick, brick2, mortar, wood, wood2, ice, sand, metal, snow: 0|1, bump },
  lighting: { sun, sunIntensity, sunDir:[x,y,z], hemiSky, hemiGround, hemiIntensity, fill, fillIntensity,
              fog, fogNear, fogFar, exposure, saturation, contrast, warmth:[r,g,b], envIntensity },
  generate(T, rng) -> { spawns: [{ x }, { x }, ...], ...anything you need later },
  decorate?(ctx),                  // place props; ctx = { terrain, rng, props, gen /*generate()'s return*/, MAT }
  buildBackdrop?(ctx) -> { group: Object3D, update(dt, time, cam /*{x,y,h}*/, wind /*-1..1*/) },
  createTerrainMaterial?(palette) -> Material,  // optional override of maps/terrainMaterial.js
}
```
**Spawn rules (brief):** combatants spawn far apart (≥ 30 units), on separate islands/platforms at **different
heights** (|Δy| ≥ 2.5) with gaps/obstacles between; never face to face on the same flat ground; seeded variation.
`spawns[i]` is used for player slot i (0 = left team). The core drops each actor onto the highest surface at `x`,
so never put a spawn x under a tower roof or overhang.

### Terrain field API (`core/terrain.js`, used inside `generate`)
`T.union(sdf, x0,y0,x1,y1, MAT.X)`, `T.subtract(sdf, ...)`, `T.paint(sdf, ..., MAT.X)` where `sdf(x,y)` ≈ signed distance
(negative inside). Helpers in `maps/shapes.js`: `floatingIsland, groundMass, rect, circle, ellipse, polygon, tower, wall`
and `stamp(T, shape, mat, 'union'|'subtract'|'paint')`. Queries: `T.solid(x,y)`, `T.density(x,y)`, `T.topAt(x)`,
`T.groundBelow(x, y, maxDrop)`, `T.normal(x,y,out)`, `T.raycast(...)`, `T.matAt(x,y)`.
Material ids `MAT`: `ROCK 0, BRICK 1, WOOD 2, ICE 3, METAL 4, SAND 5` (the shader decides how each looks; grass/snow
drape only grows on ROCK/SAND/ICE tops). Explosions carve every material.

### Terrain mesh → shader contract
`core/terrainMesh.js` emits world-space geometry with `position`, `normal` and `aInfo = (kind, depthOrV, materialId)`:
kind 0 = front cap (depth below the surface, clamped to 3), 1 = extruded wall (top/side/underside by normal),
2 = grass/snow drape (v 0 top → 1 tip). Write any look you like in `maps/terrainMaterial.js` as long as you consume
those attributes. Keep it one material (one draw call per chunk).

### Props
`PROP_TYPES[id] = () => ({ geo /*BufferGeometry with color + aSway attributes, origin at the base*/, emissive?, shadow? })`.
Build with `build([[geometry, colour | fn, sway | fn(y)], ...])` from `maps/props.js`. Place in `decorate` with
`ctx.props.add(typeId, x, y, { z, scale, rotY })`; keep z ≤ -0.6 for anything taller than ~1 unit (behind the
archers) and small tufts/flowers in front. The core instances each type, sways foliage with the wind and drops/flings
props when their ground is blasted.

### Backdrop kit (`maps/sky.js`, `maps/weather.js`)
`skyDome, cloudField, sea, farIslands, richIslands, mountains, ridge, castle`, `createWeather({ kind: 'snow'|'motes'|'petals'|'embers' })`.

**Example — new map:** `maps/lavaforge.js` exporting a MapDef (generate islands over lava with `floatingIsland`,
props via `decorate`, backdrop via `buildBackdrop` with `createWeather({kind:'embers'})`), then add it to `MAPS` in
`maps/index.js`. Quick match, autoplay rotation and `?map=lavaforge` pick it up; Meta adds it to the campaign.

---

## 5. Arrows, VFX & audio (`arrows/`, `vfx/`, `audio/`)

Core imports `ARROWS`, `getArrow(id)`, `trayArrows()` from `arrows/index.js`; `VFX` from `vfx/presets.js`;
`SFX` from `audio/sfx.js`; `createMusic` from `audio/music.js`.

### ArrowDef
```js
{ id, name, desc, icon /*inline svg*/, color /*css accent*/, price, uses /*per match, Infinity*/, delay /*extra turn delay*/,
  hidden? /*not in the tray (spawned children)*/,
  ai?: { weight, minTargetHp },                     // AI selection hints (Meta's AI reads these)
  physics: { mass, drag, windFactor, gravityScale },    // heavier = less wind drift; the AI simulates the same values
  damage:  { base, radius, crater, knockback },          // used by the default impact
  trail:   { color, width, length (≤32), additive, alpha, puff?: Emitter, puffEvery? },
  sfx: { launch, impact, body }, vfx: { impact, body }, // ids in SFX / VFX
  stick?: true,                                          // leave the model stuck in terrain
  createModel() -> Object3D,                             // tip at origin, shaft along -X; use models.js instance() caching
  onLaunch?(p, api), onUpdate?(p, dt, api) -> false to skip default integration this substep,
  onImpact?(p, hit, api) -> 'remove' | 'keep' }          // default: api.explode(...) with def.damage, then remove
```
`p` (projectile): `{ def, x, y, vx, vy, px, py, age, alive, owner, data /*scratch object, cleared on spawn*/, bounces,
damageScale, phys, windResist, mesh }`. Set `p.alive = false` to end it. Hooks run at the 1/240 s substep.
`hit`: `{ kind: 'terrain'|'actor'|'void', x, y, nx, ny (surface normal), actor, part: 'head'|'body'|null }`.

### `api` (given to every hook)
```js
api.explode(x, y, { base, radius, crater, knockback, owner, direct /*actor*/, part, vfx, sfx, arrow })
api.spawn(id, x, y, vx, vy, { owner?, parent?, data?, damageScale? })   // children (splitters, clusters...)
api.carve(x, y, r)            api.fx(presetId, x, y, opts)      api.emitParticles(emitter, x, y, opts)
api.sfx(id, opts)             api.shake(amount)                 api.slowmo(scale, seconds)
api.callout(text, kind)       api.emit(eventName, a, b)
api.terrain  api.wind {x,y,strength,angle}  api.actors  api.rng  api.match
```
Damage model (core): falloff `(1 - d/radius)^1.15` from the capsule surface; direct hit ×1.25 × owner.directMult;
head ×1.6 × owner.headshotMult; knockback scaled by the victim's knockbackMult. Headshot/direct trigger freeze-frame
callouts automatically.

### VFX preset schema (`vfx/presets.js`, pure data)
`{ emitters?: Emitter[], debris?: { count, speed, size, life, color|'terrain', dir, spread }, ring?: { radius, color, life },
flash?: { color, intensity, radius, life }, shake? }`. Emitter fields: `count, shape ('glow'|'puff'|'streak'|'star'|'ring'),
blend ('add'|'alpha'), life, speed, dir (rad | 'input' | null = radial), spread, offset, size, grow, color (hex|'terrain'),
color2 (hex|'terrain'|'dark'), colorJitter, alpha:[a0,a1], gravity, drag, lift, spin, z, inherit, tintable, scaleCount`.
Ids the core plays: `impact_dirt impact_body headshot explosion splash land_dust step_dust muzzle`. Pool: 900 particles,
140 debris — keep presets modest.

### Audio
`SFX[id] = (k /*{ ac, out, t, noise }*/, opts) => void` — synthesize with WebAudio nodes into `k.out`.
Ids the core/meta play: `ui_click ui_back select error turn_start timer_tick step land draw_start release whoosh
impact_dirt impact_body headshot explosion split splash death victory defeat coin buy`. `createMusic(k, trackId)` →
`{ stop() }`; tracks used: `menu`, `battle` (+ any id a MapDef names in `music`). The engine (`core/audio.js`) handles
unlock-on-first-touch, mute persistence, pause/resume and per-id rate limiting.

**Example — new arrow:** add to `ARROWS` in `arrows/index.js`:
`{ id: 'bouncer', name: 'Bouncer', uses: 2, physics: {...}, damage: {...}, createModel: () => instance('bouncer', ...),
onImpact(p, hit, api) { if (hit.kind === 'terrain' && p.bounces++ < 2) { const d = p.vx*hit.nx + p.vy*hit.ny;
p.vx = (p.vx - 2*d*hit.nx)*0.7; p.vy = (p.vy - 2*d*hit.ny)*0.7; p.x = hit.x + hit.nx*0.2; p.y = hit.y + hit.ny*0.2;
api.sfx('impact_dirt'); return 'keep'; } api.explode(hit.x, hit.y, { ...this.damage, owner: p.owner, direct: hit.actor,
part: hit.part, vfx: 'explosion', sfx: 'explosion' }); return 'remove'; } }`. The tray, shop and AI pick it up.

---

## 6. Meta (`meta/`)

The core calls only `createMeta(app)` from `meta/index.js` and uses the returned object:
```js
meta.showMenu() / showShop() / showResults(summary, reward) / showPause() / hidePause() / isPauseOpen()
meta.onMatchEnd(summary)          // rewards, campaign progress, results screen
meta.back() -> bool               // Android back: true if consumed (false on the main menu exits to the hub)
meta.setMode(m), meta.mode        // 'menu'|'play'|'shop'|'settings'|'results'
meta.createController(playerCfg, slot) -> Controller      // for controller === 'ai'
meta.autoplayConfig(seed, over), meta.quickConfig(seed, over) -> MatchConfig
```
`app` (provided by main.js): `startMatch(cfg)`, `endMatch()`, `showcase(charId, outfitId)` (live 3D hero on the menu
backdrop), `restyle(charId, outfitId)`, `hud(visible)`, `setPaused(bool)`, `goHome()`, `quality()`, `toggleQuality()`,
`audio`, `rng`, `seed()`, `newSeed()`.

### MatchConfig
```js
{ mode: 'quick'|'campaign'|'hotseat'|'autoplay'|..., mapId, seed, stage?, hotseat?, fastIntro?,
  players: [{ charId, outfitId, controller: 'human'|'ai', difficulty?: 'easy'|'normal'|'hard'|'expert', name, team, ammo?: {arrowId: n} }] }
```
### Summary (passed to `onMatchEnd`)
`{ mode, mapId, seed, turns, duration, winnerTeam, won, youTeam, actors: [{ name, charId, outfitId, team, human, hp,
maxHp, alive, damage, shots, hits, headshots, kills, taken }] }`.

### Controller interface (AI and human)
`{ kind, beginTurn(actor, match), update(dt, actor, match, intent) }` — fill `intent` each act-phase frame:
`intent.move (-1|0|1)`, `aimDelta (deg)`, `aimTo (deg relative to slope | null)`, `facing (±1|0)`, `charge (bool: held;
releasing fires)`, `arrow (id|null)`, `skip (bool)`. AI planning helpers: `match.simulate(actor, angleRelDeg, power,
arrowId, target?, facing?)` (exact live integrator incl. wind, terrain and bodies; returns a SHARED result object —
copy what you need), `match.nearestFoe(a)`, `match.terrain`, `match.wind`, `match.actors`, `actor.moveLeft`, `actor.ammo`.

Prices live on registry entries (`def.price`); the shop lists every registry entry automatically. The profile is
`archer.profile` (progression.js) — migrate, never wipe, when you change its shape.

---

## 7. Events emitted by the core (`core/events.js`)

| Event | Args |
|---|---|
| `match:start` | match |
| `turn:start` | actor, turnNo |
| `turn:act` | actor (intro finished, input open) |
| `turn:end` | actor, skipped |
| `wind` | wind `{x, y, strength, angle}` |
| `arrow:select` | actor, arrowId |
| `shot` | actor, arrowId, power, worldAngle |
| `projectile:spawn` | p |
| `impact` | x, y, explodeOpts, totalDamage |
| `terrain:carve` | x, y, r |
| `actor:damage` | actor, amount, fromActor, `{ direct, head, arrow }` |
| `actor:death` | actor, cause (`'hp'`/`'fell'`), fromActor |
| `actor:land` | actor (hard landing) |
| `callout` | text, kind (`headshot`/`direct`/`kill`/`info`) |
| `match:over` | winnerTeam |

Subscribe with `const off = events.on(name, fn)`; call `off()` when your screen/object is torn down.

---

## 8. Turn & physics constants (core/config.js, read-only)

Turn time 20 s · walk 3 u/s · move gauge 9 u (slopes cost +1.6 per unit climbed) · power 0→100 in 1.5 s (÷ drawSpeed) ·
gravity 24 · max launch speed 44 · wind 0–12 per turn (any direction, vertical component halved), acceleration
0.34 × wind / mass × windFactor × (1 − windResist) · Gunbound delay ordering: after a turn `delay += (600 + arrow.delay +
22 × walked + 250 if timed out) × delayMult`; lowest delay acts next.
