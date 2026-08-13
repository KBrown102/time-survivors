// ui/skilltree.js · 可拖动缩放的技能树地图
import { SPR } from '../core/sprites.js';
import { HERO_SPEC, HERO_BY_ID, WEAPONS, PASSIVES, SKILL_NODES, SKILL_NODE_BY_ID, SKILL_COLORS, loadSave, writeSave, isUnlocked, reqProgress, reqLabel } from '../config/index.js';
import { $, toast, updateTopres } from './dom.js';

export const SK_LAYOUT = {
  'slot_atk4': {x:1200, y:720}, 'slot_atk5': {x:1200, y:800},
  'slot_buff4': {x:1200, y:880}, 'slot_buff5': {x:1200, y:960},
  'h_lincoln': {x:820, y:560}, 'h_tesla': {x:1580, y:560},
  'h_cleo': {x:660, y:980}, 'h_nobu': {x:1740, y:980}, 'h_joku': {x:1200, y:400},
  'flail': {x:820, y:420}, 'p_might': {x:700, y:500}, 'p_vigor': {x:920, y:500}, 'boomerang': {x:580, y:560},
  'tesla': {x:1580, y:420}, 'p_haste': {x:1700, y:500}, 'p_swift': {x:1460, y:500}, 'crossbow': {x:1820, y:560},
  'leech': {x:660, y:1120}, 'p_regen': {x:540, y:1040}, 'p_magnet': {x:780, y:1040}, 'blackhole': {x:660, y:1240},
  'shuriken': {x:1740, y:1120}, 'p_area': {x:1860, y:1040}, 'p_luck': {x:1620, y:1040}, 'minefield': {x:1740, y:1240},
  'fireball': {x:1200, y:280}, 'iceorb': {x:1320, y:340}
};
export const SK_LINKS = [
  ['h_lincoln','flail'], ['h_lincoln','p_might'], ['h_lincoln','p_vigor'], ['h_lincoln','boomerang'],
  ['h_tesla','tesla'], ['h_tesla','p_haste'], ['h_tesla','p_swift'], ['h_tesla','crossbow'],
  ['h_cleo','leech'], ['h_cleo','p_regen'], ['h_cleo','p_magnet'], ['h_cleo','blackhole'],
  ['h_nobu','shuriken'], ['h_nobu','p_area'], ['h_nobu','p_luck'], ['h_nobu','minefield'],
  ['h_joku','fireball'], ['h_joku','iceorb'],
  ['slot_atk4','slot_atk5'], ['slot_buff4','slot_buff5']
];
let skSel = null;
let skPan = {x:0, y:0, scale:1, drag:false, moved:false, sx:0, sy:0, px:0, py:0};
let skEventsBound = false, skMapInited = false;

export function reinitSkillMap() { skMapInited = false; skBuildRetries = 0; skPan = {x:0, y:0, scale:1, drag:false, moved:false, sx:0, sy:0, px:0, py:0}; }

