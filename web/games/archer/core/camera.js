// Side-view camera rig with slight perspective. Owns framing (actor / projectile / pair / free pan),
// smooth damping, shake and punch-zoom. Callers only set intents; update() writes the THREE camera.
import * as THREE from 'three';
import { R, followShadows } from './render.js';
import { clamp, damp } from './util.js';
import { FIELD } from './config.js';

const PITCH = 7 * Math.PI / 180;          // looks slightly down so grass tops read as 3D strips

export const cam = {
  x: 0, y: 4, h: 20,                       // current centre + visible world height at z=0
  tx: 0, ty: 4, th: 20,                    // targets
  rate: 3.2, zoomRate: 2.2,
  shake: 0, punch: 0, panX: 0, panY: 0,    // panX/Y = player free-look offset
  minY: -10, maxY: 30, minX: FIELD.x0 + 6, maxX: FIELD.x0 + FIELD.width - 6,
  menuDrift: false,
  // Flight constraint (set every flight frame by match.js, cleared otherwise): after damping, the camera is nudged and
  // zoomed out just enough that the arrow (ax, ay) sits inside KEEP.arrow and, when hasB, the anchor archer (bx, feet by0,
  // head by1) inside KEEP.archer. This is a hard guarantee on top of the smooth target, so a high lob can never leave
  // the view or slide under the HUD while the damped zoom catches up.
  keep: { on: false, ax: 0, ay: 0, hasB: false, bx: 0, by0: 0, by1: 0 },
};

export function setBounds(minX, maxX, minY, maxY) { cam.minX = minX; cam.maxX = maxX; cam.minY = minY; cam.maxY = maxY; }
export function snap() { cam.x = cam.tx; cam.y = cam.ty; cam.h = cam.th; }
export function lookAt(x, y, h, rate = 3.2) { cam.tx = x; cam.ty = y; if (h) cam.th = h; cam.rate = rate; }
export function addShake(a) { cam.shake = Math.min(1.6, cam.shake + a); }
export function addPunch(a) { cam.punch = Math.min(0.25, cam.punch + a); }
/** Frame two points (e.g. shooter + target) with margins. */
export function frame2(ax, ay, bx, by, rate = 2.4, minH = 16) {
  frameBox(Math.min(ax, bx) - 2, Math.min(ay, by) - 0.5, Math.max(ax, bx) + 2, Math.max(ay, by) + 2.5, rate, minH, 46);
}

/** The part of the screen the HUD leaves free (fractions of the viewport, y down). Top cluster ~15%, control strip
 *  from ~81% down. Framing keeps every actor's feet above SAFE.bottom. */
export const SAFE = { top: 0.16, bottom: 0.79, left: 0.04, right: 0.96 };
/** Visible height needed to fit a world box inside the safe region. */
export function boxHeight(x0, y0, x1, y1) {
  const aspect = R.camera.aspect;
  return Math.max((y1 - y0) / (SAFE.bottom - SAFE.top), (x1 - x0) / ((SAFE.right - SAFE.left) * aspect));
}
/** Camera centre-y that puts world height `y` at screen fraction `frac` (0 top .. 1 bottom) for visible height H. */
export const cyFor = (y, frac, H) => y + (frac - 0.5) * H;
/** Frame a world box inside the HUD-safe region (zooming out up to maxH; if it still doesn't fit, centred). */
export function frameBox(x0, y0, x1, y1, rate = 3, minH = 10, maxH = 40) {
  const H = clamp(boxHeight(x0, y0, x1, y1), minH, maxH);
  const mid = (SAFE.top + SAFE.bottom) / 2;
  lookAt((x0 + x1) / 2, cyFor((y0 + y1) / 2, mid, H), H, rate);
  return H;
}
/** Picture-in-picture view of a world point (drawn by render.js, framed by the HUD). */
export function setInset(on, x = 0, y = 0, h = 7) {
  const I = R.inset; if (!I) return;
  I.on = on; if (on) { I.x = x; I.y = y; I.h = h; }
}

let t = 0;
const tmp = new THREE.Vector3();
/** Screen-fraction boxes the flight constraint enforces (x from the left, y from the top). The arrow box clears the
 *  top HUD cluster (timer/turn strip, WIND, minimap end at ~15%) and the control strip / HOLD (from ~78%). */
