# Bowbrawl — asset credits

This rebuild uses original, runtime-generated visuals only.

- **Characters, islands, ruins, sky, clouds, VFX:** geometry created in `main.js`; no external models, images, or character artwork.
- **Rock, grass, and wood textures:** generated in a canvas at runtime; no external texture files.
- **Sound effects:** synthesized with the Web Audio API; no external audio files.
- **Typography:** uses the repository's local shared font stylesheet at `web/shared/fonts.css` and bundled font files.
- **Three.js:** uses the repository's vendored Three.js module, distributed under the MIT License. Existing third-party credits remain in the shared library's upstream license files.

No network requests or runtime asset downloads are introduced. The game remains playable offline in the Android WebView.
