// VFX presets — pure data consumed by core/fx.js (owner: Arrows/VFX/Audio specialist).
// A preset = { emitters?: Emitter[], debris?: Debris, ring?: Ring, flash?: Flash, shake?: number }
// Emitter fields (all optional; [a,b] means random in range):
//   count, shape: 'glow'|'puff'|'streak'|'star'|'ring', blend: 'add'|'alpha', life, speed, dir (rad | 'input' | null=radial),
//   spread (rad), offset, size, grow (end size multiplier), color (hex | 'terrain'), color2 (hex | 'terrain' | 'dark'), colorJitter,
//   alpha: [start,end], gravity, drag, lift, spin, z, inherit (fraction of opts.vx/vy), tintable (opts.tint overrides color)
// Debris: { count, speed, size, life, color (hex|'terrain'), dir, spread }   Ring: { radius, color, life, alpha }
// Flash: { color, intensity, radius, life }
// Budget: the pool is 900 particles / 140 debris. Big presets are scaled by blast radius (count x <=1.6).
const UP = Math.PI / 2;

// Reusable building blocks (plain data; spread into presets at module load only).
const shockRing = (size, color, life = 0.32, alpha = 0.9) => ({ count: 1, shape: 'ring', blend: 'add', life, speed: 0, size, grow: 5, color, alpha: [alpha, 0], drag: 0, scaleCount: false });
const groundSkirt = (dir, count, color = 'terrain') => ({ count, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [5, 9], dir, spread: 0.35, size: [0.22, 0.36], grow: 2.2, color, color2: 0xf2ebe0, colorJitter: 0.5, alpha: [0.95, 0], drag: 4.5, lift: 0.6, z: [0.2, 1.2] });