export const KEEP = { arrow: { x0: 0.08, x1: 0.92, y0: 0.2, y1: 0.7 }, archer: { x0: 0.05, x1: 0.95, y0: 0.07, y1: 0.74 } };
const FLIGHT_MAX_H = 80;
// 1-D fit: points p[i] with screen-fraction ranges [lo[i], hi[i]] (fraction grows with +p). Returns the minimum span S
// (world units across the screen) so all fit, and writes the allowed centre range into _rng.
const _fp = new Float32Array(6), _flo = new Float32Array(6), _fhi = new Float32Array(6), _rng = { a: 0, b: 0 };
function _fitSpan(n) {
  let S = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && _fp[i] > _fp[j]) S = Math.max(S, (_fp[i] - _fp[j]) / Math.max(0.05, _fhi[i] - _flo[j]));
  return S;
}
function _centreRange(n, S) {
  let a = -1e9, b = 1e9;
  for (let i = 0; i < n; i++) { a = Math.max(a, _fp[i] - S * (_fhi[i] - 0.5)); b = Math.min(b, _fp[i] - S * (_flo[i] - 0.5)); }
  _rng.a = a; _rng.b = b; return _rng;
}
function _applyKeep(aspect) {
  const K = cam.keep, A = KEEP.arrow, B = KEEP.archer;
  for (let pass = 0; pass < 2; pass++) {
    const useB = K.hasB && pass === 0;
    // x axis
    let n = 0; _fp[n] = K.ax; _flo[n] = A.x0; _fhi[n++] = A.x1;
    if (useB) { _fp[n] = K.bx; _flo[n] = B.x0; _fhi[n++] = B.x1; }
    const Hx = _fitSpan(n) / aspect;
    // y axis (screen fraction grows downward, so fit -y)
    let m = 0; _fp[m] = -K.ay; _flo[m] = A.y0; _fhi[m++] = A.y1;
    if (useB) { _fp[m] = -K.by1; _flo[m] = B.y0; _fhi[m++] = B.y1; _fp[m] = -K.by0; _flo[m] = B.y0; _fhi[m++] = B.y1; }
    const Hy = _fitSpan(m);
    const need = Math.max(Hx, Hy);
    if (useB && need > FLIGHT_MAX_H) continue;          // cannot show both: the arrow wins
    if (need > cam.h) cam.h = Math.min(FLIGHT_MAX_H, need);
    // x: _fitSpan/_centreRange for the x-axis points
    n = 0; _fp[n] = K.ax; _flo[n] = A.x0; _fhi[n++] = A.x1;
    if (useB) { _fp[n] = K.bx; _flo[n] = B.x0; _fhi[n++] = B.x1; }
    let r = _centreRange(n, cam.h * aspect); if (r.a <= r.b) cam.x = clamp(cam.x, r.a, r.b); else cam.x = (r.a + r.b) / 2;
    m = 0; _fp[m] = -K.ay; _flo[m] = A.y0; _fhi[m++] = A.y1;
    if (useB) { _fp[m] = -K.by1; _flo[m] = B.y0; _fhi[m++] = B.y1; _fp[m] = -K.by0; _flo[m] = B.y0; _fhi[m++] = B.y1; }
    r = _centreRange(m, cam.h); const ny = -cam.y; const cy = r.a <= r.b ? clamp(ny, r.a, r.b) : (r.a + r.b) / 2; cam.y = -cy;
    return;
  }
}

/**
 * Flight framing helper: the smallest visible height that shows the arrow's swept box (ax0..ax1, ay0..ay1) inside
 * KEEP.arrow and an archer (x bx, feet by0, head by1) inside KEEP.archer, plus the allowed camera-centre ranges for it.
 * Pass bx = NaN for no archer. Writes out.h, out.x0/x1, out.y0/y1 (centre ranges) and returns out.h.
 */
export function flightFit(ax0, ax1, ay0, ay1, bx, by0, by1, out) {
  const aspect = R.camera.aspect, A = KEEP.arrow, B = KEEP.archer, hasB = !isNaN(bx);
  let n = 0; _fp[n] = ax0; _flo[n] = A.x0; _fhi[n++] = A.x1; _fp[n] = ax1; _flo[n] = A.x0; _fhi[n++] = A.x1;
  if (hasB) { _fp[n] = bx - 0.5; _flo[n] = B.x0; _fhi[n++] = B.x1; _fp[n] = bx + 0.5; _flo[n] = B.x0; _fhi[n++] = B.x1; }
  const Hx = _fitSpan(n) / aspect;
  let m = 0; _fp[m] = -ay1; _flo[m] = A.y0; _fhi[m++] = A.y1; _fp[m] = -ay0; _flo[m] = A.y0; _fhi[m++] = A.y1;
  if (hasB) { _fp[m] = -by1; _flo[m] = B.y0; _fhi[m++] = B.y1; _fp[m] = -by0; _flo[m] = B.y0; _fhi[m++] = B.y1; }
  const Hy = _fitSpan(m);
  out.h = Math.max(Hx, Hy);
  out.n = n; out.m = m; out.hasB = hasB;
  return out.h;
}
/** Centre ranges (out.x0..x1, out.y0..y1) that keep the flightFit() set framed at visible height H. */
export function flightRange(ax0, ax1, ay0, ay1, bx, by0, by1, H, out) {
  const aspect = R.camera.aspect, A = KEEP.arrow, B = KEEP.archer, hasB = !isNaN(bx);
  let n = 0; _fp[n] = ax0; _flo[n] = A.x0; _fhi[n++] = A.x1; _fp[n] = ax1; _flo[n] = A.x0; _fhi[n++] = A.x1;
  if (hasB) { _fp[n] = bx - 0.5; _flo[n] = B.x0; _fhi[n++] = B.x1; _fp[n] = bx + 0.5; _flo[n] = B.x0; _fhi[n++] = B.x1; }
  let r = _centreRange(n, H * aspect); out.x0 = r.a; out.x1 = r.b;
  let m = 0; _fp[m] = -ay1; _flo[m] = A.y0; _fhi[m++] = A.y1; _fp[m] = -ay0; _flo[m] = A.y0; _fhi[m++] = A.y1;
  if (hasB) { _fp[m] = -by1; _flo[m] = B.y0; _fhi[m++] = B.y1; _fp[m] = -by0; _flo[m] = B.y0; _fhi[m++] = B.y1; }
  r = _centreRange(m, H); out.y0 = -r.b; out.y1 = -r.a;
  return out;
}

