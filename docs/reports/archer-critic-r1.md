# Bowbrawl (archer) — critic round 1

**VERDICT: NOT YET** · Blind A/B vs real Gunbound: ours preferred **4/7 (57%)**, bar is 75%.
Console clean everywhere; input works (menu → quick match → angle, tray, hold-to-fire all respond).

> Status: **fixes NOT yet applied.** This file is the input to fix pass 1.

## Blind pairings (judged before keys were read)
- p1 Sunspire vs GB desert fortress — **ours** (cleaner, vivid 3D; target archer half under the HUD strip)
- p2 Frostpeak vs GB snow train — **ours** (crater and blast read clearly; reference's painted art richer)
- p3 Ruins vs GB desert tower — **ours** (readable archer + aim gauge vs background and chat clutter)
- p4 Neon vs New Gunbound mobile forest — **REF** (our skyline is flat black boxes with pasted rectangles)
- p5 Emberforge vs GB laser hit on snow — **REF** (empty lava, both players off-screen)
- p6 Sunspire input frame vs GB snow train — **ours**, narrowly (archer tiny, behind a hut)
- p7 Vela close-up vs GB crocodile stage — **REF** (static idle doll vs characterful mid-fight stage)

## Scores (1-10)
Art direction 6 · Lighting/materials 5 · Environment detail 5 · Characters/animation 3 · UI/HUD 6 ·
Juice/feel 4 · Gameplay/controls 6 · Audio (code) 5 · Technical 7

## Ranked fixes
1. **core/** Camera fails to frame combatants (Emberforge s7, Sunspire s3 t=8s: neither archer on screen; target under the HUD at t=3s). Frame the active archer in the upper two-thirds, keep the target in view or in an inset, never put an actor's feet below the HUD top edge (~82% of screen height). *Lead independently confirmed on r1_emberforge_w60-3000.png.*
2. **maps/** Emberforge spawns read as open lava with no island geometry in frame; volcano backdrops are flat low-poly pyramids — add texture, emissive cracks, smoke plume, heat haze.
3. **maps/** Neon background is programmer art (flat black boxes, pasted quads). Layered lit silhouettes, emissive window atlases, signage, rim light, fog depth. Remove window squares stamped on terrain brick faces (read as z-fighting).
4. **characters/** Heroes are Roblox-tier: Brock a box-man rather than a hugely muscular gym-bro; Vela a stick figure rather than the brief's hourglass pin-up silhouette; crude faces. Exaggerated proportions, sculpted heads, faces readable at ~12% of screen height.
5. **characters/** Limp idle: arms down, side-on, no bow tension. Ready stance with bow raised, breathing, facing the target; aim gauge shown on the player's own turn.
6. **core/** Characters too small on screen (60-90 px of 412). Zoom in 25-35% during aim, pull out during flight.
7. **core/** ± angle buttons are hold-only at 32°/s, so a tap moves <1°. Tap = exact 1° step, repeat after 250 ms hold. Audit holdButton for stuck held state (release on pointerleave/touchend, clear on turn start).
8. **core/** HUD overlaps: damage "-1" over the WIND label (Ruins); power "91" overlaps the last-shot marker; "You" nameplate collides with palm fronds; damage popups linger 5+ s in the sky. Anchor popups to world positions, short lifetime, keep out of the top HUD band.
9. **core/** Turn-order strip shows bare initials (mirror matches indistinguishable); unlabelled "20" timer circle. Portrait chips with team rings; labelled timer ring.
10. **arrows/** Arrow path rendered as a straight white line out of frame (reads as a bug). Per-arrow coloured fading ribbon trails, camera on projectile, slow-mo near impact.
11. **vfx/** Impacts are grey smoke plus rocks. Flash, shockwave ring, debris in terrain colours, embers on lava, snow powder on Frostpeak; damage callout with pop-scale and coloured outline.
12. **characters/ (hooks)** `?char=nyx` ignored under `?scene=play` because Nyx isn't owned; test hooks must override ownership.
13. **meta/** Quick Match arena cards are flat gradient clip-art — use rendered map thumbnails. Menu hero hidden behind the Campaign button — move it large into the open right area.
14. **meta/** `?scene=over` shows Stars x3 / +256 while the hook passes stars 2 / coins 236 — display the passed values.
15. **audio/** Thin for 8 arrows: distinct whoosh, impact and callout stinger per arrow; per-map ambience bed.

Critic note: code quality solid (AI solves via live integrator with wind, pre-allocated buffers, seeded RNG). The gaps are visual quality, framing and characters.

Evidence: /home/user/game-android-copy/shots/archer/critic/ (r1_* screenshots, blind/p1-p7 composites).
