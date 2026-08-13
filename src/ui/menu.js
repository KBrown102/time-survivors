// ui/menu.js · 选角 / 关卡选择 / 存档 / 选项 / 已解锁成就
import { G } from '../core/state.js';
import { fmtTime } from '../core/util.js';
import { SPR } from '../core/sprites.js';
import { HEROES, STAGES, UNLOCKS, LANGS, DEFAULT_SETTINGS, HERO_BY_ID, loadSave, loadSettings, clearSlot, setSlot, getSlot, heroUnlocked, isUnlocked, writeSave, SAVE_SLOTS } from '../config/index.js';
import { buildSkillTree, reinitSkillMap } from './skilltree.js';
import { $, hide, show, toast, updateTopres } from './dom.js';

export let selHero = null;
export let selStage = null;

/* ---------------- 选角 UI（左详情 + 右网格） ---------------- */
export function firstUnlockedHero() { const s = loadSave(); return HEROES.find(h => heroUnlocked(h, s)) || HEROES[0]; }

export function buildHeroList() {
  const save = loadSave();
  if (!selHero || !heroUnlocked(selHero, save)) selHero = firstUnlockedHero();
  const grid = $('ch-grid'); grid.innerHTML = '';
  HEROES.forEach((h) => {
    const unlocked = heroUnlocked(h, save);
    const el = document.createElement('div');
    el.className = 'ch-card' + (unlocked ? '' : ' locked');
    const c = document.createElement('canvas'); c.width = 64; c.height = 72;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(SPR['hero_' + h.id], 0, 0, 32, 36, 0, 0, 64, 72);
    const nm = document.createElement('div'); nm.className = 'cn'; nm.textContent = h.name;
    const rl = document.createElement('div'); rl.className = 'cr'; rl.textContent = h.role;
    el.appendChild(c); el.appendChild(nm); el.appendChild(rl);
    if (!unlocked) { const lk = document.createElement('div'); lk.className = 'lock'; lk.textContent = '🔒 技能树解锁'; el.appendChild(lk); }
    else el.onclick = () => { selHero = h; [...grid.children].forEach(n => n.classList.remove('sel')); el.classList.add('sel'); renderHeroDetail(h); };
    grid.appendChild(el);
  });
  renderHeroDetail(selHero);
  const idx = HEROES.indexOf(selHero);
  if (grid.children[idx]) grid.children[idx].classList.add('sel');
}

export function renderHeroDetail(h) {
  const port = $('ch-portrait'); port.innerHTML = '';
  const c = document.createElement('canvas'); c.width = 128; c.height = 144;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(SPR['hero_' + h.id], 0, 0, 32, 36, 0, 0, 128, 144);
  port.appendChild(c);
  $('ch-lname').textContent = h.name;
  $('ch-lrole').textContent = h.role;
  $('ch-story').textContent = h.story;
  $('ch-abil').innerHTML = h.abil;
  const st = h.stats;
  const rows = [
    ['最大生命', st.maxHp], ['治疗值', st.healing], ['武器槽', st.weaponSlots], ['护甲', st.armor],
    ['反击', st.repel], ['移动速度', st.moveSpeed], ['力量', st.might], ['拾取范围', st.magnet],
    ['运气', st.luck], ['学习', st.learning], ['财富', st.wealth], ['复活', st.revive],
    ['弹药尺寸', st.projSize], ['弹药速度', st.projSpeed], ['持续时间', st.duration], ['冷却时间', st.cooldown],
    ['额外弹药', st.extraAmmo], ['重新投掷', st.reroll], ['暴击几率', st.crit], ['击退', st.knockback],
    ['挑战', st.challenge], ['神器槽', st.relic]
  ];
  const box = $('ch-stats'); box.innerHTML = '';
  for (const kv of rows) {
    const d = document.createElement('div'); d.className = 'ch-stat';
    const v = kv[1];
    d.innerHTML = '<span class="k">' + kv[0] + '</span><span class="v">' + (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v) + '</span>';
    box.appendChild(d);
  }
}

