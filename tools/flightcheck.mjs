// Bowbrawl flight-camera gate. Steps the real autoplay match + camera at 1/60 (like the critic's flight.js) and, for
// every projectile flight, samples ~10 frames evenly across it, projecting the lead arrow and every living archer to
// SCREEN space with the game's own three.js camera.
// A sample passes when
//   - the arrow is inside the safe rect (x 4..96%, y 12..80%) and outside the minimap / turn strip / WIND / HOLD rects,
//   - and at least one living archer is fully on screen (head..feet), with its feet above the bottom HUD strip.
// Usage: node tools/flightcheck.mjs [--port 8099] [--maps a,b] [--seeds 1,2,3] [--shots 4] [--min 95] [--worst 12]
// Exit code 1 if any map's pass rate is under --min percent.
import { chromium } from '/home/user/game-android-copy/node_modules/playwright-core/index.mjs';
import fs from 'fs';

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const port = opt('port', '8099');
const maps = opt('maps', 'sunspire,frostpeak,ruins,emberforge,neon').split(',');
const seeds = opt('seeds', '3,5,9,12,17,21').split(',').map(Number);
const shots = +opt('shots', 4), minPct = +opt('min', 95), worstN = +opt('worst', 12), perFlight = 10;
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

// Runs inside the page: one (map, seed) -> list of samples.
const PAGE_FN = async ({ shots, perFlight }) => {
  const C = await import('/games/archer/core/camera.js');
  const { R, insetRect } = await import('/games/archer/core/render.js');
  const ir = { x: 0, y: 0, w: 0, h: 0 };
  const g = window.__game, st = 1 / 60, W = window.innerWidth, H = window.innerHeight;
  const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 ? { n: sel, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } : null; };
  const boxes = ['.minimap', '.hud-top-left', '.hud-wind', '.fire'].map(rect).filter(Boolean);
  const strip = rect('.strip'); const stripTop = strip ? strip.y0 : H * 0.82;
  const out = { samples: [], flights: 0, boxes, stripTop, W, H, errors: [] };
  const o = { x: 0, y: 0 };
  const proj = (x, y) => { C.project(x, y, 0, o); return { x: o.x, y: o.y }; };
  let n = 0, flight = null, done = 0;
  const startMatch = g.match;
  while (n < 60 * 240 && done < shots) {
    const M = g.match; if (!M || M !== startMatch || M.phase === 'end') break;
    M.update(st); C.updateCamera(st); n++;
    R.camera.updateMatrixWorld(true);
    const inFlight = M.phase === 'flight' && M.projectiles.active > 0;
    if (inFlight) {
      if (!flight) flight = { t0: M.time, frames: [] };
      const p = M.projectiles.leader ? M.projectiles.leader() : null;
      if (p) {
        const ap = proj(p.x, p.y);
        let reason = '';
        if (ap.x < W * 0.04 || ap.x > W * 0.96 || ap.y < H * 0.12 || ap.y > H * 0.80) reason = `arrow outside safe rect (${(ap.x / W * 100).toFixed(0)}%,${(ap.y / H * 100).toFixed(0)}%)`;
        else for (const b of boxes) if (ap.x >= b.x0 && ap.x <= b.x1 && ap.y >= b.y0 && ap.y <= b.y1) { reason = 'arrow under ' + b.n; break; }
        if (!reason && R.inset && R.inset.on) { insetRect(R.inset.side, ir); if (ap.x >= ir.x && ap.x <= ir.x + ir.w && ap.y >= ir.y && ap.y <= ir.y + ir.h) reason = 'arrow under inset'; }
        let archer = false;
        for (const A of M.actors) {
          if (!A.alive) continue;
          const h = A.character.height || 2.6;
          const f = proj(A.x, A.y), hd = proj(A.x, A.y + h);
          if (f.x >= 0 && f.x <= W && hd.x >= 0 && hd.x <= W && hd.y >= 0 && f.y <= stripTop && f.y >= 0) { archer = true; break; }
        }
        if (!archer) reason += (reason ? '; ' : '') + 'no archer in main view';
        flight.frames.push({ t: +(M.time - flight.t0).toFixed(2), mt: +M.time.toFixed(2), ok: !reason, reason,
          ax: +(ap.x / W).toFixed(3), ay: +(ap.y / H).toFixed(3), camH: +C.cam.h.toFixed(1), py: +p.y.toFixed(1) });
      }
    } else if (flight) {
      const F = flight.frames; flight = null; done++; out.flights++;
      if (F.length) {
        const k = Math.min(perFlight, F.length);
        for (let i = 0; i < k; i++) { const s = F[Math.round(i * (F.length - 1) / Math.max(1, k - 1))]; s.flight = done; s.dur = F[F.length - 1].t; out.samples.push(s); }
      }
    }
  }
  out.frames = n;
  return out;
};

