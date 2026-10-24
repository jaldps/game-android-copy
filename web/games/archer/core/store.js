// localStorage wrapper. Every key is namespaced under "archer." (brief requirement).
const PREFIX = 'archer.';
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* private mode */ } },
};
