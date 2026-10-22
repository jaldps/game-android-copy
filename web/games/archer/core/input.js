// Raw input state (touch/mouse/keyboard) + the human turn controller that maps it to match intents.
import { unproject, cam } from './camera.js';
import { audio } from './audio.js';
import { DEG, clamp } from './util.js';

export const input = {
  left: false, right: false, angUp: false, angDown: false, fire: false, arrowPick: null, skip: false,
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

/** Hold-to-repeat button binding (pointer). */
export function holdButton(el, onChange) {
  const set = (v) => (e) => { e.preventDefault(); audio.unlock(); onChange(v); if (v) el.classList.add('held'); else el.classList.remove('held'); };
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } set(true)(e); });
  el.addEventListener('pointerup', set(false)); el.addEventListener('pointercancel', set(false)); el.addEventListener('lostpointercapture', set(false));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

const wp = { x: 0, y: 0 };
/** Human controller: the core calls update() each act-phase frame with the intent object to fill. */
export function createHumanController(trayIds) {
  return {
    kind: 'human',
    beginTurn() { input.fire = false; input.arrowPick = null; },
    update(dt, a, match, it) {
      if (!input.enabled) return;
      it.move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      it.aimDelta = ((input.angUp ? 1 : 0) - (input.angDown ? 1 : 0)) * 32 * dt;
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
            it.facing = facing; it.aimTo = clamp(deg, -5, 90);
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
