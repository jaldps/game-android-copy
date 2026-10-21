# Visual benchmark — round 1

This is a first, single-pair blind visual pass, not a pass/fail release audit. A/B composites were randomized with `tools/blind.py`; each verdict was recorded before opening that image's `.key`. The comparison used gameplay captures wherever available. Most references came from the game's Google Play listing; Downhill Masters used a gameplay frame from its Android gameplay video. These images remain local under ignored `refs/` and `screenshots/visqa/`.

## Blind results

| Game | Our side | Blind pick | Result | Primary visual note |
|---|---:|---:|---|---|
| Sinkhole City | A | B | Loss | The reference has a stronger centerpiece and lighting; our current scene has a small hole and crowded HUD, though the city reads cleanly. |
| Murmur | B | A | Loss | Our canyon mood is strong, but the flock is too small/dark and the world silhouettes/HUD do not yet match the reference's controlled composition. |
| Frostline Dash | B | A | Loss | The reference has clearer lane depth, color contrast and action; our snow/sky highlights clip, the track is too blank, and the rider/obstacles lack impact. |
| Ridgeline | A | B | Loss | Our start arch dominates, racers are tiny/far away, the plank surface is repetitive, and the `km/h` label has no visible value. |
| Bowbrawl | B | A | Loss | The reference has denser action and stronger character separation; our fighters are small, the turn label collides with pause, and the lower half is underused. |
| Mob Rush | — | — | Not scored | Playwright and CDP screenshot attempts hang; even local browser canvas capture times out. It loads enough to expose game state, but performance/rendering must be fixed before a visual comparison is valid. |

The five scored comparisons were all losses. Each is only one pairing, so none satisfies the project's multi-pair critic bar; no game can be called visually shipped.

## Current visual capture evidence

- Our captures: `screenshots/visqa/{hole_live-5000,original_live-5000,sled_live-5000,archer_live-5000}.png`, plus `screenshots/downhill/cdp.png`.
- Corrected gameplay references: `refs/{hole,original,sled,archer}/store*.jpg`, `refs/downhill/real_hq3.jpg`.
- Headless console was clean for hole/original/archer; sled had two non-fatal Three.js warnings (`toNonIndexed()` on already non-indexed geometry and removed `PCFSoftShadowMap`). Headless FPS samples were hole 1, original 2, sled 60, archer 6; these are SwiftShader measurements, not real-device FPS.

## Highest-priority fixes

1. Remove Mob Rush's pathological rendering/screenshot stall before judging it.
2. Fix the most visible composition/legibility defects per game: HUD collision in hole/archer, Murmur flock contrast/scale, sled exposure and track contrast, downhill rider framing/speed readout/surface variation.
3. Re-run at least four blind gameplay pairings per game against valid references, with fresh screenshots and keys opened only after each verdict.

## Updated fair gameplay pass (round 2)

Correction: the round-one Hole.io comparison used promotional store art, and the first Frostline/Sled comparison cropped an already-portrait reference too narrowly; those two pairings are excluded from the fair-score tally. Round two uses Hole.io's actual central gameplay frame from `refs/hole/ref1.jpg` cropped to its portrait gameplay area, Alto's Odyssey `refs/original/store2.jpg`, and the full portrait Subway Surfers gameplay capture `refs/sled/store2.jpg` without cropping.

| Game | Our side | Blind pick | Outcome | Updated visual notes |
|---|---:|---:|---|---|
| Sinkhole City | B | B | Win (one pair only) | HUD hierarchy is clearer; the city/plaza and counters read cleanly. The original has a larger hole and more dominant architecture, so test across multiple levels before calling this robust. |
| Murmur | A | B | Loss | Rim strokes help, but the flock remains tiny/dark. Alto's two riders, broad palette and silhouette separation are more legible. |
| Frostline Dash | A | B | Loss | Exposure improved, but the pale open track and small rider still lack the original's lane depth, obstacle density, and larger runner framing. |

The independent visual critic is reviewing these updated blind pairs. Downhill and archery remain provisional single-frame round-one diagnostics; Mob Rush remains unscored until a capturable frame exists.


### Bowbrawl fair active-gameplay recheck (round 3)

`archer_round3_fair.png` compared the then-current `archer_polish-5000.png` with the genuine active-play reference `refs/archer/store2.jpg`. The independent blind pick was A at 82/100 confidence; the decoded key says `ours=B`, so this pair favored the reference. The critic noted the project's large empty background and limited aiming/action feedback; the reference also had a crowded HUD and more saturated colors. The comparison is imperfect because the art styles and framing differ, but both frames show a two-character archer duel.

After that verdict, the arena was given layered mesas, watchtowers, a broader textured floor, and a trajectory preview. Fresh 640×360 captures `archer_round3_postfix.png` and `archer_round3_aim.png` show the terrain and the dotted arc during an active aim. The menu capture `archer_menu_postfix.png` exposes a new responsive-layout defect: the title and bottom controls are clipped at 640×360; a menu-only fix is pending. These post-change images are not new blind verdicts.
### Recheck evidence

- Updated captures: `screenshots/visqa/{hole_round2,original_round2,sled_round2}-5000.png`.
- Updated console: hole/original had no console warnings/errors (SwiftShader FPS 1/2); sled's previous `toNonIndexed()` and removed-`PCFSoftShadowMap` warnings were fixed, but its fresh screenshot retry timed out while the Android emulator system image was being unpacked. Earlier Sled capture measured 60 FPS under SwiftShader; none of these numbers represent physical-device performance.
- Next iteration: improve Murmur flock scale/contrast; increase Sled lane definition and near-field action density; finish Ridgeline framing, start-area and speed-pill recheck; remove Mob Rush's render stall; then verify Bowbrawl layout and repeat blind tests.