export function skOwned(n, save) {
  if (n.cat === 'slot') return (save.slots[n.slot] || 3) >= n.to;
  return isUnlocked(n.id, save);
}
export function skCanBuy(n, save) {
  if (skOwned(n, save)) return false;
  const prog = reqProgress(n.req, save);
  if (!prog.met) return false;
  if (n.cost.gold && save.gold < n.cost.gold) return false;
  if (n.cost.mat && save.mats < n.cost.mat) return false;
  return true;
}
export function costText(n, save) {
  const parts = [];
  if (n.cost.gold) parts.push('◈ ' + n.cost.gold + (save.gold < n.cost.gold ? '（不足）' : ''));
  if (n.cost.mat) parts.push('💎 ' + n.cost.mat + (save.mats < n.cost.mat ? '（不足）' : ''));
  return parts.join('  ') || '免费';
}
let skBuildRetries = 0;
function applySkTransform() {
  const layer = $('sk-layer'); if (!layer) return;
  const map = $('sk-map');
  if (map) {
    const rect = map.getBoundingClientRect();
    const pad = 60 * skPan.scale;
    const W = 2400 * skPan.scale, H = 1600 * skPan.scale;
    skPan.x = Math.min(rect.width + pad, Math.max(-W + rect.width - pad, skPan.x));
    skPan.y = Math.min(rect.height + pad, Math.max(-H + rect.height - pad, skPan.y));
  }
  layer.style.transform = 'translate(' + skPan.x + 'px,' + skPan.y + 'px) scale(' + skPan.scale + ')';
}
function centerSkillMap() {
  const map = $('sk-map'); if (!map) return;
  const rect = map.getBoundingClientRect();
  const W = 2400, H = 1600;
  skPan.scale = Math.min(rect.width / W, rect.height / H) * 0.9;
  skPan.x = (rect.width - W * skPan.scale) / 2;
  skPan.y = (rect.height - H * skPan.scale) / 2;
  applySkTransform();
}
function bindSkillMapEvents() {
  if (skEventsBound) return;
  skEventsBound = true;
  const map = $('sk-map');
  map.addEventListener('mousedown', e => {
    if (e.target.closest('.sk-node')) return;
    skPan.drag = true; skPan.moved = false;
    skPan.sx = e.clientX; skPan.sy = e.clientY;
    skPan.px = skPan.x; skPan.py = skPan.y;
    map.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!skPan.drag) return;
    const dx = e.clientX - skPan.sx, dy = e.clientY - skPan.sy;
    if (Math.abs(dx) + Math.abs(dy) > 2) skPan.moved = true;
    skPan.x = skPan.px + dx; skPan.y = skPan.py + dy;
    applySkTransform();
  });
  window.addEventListener('mouseup', () => { skPan.drag = false; map.style.cursor = 'grab'; });
  map.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = map.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const oldScale = skPan.scale;
    skPan.scale = Math.max(0.45, Math.min(2.2, skPan.scale * (e.deltaY < 0 ? 1.12 : 0.9)));
    skPan.x = mx - (mx - skPan.x) * (skPan.scale / oldScale);
    skPan.y = my - (my - skPan.y) * (skPan.scale / oldScale);
    applySkTransform();
  }, {passive:false});
}
export function buildSkillTree() {
  const map = $('sk-map');
  if (map) {
    const rect = map.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      if (skBuildRetries < 12) { skBuildRetries++; requestAnimationFrame(() => buildSkillTree()); return; }
      console.warn('[skilltree] sk-map has zero size after retries');
      skBuildRetries = 0;
      return;
    }
    skBuildRetries = 0;
  }
  const save = loadSave();
  updateTopres();
  const gEl = $('sk-gold'); if (gEl) gEl.textContent = save.gold;
  const mEl = $('sk-mats'); if (mEl) mEl.textContent = save.mats;
  const lines = $('sk-lines'); lines.innerHTML = '';
  const nodes = $('sk-nodes'); nodes.innerHTML = '';
  for (const [aId, bId] of SK_LINKS) {
    const a = SK_LAYOUT[aId], b = SK_LAYOUT[bId];
    if (!a || !b) continue;
    const na = SKILL_NODE_BY_ID[aId], nb = SKILL_NODE_BY_ID[bId];
    const owned = na && skOwned(na, save) && nb && skOwned(nb, save);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('class', owned ? 'owned' : '');
    lines.appendChild(line);
  }
  for (const n of SKILL_NODES) {
    const pos = SK_LAYOUT[n.id];
    if (!pos) continue;
    const owned = skOwned(n, save);
    const prog = reqProgress(n.req, save);
    const can = skCanBuy(n, save);
    const el = document.createElement('div');
    el.className = 'sk-node ' + n.cat + (owned ? ' owned' : '') + (can ? ' can' : '') + (!prog.met && !owned ? ' locked' : '') + (skSel === n.id ? ' sel' : '');
    el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
    if (n.cat === 'hero') {
      const c = document.createElement('canvas'); c.width = 64; c.height = 72; c.className = 'sk-ic';
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(SPR['hero_' + n.hid], 0, 0, 32, 36, 0, 0, 64, 72);
      el.appendChild(c);
    } else {
      const ic = document.createElement('div'); ic.className = 'sk-ic'; ic.textContent = n.icon; el.appendChild(ic);
    }
    const nm = document.createElement('div'); nm.className = 'sk-name'; nm.textContent = n.name; el.appendChild(nm);
    if (can && !owned) { const bd = document.createElement('div'); bd.className = 'buy-badge'; bd.textContent = 'BUY'; el.appendChild(bd); }
    el.onmousedown = e => e.stopPropagation();
    el.onclick = () => {
      const old = nodes.querySelector('.sk-node.sel');
      if (old) old.classList.remove('sel');
      el.classList.add('sel');
      skSel = n.id; renderSkillDetail();
    };
    nodes.appendChild(el);
  }
  if (!skMapInited) { centerSkillMap(); skMapInited = true; }
  bindSkillMapEvents();
  renderSkillDetail();
  const nodeCount = nodes.children.length;
  const lineCount = lines.children.length;
  console.log('[skilltree] rendered', nodeCount, 'nodes,', lineCount, 'lines');
}
export function renderSkillDetail() {
  const n = skSel && SKILL_NODE_BY_ID[skSel];
  const buy = $('sk-buy');
  const box = $('sk-detail');
  if (!n) { box.innerHTML = '<div class="sk-hint">点击左侧条目查看详情，满足条件后消耗金币 / 时之结晶激活。</div>'; buy.style.display = 'none'; return; }
  const save = loadSave();
  const owned = skOwned(n, save);
  const prog = reqProgress(n.req, save);
  const color = SKILL_COLORS[n.cat];
  const tname = { weapon: '攻击技能', passive: '增益技能', hero: '英雄', slot: '装备槽' }[n.cat];
  let effLine = '';
  if (n.cat === 'weapon') effLine = '<div class="sk-detail-eff">开火模式：' + WEAPONS[n.id].kind + '</div>';
  else if (n.cat === 'passive') effLine = '<div class="sk-detail-eff">效果：' + PASSIVES[n.wid].desc + '</div>';
  else if (n.cat === 'hero') effLine = '<div class="sk-detail-eff">特技：' + HERO_SPEC[n.hid].name + '（' + HERO_SPEC[n.hid].cd + 's 冷却）</div>';
  else effLine = '<div class="sk-detail-eff">效果：解锁第 ' + n.to + ' 个' + (n.slot === 'atk' ? '攻击' : '增益') + '槽</div>';
  box.innerHTML =
    '<div class="sk-detail-title">' + n.name + '</div>' +
    '<div class="sk-detail-type" style="background:' + color + '22;color:' + color + '">' + tname + '</div>' +
    '<div class="sk-detail-desc">' + n.desc + '</div>' +
    effLine +
    (n.req ? '<div class="sk-detail-cost">解锁条件：' + reqLabel(n.req) + (prog.met ? ' ✅' : '（' + Math.min(prog.cur, prog.goal) + '/' + prog.goal + '）') + '</div>' : '<div class="sk-detail-cost">初始可用</div>') +
    (owned ? '<div class="sk-detail-cost" style="color:#7dffa0">已激活</div>' : '<div class="sk-detail-cost">激活花费：' + costText(n, save) + '</div>');
  if (owned) { buy.style.display = 'none'; }
  else {
    buy.style.display = 'block';
    buy.textContent = '激活 · ' + costText(n, save);
    buy.disabled = !skCanBuy(n, save);
    buy.onclick = () => tryUnlock(n);
  }
}
export function tryUnlock(n) {
  const save = loadSave();
  if (skOwned(n, save)) { toast('已激活'); return; }
  const prog = reqProgress(n.req, save);
  if (!prog.met) { toast('未满足条件：' + reqLabel(n.req)); return; }
  if (n.cat === 'slot') {
    if (n.req && n.req.slot && (save.slots[n.req.slot] || 3) < n.req.lv) { toast('需先激活上一个槽位'); return; }
    if (save.mats < n.cost.mat) { toast('时之结晶不足（需 ' + n.cost.mat + '）'); return; }
    save.mats -= n.cost.mat; save.slots[n.slot] = n.to; writeSave(save);
    toast('已激活：' + n.name); buildSkillTree(); return;
  }
  if (save.gold < n.cost.gold) { toast('金币不足（需 ' + n.cost.gold + '）'); return; }
  save.gold -= n.cost.gold; save.unlocked[n.id] = 1;
  if (n.cat === 'hero') { const h = HERO_BY_ID[n.hid]; if (h && h.startWeapon) save.unlocked[h.startWeapon] = 1; }
  writeSave(save);
  toast('已激活：' + n.name); buildSkillTree();
}
