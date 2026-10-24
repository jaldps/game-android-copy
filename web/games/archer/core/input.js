// Raw input state (touch/mouse/keyboard) + the human turn controller that maps it to match intents.
import { unproject, cam } from './camera.js';
import { audio } from './audio.js';
import { DEG, clamp } from './util.js';

export const input = {
  left: false, right: false, angUp: false, angDown: false, fire: false, arrowPick: null, skip: false,
  angSteps: 0,            // pending whole-degree steps from taps on the angle buttons
  angHold: 0, angHoldT: 0, angRepT: 0,   // angle button held: direction, held time, repeat accumulator
  holds: new Set(),       // release callbacks of every held on-screen button (cleared at turn start)
  ptr: { down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, mode: null, lx: 0, ly: 0 },
  enabled: true,
};

export function bindInput(canvas, onPause) {
  const P = input.ptr;
  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    if (P.down) return;
    P.down = true; P.id = e.pointerId; P.x = P.sx = P.lx = e.clientX; P.y = P.sy = P.ly = e.clientY; P.mode = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => { if (P.down && e.pointerId === P.id) { P.x = e.clientX; P.y = e.clientY; } });
  const up = (e) => { if (e.pointerId === P.id) { P.down = false; P.mode = null; P.id = -1; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
  const key = (down) => (e) => {
    if (e.repeat && down) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = down; break;
      case 'ArrowRight': case 'KeyD': input.right = down; break;
      case 'ArrowUp': case 'KeyW': input.angUp = down; break;
      case 'ArrowDown': case 'KeyS': input.angDown = down; break;
      case 'Space': input.fire = down; e.preventDefault(); break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': if (down) input.arrowPick = +e.code.slice(5) - 1; break;
      case 'Escape': case 'KeyP': if (down) onPause?.(); break;
      default: return;
    }
    audio.unlock();
  };
  window.addEventListener('keydown', key(true)); window.addEventListener('keyup', key(false));
}

/** Press-and-hold button binding (pointer). Releases on every way a touch can end, including leaving the button, so a
 *  button can never stay stuck "held"; releaseAll() (turn start) clears whatever is still down. */
export function holdButton(el, onChange) {
  let id = -1;
  const release = () => { if (id === -1) return; id = -1; el.classList.remove('held'); input.holds.delete(release); onChange(false); };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); audio.unlock();
    if (id !== -1) return;
    id = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.classList.add('held'); input.holds.add(release); onChange(true);
  });
  const end = (e) => { if (e.pointerId === id) release(); };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) el.addEventListener(ev, end);
  el.addEventListener('touchend', release); el.addEventListener('touchcancel', release);
  window.addEventListener('pointerup', end, true); window.addEventListener('blur', release);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
/** Angle button: a tap is exactly one 1° step; holding repeats after 250 ms. */
export function stepButton(el, dir) {
  holdButton(el, (v) => {
    if (v) { input.angSteps += dir; input.angHold = dir; input.angHoldT = 0; input.angRepT = 0; }
    else if (input.angHold === dir) input.angHold = 0;
  });
}
/** Drop every held on-screen button and pending step (called when a turn starts). */
export function releaseAll() {
  for (const r of [...input.holds]) r();
  input.left = input.right = input.fire = input.angUp = input.angDown = false;
  input.angSteps = 0; input.angHold = 0; input.arrowPick = null;
}
const REPEAT_DELAY = 0.25, REPEAT_RATE = 18;   // s before auto-repeat, steps per second while held

const wp = { x: 0, y: 0 };
/** Human controller: the core calls update() each act-phase frame with the intent object to fill. */
export function createHumanController(trayIds) {
  return {
    kind: 'human',
    beginTurn() { releaseAll(); },
    update(dt, a, match, it) {
      if (!input.enabled) return;
      it.move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      // keyboard arrows: continuous; on-screen buttons: whole-degree steps (tap = 1°, hold repeats after 250 ms)
      it.aimDelta = ((input.angUp ? 1 : 0) - (input.angDown ? 1 : 0)) * 32 * dt;
      let steps = input.angSteps; input.angSteps = 0;
      if (input.angHold) {
        input.angHoldT += dt;
        if (input.angHoldT > REPEAT_DELAY) { input.angRepT += dt * REPEAT_RATE; while (input.angRepT >= 1) { input.angRepT -= 1; steps += input.angHold; } }
      }
      if (steps) { const cur = Math.round(a.angle); it.aimTo = clamp(cur + steps, -5, 90); }
      it.charge = input.fire;
      if (input.arrowPick !== null) { it.arrow = trayIds()[input.arrowPick] ?? null; input.arrowPick = null; }
      const P = input.ptr;
      if (P.down) {
        unproject(P.x, P.y, wp);
        if (P.mode === null) {
          unproject(P.sx, P.sy, wp);
          const near = Math.hypot(wp.x - a.x, wp.y - (a.y + 1.2)) < 3.2;
          P.mode = near ? 'aim' : (Math.hypot(P.x - P.sx, P.y - P.sy) > 8 ? 'pan' : null);
          unproject(P.x, P.y, wp);
        }
        if (P.mode === 'aim') {
          const dx = wp.x - a.x, dy = wp.y - (a.y + 1.4);
          if (Math.hypot(dx, dy) > 0.6) {
            const th = Math.atan2(dy, dx), facing = dx >= 0 ? 1 : -1, s = a.grounded ? a.slope(match.terrain) : 0;
            const rel = facing > 0 ? th - s : Math.PI + s - th;
            let deg = rel / DEG; while (deg > 180) deg -= 360; while (deg < -180) deg += 360;
            it.facing = facing; it.aimTo = clamp(Math.round(deg), -5, 90);   // whole degrees, so a later tap is exactly 1°
          }
        } else if (P.mode === 'pan') {
          const k = cam.h / window.innerHeight;
          cam.panX -= (P.x - P.lx) * k; cam.panY += (P.y - P.ly) * k;
          cam.panX = clamp(cam.panX, -60, 60); cam.panY = clamp(cam.panY, -15, 15);
        }
        P.lx = P.x; P.ly = P.y;
      }
      if (it.move || it.charge) { cam.panX *= 0.9; cam.panY *= 0.9; }
    },
  };
}
