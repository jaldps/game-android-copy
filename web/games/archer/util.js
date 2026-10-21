// util.js
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const deg = (r) => r * 180 / Math.PI;
export const rad = (d) => d * Math.PI / 180;
export function fmt(n){ return (n|0).toString(); }
export function smoothstep(a,b,x){ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
