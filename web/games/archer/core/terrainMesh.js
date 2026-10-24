// Chunked mesher: turns the Terrain density field into chunky extruded 3D.
//  - cap   (aInfo.x = 0): the front face at z=DEPTH.front, filled by marching squares (deep runs greedily merged)
//  - wall  (aInfo.x = 1): the contour extruded back along -z, with a small chamfer (bevel) at the front edge
//  - drape (aInfo.x = 2): a scalloped grass/snow overhang hanging over the front edge of upward-facing surfaces
// Vertex attributes: position, normal, aInfo = (kind, depthBelowSurface | drapeV, materialId).
// Geometry is in world space. Only chunks marked dirty are rebuilt (after carve), reusing their GPU buffers.
import * as THREE from 'three';
import { CHUNK_COLS, DEPTH } from './config.js';

const DEPTH_CLAMP = 3.0;
let P = new Float32Array(1 << 16), N = new Float32Array(1 << 16), I = new Float32Array(1 << 16), vc = 0;
function ensure(extra) {
  const need = (vc + extra) * 3;
  if (need <= P.length) return;
  let n = P.length; while (n < need) n *= 2;
  const p = new Float32Array(n), q = new Float32Array(n), r = new Float32Array(n);
  p.set(P); q.set(N); r.set(I); P = p; N = q; I = r;
}
function v(x, y, z, nx, ny, nz, kind, depth, mat) {
  const o = vc * 3;
  P[o] = x; P[o + 1] = y; P[o + 2] = z; N[o] = nx; N[o + 1] = ny; N[o + 2] = nz; I[o] = kind; I[o + 1] = depth; I[o + 2] = mat; vc++;
}

// per-cell polygon scratch
const px = new Float32Array(8), py = new Float32Array(8), pd = new Float32Array(8), pe = new Uint8Array(8);
const nrm = { x: 0, y: 1 };

