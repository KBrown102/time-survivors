// config/save.js · 存档（金币 / 已激活技能等级 / 已通关 / 设置 / 累计统计）
export const SAVE_KEY = 'ts_save_v3';
export const SAVE_SLOTS = 3;

// 当前操作槽位（模块私有，外部经由 setSlot/getSlot 访问，避免跨模块重赋值绑定）
let currentSlot = 0;
export function setSlot(i) { currentSlot = i; }
export function getSlot() { return currentSlot; }

// 初始即解锁：3 攻击(连枷/线圈/飞镖) + 3 增益(力量/急速/领域) + 2 英雄(林肯/特斯拉)
export const DEFAULT_UNLOCKS = { flail:1, tesla:1, shuriken:1, p_might:1, p_haste:1, p_area:1, h_lincoln:1, h_tesla:1 };

export function defaultSave() {
  return { gold:0, unlocked:Object.assign({}, DEFAULT_UNLOCKS), slots:{atk:3,buff:3}, mats:0, cleared:[], settings:{}, stats:{}, createdAt:Date.now(), playTime:0 };
}
export function slotKey(slot) { return SAVE_KEY + '_' + slot; }
export function loadSave(slot) {
  slot = (slot === undefined ? currentSlot : slot);
  const key = slotKey(slot);
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s && typeof s === 'object') {
      const d = defaultSave();
      if ('gold' in s) d.gold = s.gold; else if ('points' in s) d.gold = s.points;   // 旧 v1/v2 仅保留金币
      if (Array.isArray(s.cleared)) d.cleared = s.cleared;
      if (s.settings && typeof s.settings === 'object') d.settings = s.settings;
      if (s.unlocked && typeof s.unlocked === 'object') Object.assign(d.unlocked, s.unlocked);
      if (s.slots && typeof s.slots === 'object') { d.slots.atk = s.slots.atk || 3; d.slots.buff = s.slots.buff || 3; }
      if (typeof s.mats === 'number') d.mats = s.mats;
      if (s.stats && typeof s.stats === 'object') d.stats = s.stats;
      if (typeof s.createdAt === 'number') d.createdAt = s.createdAt;
      if (typeof s.playTime === 'number') d.playTime = s.playTime;
      return d;
    }
  } catch (e) {}
  return defaultSave();
}
export function writeSave(s, slot) {
  slot = (slot === undefined ? currentSlot : slot);
  try { localStorage.setItem(slotKey(slot), JSON.stringify(s)); } catch (e) {}
}
export function migrateOldSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s && typeof s === 'object') {
      const d = defaultSave();
      if ('gold' in s) d.gold = s.gold; else if ('points' in s) d.gold = s.points;
      if (Array.isArray(s.cleared)) d.cleared = s.cleared;
      if (s.settings && typeof s.settings === 'object') d.settings = s.settings;
      if (s.unlocked && typeof s.unlocked === 'object') Object.assign(d.unlocked, s.unlocked);
      if (s.slots && typeof s.slots === 'object') { d.slots.atk = s.slots.atk || 3; d.slots.buff = s.slots.buff || 3; }
      if (typeof s.mats === 'number') d.mats = s.mats;
      if (s.stats && typeof s.stats === 'object') d.stats = s.stats;
      writeSave(d, 0);
      localStorage.removeItem(SAVE_KEY);
    }
  } catch (e) {}
}
export function clearSlot(slot) { try { localStorage.removeItem(slotKey(slot)); } catch (e) {} }
export function bumpStat(save, key, val) { save.stats[key] = (save.stats[key] || 0) + val; }
export function isUnlocked(id, save) { return save.unlocked[id] === 1; }
export function heroUnlocked(h, save) { return isUnlocked('h_' + h.id, save); }
export function earnGold(win, lv, kills, time) {
  return (win ? 120 : 30) + lv * 8 + Math.floor(kills / 10) + Math.floor(time / 30) * 2;
}