export const VFX = {
  // ---------------------------------------------------------------- core ids
  impact_dirt: {
    emitters: [
      { count: [7, 10], shape: 'puff', blend: 'alpha', life: [0.45, 0.8], speed: [1.5, 4.5], dir: 'input', spread: 2.0, size: [0.22, 0.4], grow: 1.9, color: 'terrain', color2: 'dark', colorJitter: 0.4, alpha: [1, 0], gravity: 4, drag: 3 },
      { count: 7, shape: 'streak', blend: 'add', life: [0.15, 0.3], speed: [6, 11], dir: 'input', spread: 2.2, size: 0.05, color: 0xfff1c8, alpha: [1, 0], gravity: 12, drag: 2 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.14, speed: 0, size: 1.0, grow: 1.4, color: 0xffe2a8, alpha: [0.7, 0], zBias: -1.2, scaleCount: false },
      shockRing(0.45, 0xffffff, 0.26, 0.85),
    ],
    debris: { count: 12, speed: [5, 10], size: [0.07, 0.16], life: [0.9, 1.5], color: 'terrain', top: 0.4 },
    ring: { radius: 2.4, color: 0xfff1c8, life: 0.3, alpha: 0.85 },
    flash: { color: 0xfff0c8, intensity: 45, radius: 10, life: 0.18 },
    shake: 0.22,
  },
  impact_body: {
    emitters: [
      { count: 12, shape: 'star', blend: 'add', life: [0.2, 0.42], speed: [3, 8], size: [0.12, 0.24], color: 0xffffff, color2: 0xffd27a, alpha: [1, 0], drag: 5, spin: 8 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.18, speed: 0, size: 1.3, grow: 1.6, color: 0xffd9a0, alpha: [0.65, 0], zBias: -1.2, scaleCount: false },
      { count: 6, shape: 'streak', blend: 'add', life: [0.12, 0.22], speed: [8, 13], size: 0.06, color: 0xffffff, color2: 0xffb35c, alpha: [1, 0], drag: 3 },
    ],
    ring: { radius: 1.7, color: 0xffffff, life: 0.25 },
    shake: 0.3,
  },
  headshot: {
    emitters: [
      { count: 20, shape: 'star', blend: 'add', life: [0.3, 0.6], speed: [4, 10], size: [0.15, 0.32], color: 0xfff6a0, color2: 0xff8a3d, alpha: [1, 0], drag: 4, spin: 10 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.28, speed: 0, size: 2.2, grow: 1.4, color: 0xffe08a, alpha: [0.75, 0], zBias: -1.6, scaleCount: false },
      shockRing(0.5, 0xffffff, 0.22),
    ],
    ring: { radius: 2.8, color: 0xffe27a, life: 0.38 },
    flash: { color: 0xfff0a0, intensity: 50, radius: 10, life: 0.2 },
    shake: 0.5,
  },
  // played by core/match.js on top of the arrow's own impact whenever someone takes damage (at the victim's body)
  impact_hit: {
    emitters: [
      // warm, small glow (a big white additive disc washed the victim out over bright sand / snow)
      { count: 1, shape: 'glow', blend: 'add', life: 0.22, speed: 0, size: 1.3, grow: 1.4, color: 0xffb060, alpha: [0.5, 0], zBias: -1.6, scaleCount: false },
      shockRing(0.6, 0xffe2b0, 0.3, 0.75),
      shockRing(0.35, 0xffd27a, 0.5, 0.9),
      { count: 16, shape: 'star', blend: 'add', life: [0.3, 0.55], speed: [5, 11], size: [0.14, 0.26], color: 0xffffff, color2: 0xffc04a, alpha: [1, 0], drag: 4, spin: 9 },
      { count: 10, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [3, 7], dir: 'input', spread: 2.2, size: [0.2, 0.34], grow: 1.9, color: 'terrain', color2: 'dark', colorJitter: 0.5, alpha: [1, 0], gravity: 5, drag: 3, zBias: 0.6 },
    ],
    debris: { count: 12, speed: [6, 12], size: [0.08, 0.18], life: [1.0, 1.7], color: 'terrain', spread: 2.6, top: 0.35 },
    ring: { radius: 3.6, color: 0xfff0c8, life: 0.42, alpha: 0.95 },
    flash: { color: 0xffc070, intensity: 90, radius: 14, life: 0.3 },
    shake: 0.6,
  },
  explosion: {
    // order matters inside a blend group: earlier emitters draw underneath. No hard-edged discs: the fireball is soft
    // licking 'fire' sprites (alpha body + additive hot core), the smoke soft 'smoke' billows, the chunks are terrain.
    emitters: [
      // lingering smoke column (soft billows, sooty to ash)
      { count: [10, 13], shape: 'smoke', blend: 'alpha', life: [1.1, 2.0], speed: [2, 4.5], size: [0.6, 0.95], grow: 2.4, color: 0x3e3430, color2: 0x9c938c, colorJitter: 0.4, alpha: [0.85, 0], drag: 2.4, lift: 2.6, gravity: -1.3, zBias: -1.1 },
      // dust skirts rolling along the ground
      groundSkirt(0, 5), groundSkirt(Math.PI, 5),
      // fireball body: soft orange-red flame sprites that bloom and burn out (alpha so it reads over bright sand / snow)
      { count: [10, 12], shape: 'fire', blend: 'alpha', life: [0.38, 0.62], speed: [3, 7], size: [0.8, 1.2], grow: 1.5, color: 0xffb12e, color2: 0xc8280a, colorJitter: 0.35, alpha: [0.95, 0], drag: 6, lift: 1.8, zBias: -0.9 },
      // additive hot core on top: bright, short, pushed behind the z=0 plane so it never paints a disc over a victim
      { count: [5, 6], shape: 'fire', blend: 'add', life: [0.2, 0.34], speed: [1.5, 4], size: [0.6, 0.9], grow: 1.3, color: 0xffe07a, color2: 0xff6a1a, alpha: [0.9, 0], drag: 7, zBias: -1.0 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.2, speed: 0, size: 1.8, grow: 1.6, color: 0xffc070, alpha: [0.75, 0], zBias: -1.2, scaleCount: false },
      // sparks + embers
      { count: 20, shape: 'streak', blend: 'add', life: [0.25, 0.55], speed: [10, 19], size: 0.09, color: 0xffe9a8, color2: 0xff7a2a, alpha: [1, 0], gravity: 14, drag: 1.5 },
      { count: 8, shape: 'glow', blend: 'add', life: [0.6, 1.2], speed: [3, 7], dir: UP, spread: 2.2, size: [0.06, 0.11], color: 0xffd27a, color2: 0xff4a10, alpha: [1, 0], gravity: 5, drag: 1.2, z: [0, 1.5] },
      // second (late, wide) shockwave
      shockRing(0.9, 0xffd9a0, 0.22, 0.45),
    ],
    debris: { count: 14, speed: [6, 13], size: [0.08, 0.2], life: [1.0, 1.8], color: 'terrain', spread: 2.6, top: 0.3 },
    ring: { radius: 3.2, color: 0xffc070, life: 0.3, alpha: 0.5 },
    flash: { color: 0xff9a4a, intensity: 110, radius: 16, life: 0.32 },
    shake: 0.8,
  },
  split: {
    emitters: [
      { count: 14, shape: 'star', blend: 'add', life: [0.25, 0.45], speed: [3, 6], size: [0.12, 0.22], color: 0xb7f3ff, color2: 0x4fb6ff, alpha: [1, 0], drag: 4, spin: 8 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.2, speed: 0, size: 1.2, grow: 1.5, color: 0xbff4ff, alpha: [0.9, 0], scaleCount: false },
    ],
    ring: { radius: 1.8, color: 0xaef0ff, life: 0.3 },
  },
  splash: {
    emitters: [
      { count: 16, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [4, 9], dir: UP, spread: 0.9, size: [0.2, 0.35], grow: 0.6, color: 0xffffff, color2: 0x9fe3ff, alpha: [1, 0], gravity: 16, drag: 1 },
      { count: 8, shape: 'glow', blend: 'add', life: [0.3, 0.6], speed: [5, 10], dir: UP, spread: 0.7, size: [0.06, 0.1], color: 0xffffff, alpha: [1, 0], gravity: 18, drag: 1 },
    ],
    ring: { radius: 1.6, color: 0xffffff, life: 0.5, blend: 'alpha', alpha: 0.8 },
  },
  land_dust: {
    emitters: [
      { count: 7, shape: 'puff', blend: 'alpha', life: [0.35, 0.6], speed: [1, 2.5], dir: UP, spread: 2.8, size: [0.15, 0.28], grow: 1.8, color: 'terrain', color2: 0xf2ebe0, colorJitter: 0.5, alpha: [0.9, 0], drag: 4 },
    ],
  },
  step_dust: {
    emitters: [
      { count: 2, shape: 'puff', blend: 'alpha', life: [0.3, 0.5], speed: [0.3, 1], dir: UP, spread: 2.0, size: [0.08, 0.14], grow: 2.0, color: 'terrain', color2: 0xf2ebe0, colorJitter: 0.5, alpha: [0.8, 0], drag: 3 },
    ],
  },
  muzzle: {
    emitters: [
      { count: 6, shape: 'streak', blend: 'add', life: [0.12, 0.22], speed: [3, 6], dir: 'input', spread: 0.6, size: 0.06, color: 0xffffff, alpha: [1, 0], drag: 6 },
      { count: 4, shape: 'puff', blend: 'alpha', life: [0.25, 0.45], speed: [0.6, 1.6], dir: 'input', spread: 1.4, size: [0.08, 0.14], grow: 2.2, color: 0xffffff, alpha: [0.7, 0], drag: 4 },
    ],
  },
  death_poof: {
    emitters: [
      { count: 22, shape: 'puff', blend: 'alpha', life: [0.6, 1.1], speed: [2, 5], size: [0.3, 0.55], grow: 1.6, color: 0xffffff, color2: 0xd8d0ff, alpha: [1, 0], drag: 3, lift: 1 },
      { count: 14, shape: 'star', blend: 'add', life: [0.4, 0.8], speed: [3, 7], size: [0.15, 0.3], color: 0xfff6a0, alpha: [1, 0], drag: 3 },
    ],
    shake: 0.5,
  },

  // ---------------------------------------------------------------- arrow impacts
  impact_shard: {
    emitters: [
      { count: 8, shape: 'star', blend: 'add', life: [0.2, 0.4], speed: [3, 6], dir: 'input', spread: 2.4, size: [0.1, 0.18], color: 0xd8f8ff, color2: 0x4fb6ff, alpha: [1, 0], drag: 4, spin: 6 },
      { count: [5, 7], shape: 'puff', blend: 'alpha', life: [0.4, 0.7], speed: [1.5, 3.5], dir: 'input', spread: 2.0, size: [0.18, 0.3], grow: 1.8, color: 'terrain', color2: 'dark', colorJitter: 0.4, alpha: [1, 0], gravity: 4, drag: 3 },
    ],
    debris: { count: 3, speed: [3, 7], size: [0.05, 0.1], life: [0.8, 1.2], color: 'terrain' },
    ring: { radius: 1.3, color: 0x9fe6ff, life: 0.22 },
    shake: 0.12,
  },
  explosion_small: { // bouncer pop: lime + white, punchy but smaller than Blast
    emitters: [
      { count: [8, 10], shape: 'puff', blend: 'alpha', life: [0.8, 1.4], speed: [2, 4.5], size: [0.26, 0.4], grow: 2.2, color: 0x6a6a5a, color2: 0xc8c8b8, colorJitter: 0.5, alpha: [0.9, 0], drag: 2.6, lift: 2.2, gravity: -1 },
      groundSkirt(0, 3), groundSkirt(Math.PI, 3),
      { count: [9, 11], shape: 'fire', blend: 'alpha', life: [0.25, 0.45], speed: [3.5, 7], size: [0.28, 0.42], grow: 1.3, color: 0xf6ff8a, color2: 0x5ad82a, colorJitter: 0.6, alpha: [0.95, 0], drag: 6, lift: 1.2 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.14, speed: 0, size: 1.1, grow: 1.6, color: 0xf0ffd0, alpha: [0.85, 0], scaleCount: false },
      { count: 14, shape: 'star', blend: 'add', life: [0.3, 0.55], speed: [6, 12], size: [0.12, 0.22], color: 0xffffff, color2: 0x9dff6a, alpha: [1, 0], gravity: 10, drag: 2, spin: 10 },
    ],
    debris: { count: 10, speed: [5, 11], size: [0.08, 0.2], life: [1.0, 1.8], color: 'terrain', spread: 2.8, top: 0.35 },
    ring: { radius: 2.4, color: 0xd8ffb0, life: 0.28 },
    flash: { color: 0xc8ff7a, intensity: 70, radius: 12, life: 0.24 },
    shake: 0.55,
  },
  bounce: {
    emitters: [
      { count: 6, shape: 'puff', blend: 'alpha', life: [0.3, 0.55], speed: [1.5, 3.5], dir: 'input', spread: 2.2, size: [0.16, 0.28], grow: 1.8, color: 'terrain', color2: 0xf2ebe0, colorJitter: 0.5, alpha: [1, 0], gravity: 3, drag: 3.5 },
      { count: 8, shape: 'star', blend: 'add', life: [0.2, 0.35], speed: [3, 6], dir: 'input', spread: 2.0, size: [0.1, 0.18], color: 0xffffff, color2: 0x9dff6a, alpha: [1, 0], drag: 4, spin: 8 },
    ],
    debris: { count: 3, speed: [3, 6], size: [0.05, 0.1], life: [0.6, 1.0], color: 'terrain' },
    ring: { radius: 1.4, color: 0xd8ffb0, life: 0.22 },
  },
  drill_enter: {
    emitters: [
      { count: 10, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [2, 5], dir: 'input', spread: 1.6, size: [0.2, 0.34], grow: 2.0, color: 'terrain', color2: 'dark', colorJitter: 0.5, alpha: [1, 0], gravity: 5, drag: 3 },
      { count: 14, shape: 'streak', blend: 'add', life: [0.15, 0.3], speed: [7, 13], dir: 'input', spread: 1.8, size: 0.06, color: 0xffe0a0, color2: 0xff7a1a, alpha: [1, 0], gravity: 14, drag: 2 },
    ],
    debris: { count: 8, speed: [5, 9], size: [0.07, 0.15], life: [0.8, 1.4], color: 'terrain', spread: 1.8 },
    ring: { radius: 1.2, color: 0xffd27a, life: 0.2 },
    shake: 0.3,
  },
  drill_blast: { // underground detonation: heaves the ground, mostly rock and dust, little fire
    emitters: [
      { count: [14, 18], shape: 'puff', blend: 'alpha', life: [0.9, 1.6], speed: [3, 7], dir: UP, spread: 2.4, size: [0.3, 0.48], grow: 2.4, color: 'terrain', color2: 0xd8ccbc, colorJitter: 0.6, alpha: [1, 0], drag: 2.4, lift: 1.8, gravity: 1 },
      groundSkirt(0, 5), groundSkirt(Math.PI, 5),
      { count: [7, 9], shape: 'fire', blend: 'alpha', life: [0.25, 0.45], speed: [3, 6], size: [0.3, 0.44], grow: 1.3, color: 0xffc23a, color2: 0xff4a10, colorJitter: 0.6, alpha: [0.95, 0], drag: 6, lift: 1 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.16, speed: 0, size: 1.3, grow: 1.6, color: 0xffd8a0, alpha: [0.8, 0], scaleCount: false },
      { count: 14, shape: 'streak', blend: 'add', life: [0.25, 0.5], speed: [9, 16], dir: UP, spread: 2.2, size: 0.08, color: 0xffe0a0, color2: 0xff7a1a, alpha: [1, 0], gravity: 16, drag: 1.5 },
    ],
    debris: { count: 24, speed: [7, 16], size: [0.1, 0.3], life: [1.3, 2.3], color: 'terrain', dir: UP, spread: 1.9, top: 0.25 },
    ring: { radius: 3.0, color: 0xffd8a0, life: 0.3 },
    flash: { color: 0xffa04a, intensity: 80, radius: 14, life: 0.28 },
    shake: 0.95,
  },
  frost_burst: { // saturated cyan/blue so it reads on bright skies and snow
    emitters: [
      { count: [10, 12], shape: 'puff', blend: 'alpha', life: [0.7, 1.2], speed: [2, 5], size: [0.26, 0.42], grow: 2.0, color: 0x9fe4ff, color2: 0x3a9cff, colorJitter: 0.6, alpha: [0.95, 0], drag: 3, lift: 0.8 },
      { count: 12, shape: 'star', blend: 'alpha', life: [0.6, 1.1], speed: [2, 5.5], size: [0.16, 0.3], color: 0x5ad8ff, color2: 0x2a6aff, alpha: [1, 0], gravity: 1.2, drag: 2, spin: 5, z: [0, 1] },
      { count: 16, shape: 'streak', blend: 'add', life: [0.3, 0.55], speed: [6, 12], size: 0.08, color: 0xd8f8ff, color2: 0x2a9cff, alpha: [1, 0], gravity: 6, drag: 2 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.2, speed: 0, size: 1.6, grow: 1.5, color: 0x6ad0ff, alpha: [0.9, 0], scaleCount: false },
      shockRing(0.6, 0x5ad0ff, 0.3),
    ],
    debris: { count: 12, speed: [5, 10], size: [0.08, 0.18], life: [1.0, 1.6], color: 0x7fd8ff, spread: 2.8 },
    ring: { radius: 2.8, color: 0x7fe0ff, life: 0.35 },
    flash: { color: 0x4ab8ff, intensity: 80, radius: 13, life: 0.3 },
    shake: 0.45,
  },
  frost_chill: { // clings to a frozen hero
    emitters: [
      { count: 10, shape: 'star', blend: 'alpha', life: [0.6, 1.0], speed: [0.5, 1.8], size: [0.12, 0.22], offset: [0.2, 0.6], color: 0x7fe0ff, color2: 0x2a7aff, alpha: [1, 0], gravity: -0.6, drag: 2, spin: 4, z: [0, 0.6] },
      { count: 6, shape: 'puff', blend: 'alpha', life: [0.6, 1.0], speed: [0.4, 1.2], size: [0.18, 0.3], grow: 1.8, color: 0xbfeeff, color2: 0x5ab0ff, alpha: [0.85, 0], drag: 2, lift: 0.5 },
    ],
  },
  zap: {
    emitters: [
      { count: 12, shape: 'streak', blend: 'add', life: [0.08, 0.18], speed: [7, 14], size: 0.06, color: 0xffffff, color2: 0xc89aff, alpha: [1, 0], drag: 3 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.16, speed: 0, size: 1.4, grow: 1.4, color: 0xe0c8ff, alpha: [1, 0], scaleCount: false },
      { count: [4, 6], shape: 'puff', blend: 'alpha', life: [0.4, 0.7], speed: [1, 3], dir: UP, spread: 2.4, size: [0.18, 0.3], grow: 1.8, color: 'terrain', color2: 'dark', alpha: [0.9, 0], drag: 3 },
    ],
    ring: { radius: 1.4, color: 0xc89aff, life: 0.2 },
    shake: 0.15,
  },
  lightning_strike: {
    emitters: [
      { count: 1, shape: 'glow', blend: 'add', life: 0.22, speed: 0, size: 2.6, grow: 1.3, color: 0xffffff, alpha: [1, 0], scaleCount: false },
      { count: 24, shape: 'streak', blend: 'add', life: [0.12, 0.3], speed: [8, 18], size: 0.07, color: 0xffffff, color2: 0xffe94a, alpha: [1, 0], gravity: 6, drag: 2 },
      { count: 10, shape: 'star', blend: 'add', life: [0.3, 0.6], speed: [2, 6], size: [0.14, 0.26], color: 0xfff6a0, color2: 0xb06aff, alpha: [1, 0], drag: 3, spin: 12 },
      { count: [8, 10], shape: 'puff', blend: 'alpha', life: [0.7, 1.2], speed: [1.5, 4], size: [0.24, 0.38], grow: 2.2, color: 0x4a3a5a, color2: 0xa898b8, colorJitter: 0.5, alpha: [0.85, 0], drag: 2.5, lift: 1.6 },
      shockRing(0.7, 0xfff6c0, 0.22),
    ],
    debris: { count: 8, speed: [5, 10], size: [0.07, 0.16], life: [0.9, 1.5], color: 'terrain' },
    ring: { radius: 2.6, color: 0xd8b8ff, life: 0.3 },
    flash: { color: 0xc8b0ff, intensity: 140, radius: 20, life: 0.35 },
    shake: 0.75,
  },
  warp_out: {
    emitters: [
      { count: 16, shape: 'star', blend: 'add', life: [0.35, 0.6], speed: [2, 5], size: [0.12, 0.22], color: 0xffffff, color2: 0xff5ad8, alpha: [1, 0], drag: 3, spin: 8 },
      { count: 8, shape: 'glow', blend: 'add', life: [0.4, 0.7], speed: [3, 6], dir: UP, spread: 0.4, size: [0.15, 0.3], color: 0xffc0f4, color2: 0xa020ff, alpha: [1, 0], drag: 1.5 },
      shockRing(0.4, 0xff9ae8, 0.3),
    ],
    ring: { radius: 1.8, color: 0xff5ad8, life: 0.3 },
  },
  warp_in: {
    emitters: [
      { count: 1, shape: 'glow', blend: 'add', life: 0.3, speed: 0, size: 2.0, grow: 0.6, color: 0xffd0f8, alpha: [1, 0], scaleCount: false },
      { count: 18, shape: 'streak', blend: 'add', life: [0.2, 0.4], speed: [6, 11], size: 0.07, color: 0xffffff, color2: 0xff5ad8, alpha: [1, 0], drag: 3 },
      { count: 10, shape: 'star', blend: 'add', life: [0.4, 0.7], speed: [1, 3], size: [0.14, 0.24], color: 0xffffff, color2: 0xb06aff, alpha: [1, 0], drag: 2, spin: 6, lift: 1 },
    ],
    ring: { radius: 2.2, color: 0xff9ae8, life: 0.32 },
    flash: { color: 0xff6ae0, intensity: 60, radius: 10, life: 0.25 },
    shake: 0.2,
  },

  // ---------------------------------------------------------------- map falls (MapDef.fallVfx)
  lava_plunge: {
    emitters: [
      // steam/smoke first (draws underneath), molten glops on top
      { count: 8, shape: 'puff', blend: 'alpha', life: [1.0, 1.6], speed: [1, 2.5], dir: UP, spread: 1.2, size: [0.26, 0.4], grow: 2.4, color: 0x7a5a50, color2: 0xb8aaa4, colorJitter: 0.5, alpha: [0.7, 0], drag: 2, lift: 2.4 },
      { count: 16, shape: 'fire', blend: 'alpha', life: [0.4, 0.7], speed: [4, 10], dir: UP, spread: 0.9, size: [0.24, 0.4], grow: 1.3, color: 0xffe04a, color2: 0xff3a10, colorJitter: 0.7, alpha: [0.95, 0], gravity: 16, drag: 1.2 },
      { count: 16, shape: 'glow', blend: 'add', life: [0.8, 1.6], speed: [3, 8], dir: UP, spread: 1.4, size: [0.06, 0.12], color: 0xffe08a, color2: 0xff4a10, alpha: [1, 0], gravity: 2, drag: 1, z: [0, 1.2] },
      { count: 1, shape: 'glow', blend: 'add', life: 0.25, speed: 0, size: 2.2, grow: 1.4, color: 0xffa040, alpha: [0.9, 0], scaleCount: false },
    ],
    ring: { radius: 2.0, color: 0xffb04a, life: 0.4 },
    flash: { color: 0xff7a2a, intensity: 90, radius: 14, life: 0.35 },
    shake: 0.35,
  },
  street_impact: {
    emitters: [
      { count: 10, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [2, 5], dir: UP, spread: 2.4, size: [0.22, 0.38], grow: 2.0, color: 0x8a8898, color2: 0xd8d4e0, colorJitter: 0.5, alpha: [0.95, 0], drag: 3, lift: 0.6 },
      { count: 8, shape: 'streak', blend: 'add', life: [0.2, 0.4], speed: [5, 10], dir: UP, spread: 2.0, size: 0.06, color: 0xff7ae8, color2: 0x4af0ff, alpha: [1, 0], gravity: 14, drag: 1.5 },
    ],
    debris: { count: 8, speed: [4, 9], size: [0.07, 0.15], life: [0.8, 1.4], color: 0x9a98a8, dir: UP, spread: 2.2 },
    ring: { radius: 1.8, color: 0xff7ae8, life: 0.3, alpha: 0.7 },
    shake: 0.4,
  },
  sand_plume: {
    emitters: [
      { count: 18, shape: 'puff', blend: 'alpha', life: [0.7, 1.3], speed: [4, 9], dir: UP, spread: 1.1, size: [0.26, 0.42], grow: 1.8, color: 0xf0d590, color2: 0xfff1d0, colorJitter: 0.5, alpha: [1, 0], gravity: 7, drag: 1.6 },
      { count: 10, shape: 'puff', blend: 'alpha', life: [1.2, 2.0], speed: [1, 3], dir: UP, spread: 2.6, size: [0.3, 0.5], grow: 2.6, color: 0xe8c890, color2: 0xfff6e0, colorJitter: 0.4, alpha: [0.7, 0], drag: 1.5, lift: 0.8 },
    ],
    debris: { count: 6, speed: [4, 8], size: [0.05, 0.1], life: [0.8, 1.3], color: 0xe0c080, dir: UP, spread: 1.6 },
    shake: 0.3,
  },
  // ---------------------------------------------------------------- per-map impact accents
  // core/match.js plays `accent_<mapId>` on top of every explosion/impact on that map (scaled by blast radius), so a hit
  // on lava throws embers, on snow a powder burst, in the desert a sand puff, in the city neon sparks.
  accent_emberforge: {
    emitters: [
      { count: [10, 14], shape: 'glow', blend: 'add', life: [0.9, 1.7], speed: [2, 6], dir: UP, spread: 1.8, size: [0.05, 0.11], color: 0xffe08a, color2: 0xff3a0a, alpha: [1, 0], gravity: -0.6, drag: 1.4, z: [0, 1.4] },
      { count: 8, shape: 'fire', blend: 'alpha', life: [0.3, 0.55], speed: [4, 9], dir: UP, spread: 1.4, size: [0.1, 0.18], grow: 1.3, color: 0xffd23a, color2: 0xff3a10, alpha: [0.95, 0], gravity: 18, drag: 1 },
      { count: 4, shape: 'puff', blend: 'alpha', life: [1.0, 1.6], speed: [1, 2.5], dir: UP, spread: 1.4, size: [0.22, 0.34], grow: 2.4, color: 0x4a3434, color2: 0x8a7a76, alpha: [0.7, 0], drag: 2, lift: 2.2 },
    ],
  },
  accent_frostpeak: {
    emitters: [
      { count: [10, 13], shape: 'puff', blend: 'alpha', life: [0.7, 1.3], speed: [2.5, 6], dir: UP, spread: 2.4, size: [0.22, 0.38], grow: 2.6, color: 0xffffff, color2: 0xdcecff, colorJitter: 0.4, alpha: [1, 0], gravity: 1.2, drag: 2.6, z: [0, 1.2] },
      { count: 10, shape: 'star', blend: 'add', life: [0.5, 0.9], speed: [1.5, 4], spread: 6.28, size: [0.06, 0.12], color: 0xffffff, color2: 0x9fd8ff, alpha: [1, 0], gravity: 2, drag: 2, spin: 5, z: [0, 1.2] },
    ],
    debris: { count: 5, speed: [4, 8], size: [0.05, 0.11], life: [0.8, 1.3], color: 0xf4f8ff, dir: UP, spread: 2.2 },
  },
  accent_ruins: {
    emitters: [
      { count: [8, 10], shape: 'puff', blend: 'alpha', life: [0.8, 1.4], speed: [2, 5], dir: UP, spread: 2.2, size: [0.24, 0.4], grow: 2.4, color: 0xf0d590, color2: 0xfff1d0, colorJitter: 0.5, alpha: [0.85, 0], gravity: 1.5, drag: 2.2, lift: 0.5 },
    ],
  },
  accent_sunspire: {
    emitters: [
      { count: 7, shape: 'streak', blend: 'alpha', life: [0.4, 0.8], speed: [4, 8], dir: UP, spread: 2.0, size: 0.07, color: 0x6fd24a, color2: 0x3faa3a, alpha: [1, 0], gravity: 12, drag: 1.5 },
    ],
  },
  accent_neon: {
    emitters: [
      { count: 10, shape: 'streak', blend: 'add', life: [0.25, 0.5], speed: [6, 12], dir: UP, spread: 2.4, size: 0.06, color: 0xff7ae8, color2: 0x4af0ff, colorJitter: 1, alpha: [1, 0], gravity: 14, drag: 1.5 },
      { count: 1, shape: 'ring', blend: 'add', life: 0.3, speed: 0, size: 0.4, grow: 5, color: 0x4af0ff, alpha: [0.8, 0], drag: 0, scaleCount: false },
    ],
  },
  // trail puffs are emitted continuously by core/projectiles.js using def.trail.puff (an Emitter)
};
