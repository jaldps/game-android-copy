// Small math / RNG helpers shared by every module. Pure functions, no allocations.
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
/** Frame-rate independent exponential approach: move a toward b with rate k (1/s). */
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/** Deterministic PRNG (mulberry32). rng() -> [0,1). */
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

// Cheap value noise (1D / 2D) for generators and procedural shapes.
function hash1(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
function hash2(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return n - Math.floor(n); }
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i + seed * 17.13), hash1(i + 1 + seed * 17.13), u);
}
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), s = seed * 13.7;
  const a = hash2(ix + s, iy), b = hash2(ix + 1 + s, iy), c = hash2(ix + s, iy + 1), d = hash2(ix + 1 + s, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm1(x, seed = 0, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise1(x * f, seed + i) * amp; f *= 2.03; amp *= 0.5; }
  return v / (1 - Math.pow(0.5, oct));
}
export function fbm2(x, y, seed = 0, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += noise2(x * f, y * f, seed + i) * amp; f *= 2.03; amp *= 0.5; }
  return v / (1 - Math.pow(0.5, oct));
}

/** Angle helpers (radians). */
export const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