const results = {};
const worst = [];
for (const map of maps) {
  let pass = 0, total = 0, flights = 0; const hs = [];
  for (const seed of seeds) {
    const page = await browser.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/games/archer/index.html?autoplay=1&map=${map}&seed=${seed}&quality=low`, { waitUntil: 'load', timeout: 150000 });
    await page.waitForFunction(() => window.__game && window.__game.match && window.__game.match.phase, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    let r;
    try { r = await page.evaluate(PAGE_FN, { shots, perFlight }); } catch (e) { console.log(`  ${map} s${seed}: eval error ${e.message}`); await page.close(); continue; }
    for (const s of r.samples) { hs.push(s.camH); total++; if (s.ok) pass++; else worst.push({ map, seed, ...s }); }
    flights += r.flights; if (seed === seeds[0] && map === maps[0]) console.log('  HUD rects', JSON.stringify(r.boxes.map((b) => [b.n, Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1)])), 'stripTop', Math.round(r.stripTop), 'of', r.H);
    const sp = r.samples.filter((s) => s.ok).length;
    console.log(`  ${map.padEnd(10)} seed ${String(seed).padStart(3)}: ${sp}/${r.samples.length} samples ok over ${r.flights} flights${errs.length ? '  ERRORS: ' + errs.slice(0, 3).join(' | ') : ''}`);
    await page.close();
  }
  hs.sort((p, q) => p - q);
  results[map] = { pass, total, flights, pct: total ? pass / total * 100 : 0, hMed: hs[hs.length >> 1] ?? 0, h90: hs[Math.floor(hs.length * 0.9)] ?? 0, hMax: hs[hs.length - 1] ?? 0 };
}
await browser.close();

console.log('\nPer-map pass rate (bar ' + minPct + '%):');
let fail = false;
for (const [m, r] of Object.entries(results)) {
  const bad = r.pct < minPct || r.total === 0; fail = fail || bad;
  console.log(`  ${m.padEnd(10)} ${r.pct.toFixed(1).padStart(5)}%  (${r.pass}/${r.total} samples, ${r.flights} flights)  view height med/p90/max ${r.hMed}/${r.h90}/${r.hMax}  ${bad ? 'FAIL' : 'ok'}`);
}
const T = Object.values(results).reduce((s, r) => [s[0] + r.pass, s[1] + r.total], [0, 0]);
console.log(`  ALL        ${(T[1] ? T[0] / T[1] * 100 : 0).toFixed(1)}%  (${T[0]}/${T[1]})`);
if (worst.length) {
  console.log(`\nFailing samples (${worst.length}; first ${worstN} by reason severity):`);
  worst.sort((p, q) => (q.reason.includes(';') - p.reason.includes(';')) || (q.camH - p.camH));
  for (const w of worst.slice(0, worstN))
    console.log(`  ${w.map} seed ${w.seed} flight ${w.flight} t=${w.t}/${w.dur}s (match ${w.mt}s) camH=${w.camH} arrow=(${w.ax},${w.ay}) y=${w.py}: ${w.reason}`);
  const byReason = {};
  for (const w of worst) { const k = w.reason.replace(/\(.*?\)/g, '').trim(); byReason[k] = (byReason[k] || 0) + 1; }
  console.log('\nFailure reasons:', JSON.stringify(byReason));
}
process.exit(fail ? 1 : 0);
