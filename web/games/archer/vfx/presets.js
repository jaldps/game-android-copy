// VFX presets — pure data consumed by core/fx.js (owner: Arrows/VFX/Audio specialist).
// A preset = { emitters?: Emitter[], debris?: Debris, ring?: Ring, flash?: Flash, shake?: number }
// Emitter fields (all optional; [a,b] means random in range):
//   count, shape: 'glow'|'puff'|'streak'|'star'|'ring', blend: 'add'|'alpha', life, speed, dir (rad | 'input' | null=radial),
//   spread (rad), offset, size, grow (end size multiplier), color (hex | 'terrain'), color2 (hex | 'terrain' | 'dark'), colorJitter,
//   alpha: [start,end], gravity, drag, lift, spin, z, inherit (fraction of opts.vx/vy), tintable (opts.tint overrides color)
// Debris: { count, speed, size, life, color (hex|'terrain'), dir, spread }   Ring: { radius, color, life, alpha }
// Flash: { color, intensity, radius, life }
export const VFX = {
  impact_dirt: {
    emitters: [
      { count: [6, 9], shape: 'puff', blend: 'alpha', life: [0.45, 0.8], speed: [1.5, 4], dir: Math.PI / 2, spread: 2.2, size: [0.22, 0.4], grow: 1.8, color: 'terrain', color2: 'dark', colorJitter: 0.4, alpha: [1, 0], gravity: 4, drag: 3 },
      { count: 6, shape: 'streak', blend: 'add', life: [0.15, 0.3], speed: [6, 11], dir: Math.PI / 2, spread: 2.4, size: 0.05, color: 0xfff1c8, alpha: [1, 0], gravity: 12, drag: 2 },
    ],
    debris: { count: 4, speed: [4, 8], size: [0.06, 0.12], life: [0.8, 1.4], color: 'terrain' },
    shake: 0.12,
  },
  impact_body: {
    emitters: [
      { count: 10, shape: 'star', blend: 'add', life: [0.2, 0.4], speed: [3, 7], size: [0.12, 0.22], color: 0xffffff, color2: 0xffd27a, alpha: [1, 0], drag: 5 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.18, speed: 0, size: 1.1, grow: 1.6, color: 0xffffff, alpha: [0.9, 0], scaleCount: false },
    ],
    ring: { radius: 1.6, color: 0xffffff, life: 0.25 },
    shake: 0.25,
  },
  headshot: {
    emitters: [
      { count: 18, shape: 'star', blend: 'add', life: [0.3, 0.55], speed: [4, 9], size: [0.15, 0.3], color: 0xfff6a0, color2: 0xff8a3d, alpha: [1, 0], drag: 4 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.25, speed: 0, size: 2.0, grow: 1.4, color: 0xfff1b0, alpha: [1, 0], scaleCount: false },
    ],
    ring: { radius: 2.6, color: 0xffe27a, life: 0.35 },
    shake: 0.45,
  },
  explosion: {
    // order matters inside a blend group: earlier emitters draw underneath
    emitters: [
      { count: [12, 16], shape: 'puff', blend: 'alpha', life: [1.0, 1.8], speed: [2.5, 5.5], size: [0.28, 0.45], grow: 2.6, color: 0x5a4844, color2: 0xb0a49c, colorJitter: 0.5, alpha: [0.95, 0], drag: 2.4, lift: 2.6, gravity: -1.2 },
      { count: [12, 14], shape: 'puff', blend: 'alpha', life: [0.3, 0.55], speed: [4, 8.5], size: [0.32, 0.5], grow: 0.7, color: 0xffd23a, color2: 0xff3a10, colorJitter: 0.6, alpha: [1, 1], drag: 6, lift: 1.5 },
      { count: [5, 6], shape: 'puff', blend: 'alpha', life: [0.18, 0.3], speed: [1, 3], size: [0.3, 0.42], grow: 0.5, color: 0xffffff, color2: 0xfff07a, alpha: [1, 1], drag: 7 },
      { count: 1, shape: 'glow', blend: 'add', life: 0.14, speed: 0, size: 1.0, grow: 1.5, color: 0xfff0c0, alpha: [0.7, 0], scaleCount: false },
      { count: 22, shape: 'streak', blend: 'add', life: [0.25, 0.55], speed: [10, 19], size: 0.09, color: 0xffe9a8, color2: 0xff7a2a, alpha: [1, 0], gravity: 14, drag: 1.5 },
    ],
    debris: { count: 16, speed: [6, 14], size: [0.1, 0.26], life: [1.2, 2.2], color: 'terrain', spread: 3.0 },
    ring: { radius: 3.0, color: 0xffe0a0, life: 0.3 },
    flash: { color: 0xff9a4a, intensity: 90, radius: 16, life: 0.3 },
    shake: 0.7,
  },
  split: {
    emitters: [
      { count: 14, shape: 'star', blend: 'add', life: [0.25, 0.45], speed: [3, 6], size: [0.12, 0.22], color: 0xb7f3ff, color2: 0x4fb6ff, alpha: [1, 0], drag: 4 },
    ],
    ring: { radius: 1.8, color: 0xaef0ff, life: 0.3 },
  },
  splash: {
    emitters: [
      { count: 16, shape: 'puff', blend: 'alpha', life: [0.5, 0.9], speed: [4, 9], dir: Math.PI / 2, spread: 0.9, size: [0.2, 0.35], grow: 0.6, color: 0xffffff, color2: 0x9fe3ff, alpha: [1, 0], gravity: 16, drag: 1 },
    ],
    ring: { radius: 1.6, color: 0xffffff, life: 0.5, blend: 'alpha', alpha: 0.8 },
  },
  land_dust: {
    emitters: [
      { count: 7, shape: 'puff', blend: 'alpha', life: [0.35, 0.6], speed: [1, 2.5], dir: Math.PI / 2, spread: 2.8, size: [0.15, 0.28], grow: 1.8, color: 'terrain', color2: 0xf2ebe0, colorJitter: 0.5, alpha: [0.9, 0], drag: 4 },
    ],
  },
  step_dust: {
    emitters: [
      { count: 2, shape: 'puff', blend: 'alpha', life: [0.3, 0.5], speed: [0.3, 1], dir: Math.PI / 2, spread: 2.0, size: [0.08, 0.14], grow: 2.0, color: 'terrain', color2: 0xf2ebe0, colorJitter: 0.5, alpha: [0.8, 0], drag: 3 },
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
  // trail puffs are emitted continuously by core/projectiles.js using def.trail.puff (an Emitter)
};
