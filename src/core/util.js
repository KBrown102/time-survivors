// core/util.js · 全局工具
export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => (a + Math.random() * (b - a + 1)) | 0;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export const now = () => performance.now();
// 秒数 → mm:ss
export const fmtTime = t => { const m = (t / 60) | 0, s = (t % 60) | 0; return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
