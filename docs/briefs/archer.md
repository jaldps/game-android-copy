# id `archer` — "Bowbrawl" · Gunbound-style artillery duels with archers · LANDSCAPE

Screenshots always use `--landscape`. This brief supersedes the earlier Bowmasters-style brief.
`thumb.jpg` must still be 360x480.

## The one-line pitch

**Gunbound, but the tanks are archers** — rendered in the same bright, chunky, soft-shadowed 3D toon
style as Sinkhole City, Mob Rush and Frostline Dash, so it looks like it belongs in the same arcade.

Visual siblings to match (LOOK at them):
- `screenshots/hole/final_play-6000.png` (Sinkhole City)
- The critic's reference set is `refs/archer/gb_*.jpg` — **real Gunbound frames**. Some are
  lobby/menu screens; for blind A/B pick frames showing actual terrain and combat.

## Core loop (what Gunbound does, translated)

1. **Turn-based**, one actor at a time, with a visible turn timer (~20 s) and a turn-order strip.
2. **Move phase**: the active archer may walk left/right across the terrain, limited by a stamina /
   movement gauge per turn. Walking up slopes costs more; you can walk off ledges and fall.
3. **Aim**: angle is adjusted (drag on the character or ± buttons); the angle is shown as an arc
   gauge at the archer, Gunbound-style, relative to the ground slope.
4. **Power**: press-and-hold charges a power bar; release fires. The bar keeps a **marker of your
   previous shot's power**, exactly like Gunbound, so players can iterate.
5. **Wind**: a strength + direction that changes every turn, shown on a prominent compass/flag.
   Wind genuinely bends the trajectory; heavier arrows are less affected.
6. **Projectile flight**: the camera follows the arrow, with brief slow-mo near impact, then pans to
   the next actor. A small minimap / edge indicators show where everyone is.
7. **Impact**: damage scales with distance from impact; direct hits and headshots deal bonus damage
   with a freeze-frame callout. Explosive impacts **carve craters into the terrain**.
8. **Death**: HP to zero, or **falling off the map into the void/water** (terrain destruction can
   make this happen — that's a core Gunbound thrill).

## Arena layout — never face to face

Combatants must **not** stand at the same height on the same flat ground a short distance apart.
Every map spawns them **far apart, on different islands/platforms at different heights**, with
terrain, gaps and obstacles between them, so every shot is a genuine angle/power/wind puzzle and the
camera must travel. Spawn positions vary per match (seeded).

Terrain is **destructible**: a 2D heightfield/mask (or SDF) extruded into chunky 3D with textured
top surfaces, rocky cliff sides, grass/snow caps and props. Explosions remove material and the mesh
updates. Floating islands over a void, sea or lava read well.

At least **5 distinct maps/biomes**, e.g. tropical sky islands, snowy fortress, desert ruins,
lava forge, neon/night city rooftops — each with its own palette, sky, parallax background,
weather/particles and ambient props.

## Characters — the roster

Bold, appealing, **clearly adult** stylized 3D toon heroes with strong silhouettes and personality.
Rigged and animated: idle breathing, walk, aim, draw, release, hit react, fall, victory, defeat.

- **Male**: e.g. a lean masked ninja, a hugely muscular gym-bro archer, plus others (a viking, a
  samurai, a cowboy…).
- **Female**: glamorous, stylized hourglass figures in the classic animated-pin-up tradition
  (Jessica Rabbit proportions: long legs, exaggerated hourglass silhouette, big hair) — e.g. a
  huntress, a sorceress, a desert ranger.
- Keep it mainstream-mobile-store appropriate: stylized and glamorous, **never explicit** — no
  nudity, no sexualized posing or camera framing. Swimwear outfits are fine at the level you'd see
  in a 12+/Teen-rated mobile game.

Characters are **bought in the shop** with coins earned in matches. Each has a base stat flavour
(HP, move gauge, wind resistance, draw speed) — small differences, not pay-to-win.

## Outfits with perks

Every character has several outfits, bought separately, each giving a **small perk**:
- **Armor** — +max HP, less knockback, shorter move gauge.
- **Robes** — wind resistance, a slightly longer trajectory preview.
- **Swimwear / beachwear** — longer move gauge, faster turn delay recovery.
- **Ninja garb / leathers** — more crit/headshot damage.
Perks must be visible in the shop (icon + one line) and actually applied in play.

## Arrow types (Gunbound "shot types" and items)

Selectable per turn from a compact tray; special arrows are limited per match or have cooldowns:
- **Standard** — baseline.
- **Explosive** — big blast, digs a large crater.
- **Splitter** — splits into 3 (or 5) arrows at the apex, fanning out.
- **Bouncer** — bounces off terrain 2–3 times before detonating.
- **Driller** — tunnels through terrain, detonating underground (dig enemies out of cover).
- **Frost / Lightning / Grapple-teleport** etc. — at least two more creative ones.

Each has its own model, trail, impact VFX and sound.

## Modes, progression, economy

- **Campaign ladder** vs AI of rising difficulty across the maps, **Quick match**, and
  **2-player hot-seat** on one device.
- AI solves the ballistic shot with wind, with **difficulty-scaled error**; it also uses movement
  and special arrows sensibly.
- Coins + XP from matches; a **shop** for characters, outfits and arrow unlocks; results screen with
  stars and rewards. Persist everything in `localStorage` under the `archer.` prefix.

## HUD — compact, Gunbound-like

A bottom control strip (angle readout, power bar with last-shot marker, move gauge, arrow tray,
wind compass) and small HP bars above each archer. Total HUD must not cover more than ~18% of the
screen. No overlapping labels, no debug text, no telemetry visible to the player.

## Required hooks (critic depends on them)

`?autoplay=1` (AI vs AI, mid-match, loops forever), `?scene=menu|play|over|shop`, `?seed=N`,
`?warp=N`, `?fixedstep=1`, `?map=<id>`, `?char=<id>`, `window.__game`, `window.__fps`.
Zero console errors **and** zero repeated warnings.
