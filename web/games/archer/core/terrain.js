// Destructible terrain field: a 2D density grid (Uint8, 0..255 at grid nodes) + a material id per node.
// The mesh (terrainMesh.js) extrudes the 0.5 iso-contour into chunky 3D. Everything here is allocation-free
// after construction, so queries are safe to call every frame.
import { CELL, FIELD, CHUNK_COLS } from './config.js';
import { clamp, noise1 } from './util.js';

export const MAT = { ROCK: 0, BRICK: 1, WOOD: 2, ICE: 3, METAL: 4, SAND: 5 }; // shader material ids

export class Terrain {
  constructor() {
    this.cell = CELL;
    this.x0 = FIELD.x0; this.y0 = FIELD.y0;
    this.cols = Math.round(FIELD.width / CELL); this.rows = Math.round(FIELD.height / CELL);
    this.nx = this.cols + 1; this.ny = this.rows + 1;
    this.d = new Uint8Array(this.nx * this.ny);
    this.m = new Uint8Array(this.nx * this.ny);
    this.chunks = Math.ceil(this.cols / CHUNK_COLS);
    this.dirty = new Uint8Array(this.chunks);
    this.version = 0;
    this.x1 = this.x0 + this.cols * CELL; this.y1 = this.y0 + this.rows * CELL;
  }
  clear() { this.d.fill(0); this.m.fill(0); this.markAllDirty(); }
  markAllDirty() { this.dirty.fill(1); this.version++; }

