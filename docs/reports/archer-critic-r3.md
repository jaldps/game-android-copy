# Bowbrawl (archer) — critic round 3

**VERDICT: NOT YET** · Blind A/B vs real Gunbound (all-new reference frames): ours preferred **5/9 (55.6%)**, bar 75%.
Round 2 was 5/8, round 1 4/7. Console clean everywhere; input verified with real taps (1° angle steps,
tray, walking stops at walls, hold-to-fire).

> Status: **fixes NOT yet applied.** Input to fix pass 3, the last before the final critic round (4).

**Same decisive pattern as round 2: flight frames lose (2/5); aiming frames win.** The flight camera works for
flat and medium shots but fails on HIGH LOBS, which the AI fires often: the arrow leaves the top (chevron only)
or passes under the minimap/HOLD, and the main view can hold no archer at all.
Lead confirmed on a plain autoplay frame, ember_s12_w70_vela-3000.png: lava vista, no archer, no arrow,
both archers as edge markers (V 89m, B 55m), arrow trail dots up by the minimap. Fix pass 2's proof frames
were flat and medium shots, so both reports were true.

## Blind pairings (judged before keys; every ref new this round)
| | Ref | Ours | Type | Winner |
|---|---|---|---|---|
| p1 | Q57FG6yhQhI_hq3 | fl_sun_s3_b | flight | ours (but no visible arrow) |
| p2 | w9-2nJgphfg_hq1 | fl_frost_s2b | flight | ours (arrow a tiny flick) |
| p3 | UhHCYcAZJeY_hq1 | fl_neon_s9 | flight | **REF** — archer ~6% tall in a corner, arrow lost in the cat-sign ring under the HUD |
| p4 | hA_W__SOu9g_hq3 | sun_s3_w20-8000 | flight | **REF** — no archer, rock fills frame, arrow under the minimap |
| p5 | TlaOtVVw8Lo_hq3 | im_frost_s8 | impact | ours (victim a white ghost; nameplate over WIND) |
| p6 | 5UGQks5rWjw_hq2 | im_ruins_s5 | impact | **REF** — flat orange spheres + cubes in empty air, marker mid-screen |
| p7 | aR0azizDsFA_hq2 | sun_s21 | aim | ours |
| p8 | UhHCYcAZJeY_hq2 | ruins_s14_bjorn | aim | ours |
| p9 | hA_W__SOu9g_hq1 | ember_s12_w70_vela | flight | **REF** — no archer, no arrow |

## Scores (1-10)
Art 6 · Lighting 5 · Environment 6 · Characters 4 · UI/HUD 6 · Juice 4 · Gameplay 7 · Audio (code) 5 · Technical 7

## Round-2 fix check
Landed: 6 landmarks, 7 3D portraits, 9 power label (MOVE label still clipped), 12 quick match, 13 backdrops.
Partly: 2 actors under HUD, 3 impacts, 4 faces (mush at play scale), 5 Neon, 8 embers/sand, 11 walls (body stops, bow overlaps).
Not landed: **1 flight camera**. Not verifiable: 10 trails (arrow almost never on screen).

## Ranked fixes
1. **core/** Flight camera: the arrow always inside a safe rect (12–80% of height, clear of minimap, turn strip, HOLD and WIND); raise the zoom-out cap for high lobs instead of letting the arrow leave (the hard capH2 limit is the cause); chevron only as a last resort; at least one archer always in the main view. **Add an automated check sampling ~30 flight frames per map and asserting arrow and archer screen positions.**
2. **arrows/ vfx/** In-flight arrow readable at phone scale: 2–3x size, bright head glow, thick coloured ribbon (now ~10 px).
3. **vfx/** Explosion: additive fireball sprites, smoke and terrain-coloured chunks instead of solid sphere clusters.
4. **characters/** Hit flash: tint toward red/white at ≤50% instead of a full white silhouette.
5. **core/** HUD collisions: clamp nameplates below the WIND dial; edge markers only on the screen edge, never mid-screen; damage floaters on match time so warps/hitches don't stack stale numbers.
6. **core/** Settle camera after a miss: frame the impact with the nearest archer, not empty sky.
7. **maps/** Neon: real playable-rooftop material (tar/concrete, AC units, edge LEDs) instead of pale lilac streaks or flat brick; keep the cat-sign ring out from under the minimap and turn strip.
8. **characters/** Faces at ~12% of screen height (sculpted brow, nose, eye whites, mouth); Brock's face is still a blob.
9. **characters/ core/** Bow and aim arc must not overlap a wall the archer is pressed against.
10. **maps/** Ruins sun-king head: sculpted bevel, weathering gradient, AO; remove the stray white skull at spawn (ruins_s5_w45-9000).
11. **maps/ vfx/** Emberforge pale-grey drifting puffs still read as stray spheres.
12. **core/** First angle tap from a fractional angle moves 1.43° — step from an integer.

Evidence: /home/user/game-android-copy/shots/archer/critic/r3/ (blind/p1-p9, judgements.txt, fl_*, im_*, flight.js capture script).
