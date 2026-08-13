// ui/dom.js · DOM 选择器 / 面板显隐 / 提示 / 顶部资源栏
import { G } from '../core/state.js';
import { loadSave } from '../config/index.js';

export const $ = id => document.getElementById(id);

export function show(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('show');
}
export function hide(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('show');
}

export function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  G.toastT = 2.2;
}

// 顶部资源栏（金币 / 时之结晶），常驻所有面板
export function updateTopres() {
  const s = loadSave();
  const g = $('res-gold'); if (g) g.textContent = s.gold;
  const m = $('res-mats'); if (m) m.textContent = s.mats;
}
