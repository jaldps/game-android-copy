// Minimal synchronous event bus. The core emits; specialists subscribe (see MODULES.md "Events").
const map = new Map();
export const events = {
  on(name, fn) { let s = map.get(name); if (!s) map.set(name, (s = new Set())); s.add(fn); return () => s.delete(fn); },
  off(name, fn) { map.get(name)?.delete(fn); },
  emit(name, a, b, c, d) {
    const s = map.get(name); if (!s) return;
    for (const fn of s) { try { fn(a, b, c, d); } catch (e) { console.error('[event ' + name + ']', e); } }
  },
};