/* ---------------- 关卡选择 ---------------- */
export function buildStageList() {
  const save = loadSave();
  const box = $('stage-list'); box.innerHTML = '';
  STAGES.forEach((s, i) => {
    const unlocked = i === 0 || save.cleared.includes(STAGES[i - 1].id);
    const el = document.createElement('div');
    el.className = 'stage-card' + (unlocked ? '' : ' locked') + (s.id === (selStage ? selStage.id : STAGES[0].id) ? ' sel' : '');
    const th = s.theme;
    const swatch = document.createElement('div'); swatch.className = 'stage-swatch';
    swatch.style.background = 'linear-gradient(135deg,' + th.accent + ', ' + th.sky2 + ')';
    const nm = document.createElement('div'); nm.className = 'stage-name'; nm.textContent = s.name;
    const en = document.createElement('div'); en.className = 'stage-en'; en.textContent = s.en;
    const meta = document.createElement('div'); meta.className = 'stage-meta';
    const ft = fmtTime(s.time);
    meta.innerHTML = '<span class="star">' + s.diff + '</span><span>⏱ ' + ft + '</span><span>☠ ' + s.boss.name + '</span>';
    el.appendChild(swatch); el.appendChild(nm); el.appendChild(en); el.appendChild(meta);
    if (!unlocked) {
      const lk = document.createElement('div'); lk.className = 'stage-lock'; lk.textContent = '🔒 通关上一关解锁';
      el.appendChild(lk);
    } else {
      el.onclick = () => {
        selStage = s;
        [...box.children].forEach(n => n.classList.remove('sel'));
        el.classList.add('sel');
      };
    }
    box.appendChild(el);
  });
  if (!selStage) selStage = STAGES[0];
}

/* ---------------- 已解锁成就 ---------------- */
let unOnlyLocked = false;
export function buildUnlocks() {
  const save = loadSave();
  const total = UNLOCKS.length;
  const doneCount = UNLOCKS.filter(u => {
    const cur = u.stat === 'clears' ? (save.cleared.includes(u.flag) ? 1 : 0) : (save.stats[u.stat] || 0);
    return cur >= u.goal;
  }).length;
  $('un-prog').innerHTML = '进度 <b>' + Math.round(doneCount / total * 100) + '%</b> (' + doneCount + '/' + total + ')';
  $('un-sw').className = 'sw' + (unOnlyLocked ? ' on' : '');
  const list = $('un-list'); list.innerHTML = '';
  for (const u of UNLOCKS) {
    const cur = u.stat === 'clears' ? (save.cleared.includes(u.flag) ? 1 : 0) : (save.stats[u.stat] || 0);
    const isDone = cur >= u.goal;
    if (unOnlyLocked && isDone) continue;
    const pct = Math.min(1, cur / u.goal);
    const el = document.createElement('div');
    el.className = 'un-row' + (isDone ? ' done' : (cur > 0 ? '' : ' locked'));
    el.innerHTML =
      '<div class="un-ic">' + u.icon + '</div>' +
      '<div class="un-info"><div class="un-name">' + u.name + '</div>' +
      '<div class="un-desc">' + u.desc + '</div>' +
      '<div class="un-reward">奖励：' + u.reward + '</div></div>' +
      '<div class="un-bar-wrap"><div class="un-bar-bg"><div class="un-bar" style="width:' + (pct * 100) + '%"></div></div>' +
      '<div class="un-count">' + Math.min(cur, u.goal) + ' / ' + u.goal + '</div></div>' +
      '<div class="un-status ' + (isDone ? 'done' : 'todo') + '">' + (isDone ? '已解锁' : '未解锁') + '</div>';
    list.appendChild(el);
  }
}

/* ---------------- 选项设置 ---------------- */
let optSettings = null;
function persistSettings() { const s = loadSave(); s.settings = Object.assign({}, optSettings); writeSave(s); }
function confirmReset(msg) { return (typeof window.confirm === 'function') ? window.confirm(msg || '确定重置该存档？金币、解锁与进度将清空。') : true; }
export function resetSave(slot) { clearSlot(slot === undefined ? getSlot() : slot); toast('存档已清空'); updateTopres(); buildSavesList(); }

export function toggleUnlocksFilter() { unOnlyLocked = !unOnlyLocked; buildUnlocks(); }
export function optDefault() { optSettings = Object.assign({}, DEFAULT_SETTINGS); persistSettings(); buildOptions(); toast('已恢复默认'); }
export function optReset() { if (confirmReset()) { resetSave(); buildOptions(); } }

