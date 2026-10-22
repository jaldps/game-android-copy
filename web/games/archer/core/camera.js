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
  const aspect = R.camera.aspect;
  const w = Math.abs(ax - bx) + 10, h = Math.abs(ay - by) + 9;
  lookAt((ax + bx) / 2, (ay + by) / 2 + 1.0, clamp(Math.max(h, w / aspect, minH), minH, 46), rate);
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
  ty = clamp(ty, cam.minY + H * 0.5, cam.maxY - H * 0.5);
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
