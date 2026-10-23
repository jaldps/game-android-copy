# Bowbrawl (archer) — critic round 2

**VERDICT: NOT YET** · Blind A/B vs real Gunbound (mostly new reference frames): ours preferred **5/8 (62.5%)**, bar is 75%.
Up from 4/7 (57%) in round 1. Console clean everywhere. Input verified with real taps: 1° angle taps (47→50→49),
move, arrow tray, hold-to-fire, `?char=` override.

> Status: **fixes NOT yet applied.** This file is the input to fix pass 2.

**The diagnostic pattern: every pairing we lost was a projectile-flight frame.** Aiming frames now win.
Lead confirmed on frost_s2_w60-16000.png: mid-flight the main view is empty mountains, the arrow off the top
(only a chevron), the shooter in the inset, the target an edge marker.

## Blind pairings (judged before keys)
| | Ours | Ref | Winner |
|---|---|---|---|
| p1 | Frostpeak s5, Brock aiming | aR0azizDsFA_hq3 | ours |
| p2 | Sunspire s11, Kaito | GxxGy4I1V7E_hq3 (lobby overlay — weak ref) | ours |
| p3 | Emberforge s7 w60 | 3fMuZ4Vs4gk_hq1 | ours, narrowly |
| p4 | Ruins s9 w70, craters | Q57FG6yhQhI_hq2 | ours |
| p5 | Neon s5, **flight** | GxxGy4I1V7E_hq2 | **REF** — window-grid wallpaper, no archer, white streak |
| p6 | Frostpeak s2 w60, **flight** | 5UGQks5rWjw_hq3 | **REF** — empty mountains, no archer, no terrain |
| p7 | Bjorn on Emberforge | w9-2nJgphfg_hq3 | ours |
| p8 | Sunspire s3, **flight** | GxxGy4I1V7E_hq1 | **REF** — empty sea, flat gradient flag, no archer |

## Scores (1-10, round 1 in brackets)
Art direction 6 (6) · Lighting/materials 5 (5) · Environment detail 6 (5) · Characters/animation 4 (3) ·
UI/HUD 7 (6) · Juice/feel 4 (4) · Gameplay/controls 7 (6) · Audio (code) 5 (5) · Technical 7 (7)

## Round-1 fix check
Landed: 2 Emberforge, 5 ready stance, 6 aim zoom, 7 1° taps, 12 `?char=`, 13 thumbnails + menu hero, 14 results values.
Partly: 1 framing (aim good, **flight bad**), 3 Neon, 4 faces, 8 HUD, 9 portraits generic, 10 trails (Neon still white), 15 audio (code only).
Not verified on screen: 11 impact VFX (presets exist, never captured).

## Ranked fixes
1. **core/** Flight camera: keep shooter or target **plus** the arrow in the main view throughout; lead the target; cap zoom-out so archers stay ≥15% of screen height; never let the projectile pass under the WIND dial or minimap.
2. **core/** Never draw an actor under the bottom HUD strip (~82% of height) or the HOLD button (ruins s5 w45: Kaito's head under HOLD) — reframe or use an edge marker.
3. **vfx/** Impacts unmissable: large flash, shockwave ring, terrain-coloured debris, outlined "-NN", 0.3 s hit-stop — and **prove it with a screenshot**.
4. **characters/** Faces: sculpted noses and brows, eye whites with pupils, readable mouth at 12% of screen height. Kaito's orange mouth blob, Bjorn's pig snout. Brock: defined deltoids and pecs, not spheres.
5. **maps/** Neon: break the uniform window grid (lit and dark floors, varied window sizes), fog depth between layers, readable signs, a distinct rooftop material (metal, AC units, edge lights) so the playable roof doesn't merge with the skyline.
6. **maps/** One hand-made landmark set-piece per map (every winning ref has one). Sunspire's flag is a flat gradient quad (cloth + emblem); waterfalls are flat white strips (animate, add splash and mist).
7. **meta/** Per-hero portraits rendered from the 3D models for turn strip, shop and setup, instead of one recoloured egg face.
8. **maps/ vfx/** Emberforge's floating white balls read as stray geometry (make them glowing embers or remove); Ruins' sand cap drips like snow icicles (crumbling sandstone edges instead).
9. **core/** Power bar: the fill covers its label ("POWER" reads "WER"); keep the last-shot marker clear of the number.
10. **arrows/** Every arrow type its own coloured trail; never a plain white streak (Neon splitter).
11. **core/** Bow and body clip into walls (Vela into the Frostpeak wall): stop movement at obstacles.
12. **meta/** Quick Match builds 5 thumbnails synchronously; its pop-in tween left START off-screen in headless. Pre-render async; buttons tappable before the tween ends.
13. **maps/** Backdrop mountains and mesas are flat-shaded single colours: gradient/AO tint, rim light, far fog layer.

Evidence: /home/user/game-android-copy/shots/archer/critic/r2/ (blind/p1-p8, judgements.txt, per-map shots, input_*).
