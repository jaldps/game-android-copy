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
export function updateCamera(dt) {
  t += dt;
  const aspect = R.camera.aspect;
  const H = clamp(cam.th, 8, 50), W = H * aspect;
  let tx = cam.tx + cam.panX, ty = cam.ty + cam.panY;
  tx = clamp(tx, cam.minX + W * 0.5, cam.maxX - W * 0.5);
  if (cam.maxX - cam.minX < W) tx = (cam.minX + cam.maxX) / 2;
  // the bottom ~20% of the screen sits under the control strip, so the camera may look a little below the arena floor
  ty = clamp(ty, cam.minY + H * 0.3, Math.max(cam.minY + H * 0.3, cam.maxY - H * 0.5));
  cam.x = damp(cam.x, tx, cam.rate, dt); cam.y = damp(cam.y, ty, cam.rate, dt); cam.h = damp(cam.h, H, cam.zoomRate, dt);
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