export function buildOptions() {
  optSettings = loadSettings();
  const body = $('opt-body'); body.innerHTML = '';
  const groups = [
    { title: '音频', items: [
      { key: 'master', label: '主音量', type: 'range' },
      { key: 'sfx', label: '音效', type: 'range' },
      { key: 'music', label: '音乐', type: 'range' }
    ] },
    { title: '视频', items: [
      { key: 'hurtFx', label: '受伤特效强度', type: 'range' },
      { key: 'vsync', label: 'V-Sync', type: 'toggle' },
      { key: 'shake', label: '屏幕震动', type: 'toggle' },
      { key: 'flash', label: '画面闪烁', type: 'toggle' },
      { key: 'retro', label: '复古模式', type: 'toggle' },
      { key: 'fps', label: '显示帧数', type: 'toggle' }
    ] },
    { title: '语言', items: [ { key: 'lang', label: '界面语言', type: 'lang' } ] }
  ];
  for (const g of groups) {
    const gd = document.createElement('div'); gd.className = 'opt-group';
    gd.innerHTML = '<h3>' + g.title + '</h3>';
    for (const it of g.items) {
      const row = document.createElement('div'); row.className = 'opt-row';
      const lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.textContent = it.label;
      const ctl = document.createElement('div'); ctl.className = 'opt-ctl';
      if (it.type === 'range') {
        const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = optSettings[it.key];
        const v = document.createElement('div'); v.className = 'opt-val'; v.textContent = optSettings[it.key];
        r.oninput = () => { optSettings[it.key] = +r.value; v.textContent = r.value; persistSettings(); };
        ctl.appendChild(r); ctl.appendChild(v);
      } else if (it.type === 'toggle') {
        const sw = document.createElement('div'); sw.className = 'sw' + (optSettings[it.key] ? ' on' : '');
        sw.onclick = () => { optSettings[it.key] = !optSettings[it.key]; sw.className = 'sw' + (optSettings[it.key] ? ' on' : ''); persistSettings(); };
        ctl.appendChild(sw);
      } else if (it.type === 'lang') {
        const sel = document.createElement('select'); sel.className = 'sel-lang';
        for (const L of LANGS) { const o = document.createElement('option'); o.value = L; o.textContent = L; if (L === optSettings[it.key]) o.selected = true; sel.appendChild(o); }
        sel.onchange = () => { optSettings[it.key] = sel.value; persistSettings(); };
        ctl.appendChild(sel);
      }
      row.appendChild(lbl); row.appendChild(ctl); gd.appendChild(row);
    }
    body.appendChild(gd);
  }
}

/* ---------------- 存档选择 ---------------- */
export function buildSavesList() {
  const box = $('saves-grid'); box.innerHTML = '';
  for (let i = 0; i < SAVE_SLOTS; i++) {
    const s = loadSave(i);
    const created = fmtDate(s.createdAt);
    const played = fmtPlayTime(s.playTime);
    const el = document.createElement('div');
    el.className = 'save-card';
    const num = document.createElement('div'); num.className = 'save-num'; num.textContent = '存档 ' + (i + 1); el.appendChild(num);
    const meta1 = document.createElement('div'); meta1.className = 'save-meta'; meta1.textContent = '创建于 ' + created; el.appendChild(meta1);
    const meta2 = document.createElement('div'); meta2.className = 'save-meta'; meta2.textContent = '游玩 ' + played; el.appendChild(meta2);
    const res = document.createElement('div'); res.className = 'save-res'; res.textContent = '◈ ' + s.gold + '　💎 ' + s.mats; el.appendChild(res);
    const btns = document.createElement('div'); btns.className = 'save-btns';
    const go = document.createElement('button'); go.className = 'btn save-go'; go.textContent = '进入';
    const clr = document.createElement('button'); clr.className = 'btn sec save-clr'; clr.textContent = '清档';
    go.onclick = (e) => { e.stopPropagation(); setSlot(i); updateTopres(); hide('saves'); show('skilltree'); reinitSkillMap(); buildSkillTree(); };
    clr.onclick = (e) => { e.stopPropagation(); if (confirmReset('确定清空「存档 ' + (i + 1) + '」？该存档的金币、解锁与进度将重置。')) { resetSave(i); } };
    btns.appendChild(go); btns.appendChild(clr); el.appendChild(btns);
    box.appendChild(el);
  }
}
export function fmtDate(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
export function fmtPlayTime(sec) { const h = (sec / 3600) | 0, m = ((sec % 3600) / 60) | 0, s = sec % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