export class TerrainMesh {
  constructor(terrain, material, parent) {
    this.t = terrain; this.material = material; this.group = new THREE.Group(); this.group.name = 'terrain';
    parent.add(this.group);
    this.depth = new Float32Array(terrain.nx * terrain.ny);
    this.meshes = [];
    for (let k = 0; k < terrain.chunks; k++) {
      const g = new THREE.BufferGeometry();
      const m = new THREE.Mesh(g, material); m.castShadow = true; m.receiveShadow = true; m.visible = false;
      const x0 = terrain.x0 + k * CHUNK_COLS * terrain.cell, w = CHUNK_COLS * terrain.cell, h = terrain.y1 - terrain.y0;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(x0 + w / 2, terrain.y0 + h / 2, 0), Math.hypot(w, h, DEPTH.front - DEPTH.back) / 2 + 1);
      m.userData.cap = 0; this.meshes.push(m); this.group.add(m);
    }
  }
  setMaterial(mat) { this.material = mat; for (const m of this.meshes) m.material = mat; }
  /** Rebuild dirty chunks. Returns number rebuilt. */
  update() {
    const t = this.t; let n = 0;
    for (let k = 0; k < t.chunks; k++) if (t.dirty[k]) { t.dirty[k] = 0; this.build(k); n++; }
    return n;
  }
  _depthCols(i0, i1) {
    const t = this.t, d = t.d, nx = t.nx, D = this.depth, c = t.cell;
    for (let i = i0; i <= i1; i++) {
      let run = 0;
      for (let j = t.ny - 1; j >= 0; j--) { const k = j * nx + i; if (d[k] < 128) run = 0; else run += c; D[k] = Math.min(run, DEPTH_CLAMP); }
    }
  }
  build(k) {
    const t = this.t, d = t.d, M = t.m, nx = t.nx, c = t.cell, D = this.depth;
    const ci0 = k * CHUNK_COLS, ci1 = Math.min(t.cols, ci0 + CHUNK_COLS) - 1;
    this._depthCols(Math.max(0, ci0), Math.min(nx - 1, ci1 + 1));
    vc = 0;
    const zf = DEPTH.front, zb = DEPTH.back, bev = DEPTH.bevel, zm = zf - bev, zd = zf + 0.07;
    for (let j = 0; j < t.rows; j++) {
      const y0 = t.y0 + j * c;
      let runStart = -1, runMat = 0, runDepth = 0;
      for (let i = ci0; i <= ci1 + 1; i++) {
        let full = false;
        const k0 = j * nx + i, k1 = k0 + 1, k2 = k0 + nx + 1, k3 = k0 + nx;
        if (i <= ci1) {
          const a = d[k0] >= 128, b = d[k1] >= 128, e = d[k2] >= 128, f = d[k3] >= 128;
          full = a && b && e && f;
          if (full) {
            const md = M[k0], dd = D[k3];
            if (runStart >= 0 && (md !== runMat || dd !== runDepth || D[k0] !== D[k0 - (i - runStart)])) { this._quad(runStart, i, j, runMat); runStart = -1; }
            if (runStart < 0) { runStart = i; runMat = md; runDepth = dd; }
            continue;
          }
        }
        if (runStart >= 0) { this._quad(runStart, i, j, runMat); runStart = -1; }
        if (i > ci1) break;
        // ---- partial cell: polygon walk c0 e0 c1 e1 c2 e2 c3 e3 (CCW, solid on the left) ----
        const ks = [k0, k1, k2, k3];
        let cnt = 0, mat = -1;
        for (let q = 0; q < 4; q++) {
          const ka = ks[q], kb = ks[(q + 1) & 3], va = d[ka], vb = d[kb], ina = va >= 128, inb = vb >= 128;
          const ax = t.x0 + (i + (q === 1 || q === 2 ? 1 : 0)) * c, ay = y0 + (q >= 2 ? c : 0);
          const bq = (q + 1) & 3, bx = t.x0 + (i + (bq === 1 || bq === 2 ? 1 : 0)) * c, by = y0 + (bq >= 2 ? c : 0);
          if (ina) { px[cnt] = ax; py[cnt] = ay; pd[cnt] = D[ka]; pe[cnt] = 0; cnt++; if (mat < 0) mat = M[ka]; }
          if (ina !== inb) {
            const tt = Math.min(1, Math.max(0, (127.5 - va) / (vb - va)));
            px[cnt] = ax + (bx - ax) * tt; py[cnt] = ay + (by - ay) * tt; pd[cnt] = 0; pe[cnt] = 1; cnt++;
          }
        }
        if (cnt < 3) continue;
        // inset cap edge points for the bevel, then fan-triangulate the cap
        ensure(cnt * 3 + 64);
        for (let q = 0; q < cnt; q++) if (pe[q]) { t.normal(px[q], py[q], nrm); px[q] -= nrm.x * bev; py[q] -= nrm.y * bev; }
        for (let q = 1; q < cnt - 1; q++) {
          v(px[0], py[0], zf, 0, 0, 1, 0, pd[0], mat); v(px[q], py[q], zf, 0, 0, 1, 0, pd[q], mat); v(px[q + 1], py[q + 1], zf, 0, 0, 1, 0, pd[q + 1], mat);
        }
        // contour segments: consecutive edge points (restore un-inset positions)
        for (let q = 0; q < cnt; q++) {
          const r = (q + 1) % cnt; if (!pe[q] || !pe[r]) continue;
          t.normal(px[q], py[q], nrm); const anx = nrm.x, any = nrm.y, ax = px[q] + anx * bev, ay = py[q] + any * bev;
          t.normal(px[r], py[r], nrm); const bnx = nrm.x, bny = nrm.y, bx = px[r] + bnx * bev, by = py[r] + bny * bev;
          this._wall(ax, ay, anx, any, bx, by, bnx, bny, mat, zf, zm, zb, bev, zd);
        }
      }
    }
    this._commit(k);
  }
  _quad(i0, i1, j, mat) { // merged run of full cells [i0, i1)
    const t = this.t, c = t.cell, D = this.depth, nx = t.nx, zf = DEPTH.front;
    const xa = t.x0 + i0 * c, xb = t.x0 + i1 * c, ya = t.y0 + j * c, yb = ya + c;
    const da = D[j * nx + i0], db = D[j * nx + i1], dc = D[(j + 1) * nx + i1], dd = D[(j + 1) * nx + i0];
    ensure(6);
    v(xa, ya, zf, 0, 0, 1, 0, da, mat); v(xb, ya, zf, 0, 0, 1, 0, db, mat); v(xb, yb, zf, 0, 0, 1, 0, dc, mat);
    v(xa, ya, zf, 0, 0, 1, 0, da, mat); v(xb, yb, zf, 0, 0, 1, 0, dc, mat); v(xa, yb, zf, 0, 0, 1, 0, dd, mat);
  }
  _wall(ax, ay, anx, any, bx, by, bnx, bny, mat, zf, zm, zb, bev, zd) {
    ensure(30);
    // chamfer (front ring F inset, mid ring M at the contour)
    const fax = ax - anx * bev, fay = ay - any * bev, fbx = bx - bnx * bev, fby = by - bny * bev;
    let l = 1 / Math.hypot(anx * 0.6, any * 0.6, 0.8); const fan = [anx * 0.6 * l, any * 0.6 * l, 0.8 * l];
    l = 1 / Math.hypot(bnx * 0.6, bny * 0.6, 0.8); const fbn = [bnx * 0.6 * l, bny * 0.6 * l, 0.8 * l];
    l = 1 / Math.hypot(anx, any, 0.35); const man = [anx * l, any * l, 0.35 * l];
    l = 1 / Math.hypot(bnx, bny, 0.35); const mbn = [bnx * l, bny * l, 0.35 * l];
    v(fax, fay, zf, fan[0], fan[1], fan[2], 1, 0, mat); v(ax, ay, zm, man[0], man[1], man[2], 1, 0, mat); v(bx, by, zm, mbn[0], mbn[1], mbn[2], 1, 0, mat);
    v(fax, fay, zf, fan[0], fan[1], fan[2], 1, 0, mat); v(bx, by, zm, mbn[0], mbn[1], mbn[2], 1, 0, mat); v(fbx, fby, zf, fbn[0], fbn[1], fbn[2], 1, 0, mat);
    // wall
    v(ax, ay, zm, anx, any, 0, 1, 0, mat); v(ax, ay, zb, anx, any, 0, 1, 0, mat); v(bx, by, zb, bnx, bny, 0, 1, 0, mat);
    v(ax, ay, zm, anx, any, 0, 1, 0, mat); v(bx, by, zb, bnx, bny, 0, 1, 0, mat); v(bx, by, zm, bnx, bny, 0, 1, 0, mat);
    // grass/snow drape over the front edge of upward-facing surfaces (not on brick/wood/metal)
    const sny = (any + bny) * 0.5;
    if (sny > 0.42 && (mat === 0 || mat === 5 || mat === 3)) {
      const ha = drapeH(ax) * Math.min(1, (any - 0.3) * 2.2), hb = drapeH(bx) * Math.min(1, (bny - 0.3) * 2.2);
      const lift = 0.035;
      // front hanging strip
      v(ax, ay + lift, zd, 0, 0.35, 0.94, 2, 0, mat); v(ax, ay - ha, zd, 0, 0, 1, 2, 1, mat); v(bx, by - hb, zd, 0, 0, 1, 2, 1, mat);
      v(ax, ay + lift, zd, 0, 0.35, 0.94, 2, 0, mat); v(bx, by - hb, zd, 0, 0, 1, 2, 1, mat); v(bx, by + lift, zd, 0, 0.35, 0.94, 2, 0, mat);
      // top roll covering the chamfer
      v(ax, ay + lift, zm - 0.12, anx, any, 0, 2, 0, mat); v(ax, ay + lift, zd, 0, 0.6, 0.8, 2, 0, mat); v(bx, by + lift, zd, 0, 0.6, 0.8, 2, 0, mat);
      v(ax, ay + lift, zm - 0.12, anx, any, 0, 2, 0, mat); v(bx, by + lift, zd, 0, 0.6, 0.8, 2, 0, mat); v(bx, by + lift, zm - 0.12, bnx, bny, 0, 2, 0, mat);
    }
  }
  _commit(k) {
    const mesh = this.meshes[k], g = mesh.geometry, n = vc;
    mesh.visible = n > 0;
    if (!n) { g.setDrawRange(0, 0); return; }
    if (mesh.userData.cap < n) {
      const cap = Math.ceil(n * 1.35);
      const mk = (src) => { const a = new Float32Array(cap * 3); a.set(src.subarray(0, n * 3)); return new THREE.BufferAttribute(a, 3).setUsage(THREE.DynamicDrawUsage); };
      for (const name of ['position', 'normal', 'aInfo']) if (g.getAttribute(name)) g.deleteAttribute(name);
      g.setAttribute('position', mk(P)); g.setAttribute('normal', mk(N)); g.setAttribute('aInfo', mk(I));
      mesh.userData.cap = cap; g.dispose(); // drop old GPU buffers; they are re-created on next render
    } else {
      for (const [name, src] of [['position', P], ['normal', N], ['aInfo', I]]) {
        const at = g.getAttribute(name); at.array.set(src.subarray(0, n * 3)); at.clearUpdateRanges(); at.addUpdateRange(0, n * 3); at.needsUpdate = true;
      }
    }
    g.setDrawRange(0, n);
  }
}

// Scalloped overhang height as a function of x (continuous across segments and chunks)
function drapeH(x) {
  const s = Math.abs(Math.sin(x * 3.1 + Math.sin(x * 0.73) * 2.0));
  return 0.16 + 0.26 * s * s + 0.08 * Math.sin(x * 11.7);
}