export function updateCamera(dt) {
  t += dt;
  const aspect = R.camera.aspect, free = cam.keep.on;
  // in flight the arena bounds loosen (a high lob may climb above the usual ceiling or overshoot the side)
  const H = clamp(cam.th, 8, free ? FLIGHT_MAX_H : 50), W = H * aspect;
  const minX = free ? cam.minX - 20 : cam.minX, maxX = free ? cam.maxX + 20 : cam.maxX, maxY = free ? cam.maxY + 40 : cam.maxY;
  let tx = cam.tx + cam.panX, ty = cam.ty + cam.panY;
  tx = clamp(tx, minX + W * 0.5, maxX - W * 0.5);
  if (maxX - minX < W) tx = (minX + maxX) / 2;
  // the bottom ~20% of the screen sits under the control strip, so the camera may look a little below the arena floor
  ty = clamp(ty, cam.minY + H * 0.3, Math.max(cam.minY + H * 0.3, maxY - H * 0.5));
  cam.x = damp(cam.x, tx, cam.rate, dt); cam.y = damp(cam.y, ty, cam.rate, dt); cam.h = damp(cam.h, H, cam.zoomRate, dt);
  if (free) _applyKeep(aspect);
  cam.punch = damp(cam.punch, 0, 6, dt);
  const h = cam.h * (1 - cam.punch);
  const fov = R.camera.fov * Math.PI / 180, d = h / (2 * Math.tan(fov / 2));
  let sx = 0, sy = 0;
  if (cam.shake > 0.001) {
    const s = cam.shake * cam.shake * 0.45;
    sx = (Math.sin(t * 71.3) + Math.sin(t * 43.1)) * s; sy = (Math.sin(t * 59.7) + Math.cos(t * 37.9)) * s;
    cam.shake = Math.max(0, cam.shake - dt * 2.2);
  }
  let ox = 0;
  if (cam.menuDrift) ox = Math.sin(t * 0.13) * 3;
  R.camera.position.set(cam.x + sx + ox, cam.y + sy + Math.sin(PITCH) * d, Math.cos(PITCH) * d);
  tmp.set(cam.x + sx + ox, cam.y + sy, 0); R.camera.lookAt(tmp);
  R.camera.near = Math.max(1, d * 0.3); R.camera.far = d + 700; R.camera.updateProjectionMatrix();
  followShadows(cam.x, cam.y, cam.h * aspect * 0.5 + 2);
}

/** World (x,y,z) -> CSS pixel coordinates. Writes out.x/out.y/out.vis (in front of the camera & on screen). */
const pv = new THREE.Vector3();
export function project(x, y, z, out) {
  pv.set(x, y, z).project(R.camera);
  out.x = (pv.x * 0.5 + 0.5) * window.innerWidth; out.y = (-pv.y * 0.5 + 0.5) * window.innerHeight;
  out.vis = pv.z < 1 && pv.x > -1 && pv.x < 1 && pv.y > -1 && pv.y < 1;
  out.nx = pv.x; out.ny = pv.y;
  return out;
}
/** CSS pixel -> world point on the z=0 plane. */
const ray = new THREE.Vector3();
export function unproject(sx, sy, out) {
  ray.set(sx / window.innerWidth * 2 - 1, -(sy / window.innerHeight) * 2 + 1, 0.5).unproject(R.camera).sub(R.camera.position).normalize();
  const k = -R.camera.position.z / ray.z;
  out.x = R.camera.position.x + ray.x * k; out.y = R.camera.position.y + ray.y * k;
  return out;
}