  // ---------- generation (call from map generators) ----------
  _range(x0, y0, x1, y1) {
    const c = this.cell;
    const i0 = clamp(Math.floor((x0 - this.x0) / c) - 1, 0, this.nx - 1), i1 = clamp(Math.ceil((x1 - this.x0) / c) + 1, 0, this.nx - 1);
    const j0 = clamp(Math.floor((y0 - this.y0) / c) - 1, 0, this.ny - 1), j1 = clamp(Math.ceil((y1 - this.y0) / c) + 1, 0, this.ny - 1);
    return [i0, j0, i1, j1];
  }
  /** Add solid where sdf(x,y) < 0 (sdf ~ signed distance in world units) inside the given bounds. */
  union(sdf, x0, y0, x1, y1, mat = MAT.ROCK) {
    const [i0, j0, i1, j1] = this._range(x0, y0, x1, y1), c = this.cell, d = this.d, m = this.m;
    for (let j = j0; j <= j1; j++) {
      const y = this.y0 + j * c;
      for (let i = i0; i <= i1; i++) {
        const k = j * this.nx + i, v = clamp(0.5 - sdf(this.x0 + i * c, y) / c, 0, 1) * 255 | 0;
        if (v > d[k]) { if (v >= 128 || d[k] < 128) m[k] = mat; d[k] = v; }
      }
    }
    this._dirtyCols(i0, i1);
  }
  /** Remove solid where sdf < 0. */
  subtract(sdf, x0, y0, x1, y1) {
    const [i0, j0, i1, j1] = this._range(x0, y0, x1, y1), c = this.cell, d = this.d;
    for (let j = j0; j <= j1; j++) {
      const y = this.y0 + j * c;
      for (let i = i0; i <= i1; i++) {
        const k = j * this.nx + i, v = clamp(0.5 + sdf(this.x0 + i * c, y) / c, 0, 1) * 255 | 0;
        if (v < d[k]) d[k] = v;
      }
    }
    this._dirtyCols(i0, i1);
  }
  /** Re-paint the material of existing solid where sdf < 0 (e.g. a brick facade on a rock core). */
  paint(sdf, x0, y0, x1, y1, mat) {
    const [i0, j0, i1, j1] = this._range(x0, y0, x1, y1), c = this.cell;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (sdf(this.x0 + i * c, this.y0 + j * c) < 0) this.m[j * this.nx + i] = mat;
    }
    this._dirtyCols(i0, i1);
  }
  _dirtyCols(i0, i1) {
    const a = clamp(Math.floor((i0 - 1) / CHUNK_COLS), 0, this.chunks - 1), b = clamp(Math.floor((i1 + 1) / CHUNK_COLS), 0, this.chunks - 1);
    for (let k = a; k <= b; k++) this.dirty[k] = 1;
    this.version++;
  }

  /** Blast a soft, slightly ragged circular crater. Returns true if anything was removed. */
  carve(x, y, r, seed = 0) {
    if (r <= 0) return false;
    const R = r * 1.12, [i0, j0, i1, j1] = this._range(x - R, y - R, x + R, y + R), c = this.cell, d = this.d;
    let any = false;
    for (let j = j0; j <= j1; j++) {
      const py = this.y0 + j * c - y;
      for (let i = i0; i <= i1; i++) {
        const px = this.x0 + i * c - x, k = j * this.nx + i;
        if (d[k] === 0) continue;
        const ang = Math.atan2(py, px), rr = r * (0.94 + 0.12 * noise1(ang * 2.2 + 3, seed));
        const v = clamp(0.5 + (Math.hypot(px, py) - rr) / c, 0, 1) * 255 | 0;
        if (v < d[k]) { d[k] = v; any = true; }
      }
    }
    if (any) this._dirtyCols(i0, i1);
    return any;
  }

  // ---------- queries ----------
  node(i, j) { return (i < 0 || j < 0 || i >= this.nx || j >= this.ny) ? 0 : this.d[j * this.nx + i]; }
  matAt(x, y) {
    const i = clamp(Math.round((x - this.x0) / this.cell), 0, this.nx - 1), j = clamp(Math.round((y - this.y0) / this.cell), 0, this.ny - 1);
    return this.m[j * this.nx + i];
  }
  /** Bilinear density in [0,1]. Outside the field = 0 (air). */
  density(x, y) {
    const fx = (x - this.x0) / this.cell, fy = (y - this.y0) / this.cell;
    const i = Math.floor(fx), j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= this.nx - 1 || j >= this.ny - 1) return 0;
    const tx = fx - i, ty = fy - j, n = this.nx, k = j * n + i, d = this.d;
    const a = d[k] + (d[k + 1] - d[k]) * tx, b = d[k + n] + (d[k + n + 1] - d[k + n]) * tx;
    return (a + (b - a) * ty) * (1 / 255);
  }
  solid(x, y) { return this.density(x, y) > 0.5; }

  /** Outward surface normal (points from solid to air). Writes {x,y} into out. */
  normal(x, y, out) {
    const h = this.cell * 0.9;
    let nx = this.density(x - h, y) - this.density(x + h, y), ny = this.density(x, y - h) - this.density(x, y + h);
    const l = Math.hypot(nx, ny);
    if (l < 1e-5) { out.x = 0; out.y = 1; } else { out.x = nx / l; out.y = ny / l; }
    return out;
  }

  /** First ground surface at or below y (scans down at most maxDrop). Returns NaN if none (a void below). */
  groundBelow(x, y, maxDrop = 1e9) {
    const step = this.cell * 0.5, yEnd = Math.max(this.y0, y - maxDrop);
    if (this.solid(x, y)) return y;
    let prev = y;
    for (let yy = y - step; yy >= yEnd; yy -= step) {
      if (this.solid(x, yy)) {
        let lo = yy, hi = prev;                       // lo solid, hi air
        for (let k = 0; k < 6; k++) { const mid = (lo + hi) * 0.5; if (this.solid(x, mid)) lo = mid; else hi = mid; }
        return hi;
      }
      prev = yy;
    }
    return NaN;
  }
  /** Highest air->solid transition in a column (NaN if the column is empty). */
  topAt(x) { return this.groundBelow(x, this.y1 - 0.01); }

  /** March a segment; on the first solid point writes out.x/out.y/out.t and returns true. */
  raycast(ax, ay, bx, by, out) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), steps = Math.max(1, Math.ceil(len / (this.cell * 0.5)));
    let pt = 0;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (this.solid(ax + dx * t, ay + dy * t)) {
        let lo = pt, hi = t;
        for (let k = 0; k < 6; k++) { const mid = (lo + hi) * 0.5; if (this.solid(ax + dx * mid, ay + dy * mid)) hi = mid; else lo = mid; }
        out.x = ax + dx * hi; out.y = ay + dy * hi; out.t = hi; return true;
      }
      pt = t;
    }
    return false;
  }
  /** Fraction of solid samples on a horizontal line (used for "is there a wall here" checks). */
  solidSpan(x, y0, y1) {
    const step = this.cell * 0.5; let n = 0, s = 0;
    for (let y = y0; y <= y1; y += step) { n++; if (this.solid(x, y)) s++; }
    return n ? s / n : 0;
  }
}
