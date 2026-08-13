// ui/hud.js · HUD 刷新 / 武器栏 / 升级三选一
import { G } from '../core/state.js';
import { SPR } from '../core/sprites.js';
import { WEAPONS, PASSIVES, HERO_SPEC } from '../config/index.js';
import { rollCards, applyCard } from '../core/combat.js';
import { $, hide, show } from './dom.js';

export function updateHud() {
  const p = G.player;
  if (!p) return;
  const m = (G.t / 60) | 0, s = (G.t % 60) | 0;
  $('timer').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  $('s-lv').textContent = 'Lv ' + p.lv;
  $('s-gold').textContent = G.gold;
  $('s-kill').textContent = G.kills;
  $('xpbar').style.width = (p.xp / p.xpNeed * 100) + '%';
  // 特技槽
  const sp = HERO_SPEC[G.hero.id];
  if (sp) {
    $('spec-ic').textContent = sp.icon;
    if (p.specCd > 0) {
      $('spec-txt').textContent = p.specCd.toFixed(1) + 's';
      $('spec').classList.add('cd');
      $('spec-bar').style.width = (p.specCd / p.specCdMax * 100) + '%';
    } else {
      $('spec-txt').textContent = '就绪';
      $('spec').classList.remove('cd');
      $('spec-bar').style.width = '100%';
    }
  }
}

export function rebuildWpnBar() {
  const p = G.player, bar = $('wpnbar');
  bar.innerHTML = '';
  p.weapons.forEach(w => {
    const d = document.createElement('div'); d.className = 'wslot';
    const ic = SPR['i_' + w.id].cloneNode(); ic.width = 30; ic.height = 30;
    ic.getContext('2d').drawImage(SPR['i_' + w.id], 0, 0);
    d.appendChild(ic);
    const t = document.createElement('div'); t.className = 'lvtag'; t.textContent = w.lv; d.appendChild(t);
    bar.appendChild(d);
  });
  for (const id in p.passives) {
    const d = document.createElement('div'); d.className = 'wslot';
    const ic = document.createElement('canvas'); ic.width = ic.height = 30;
    ic.getContext('2d').drawImage(SPR['i_' + id], 0, 0);
    d.appendChild(ic);
    const t = document.createElement('div'); t.className = 'lvtag'; t.textContent = p.passives[id];
    d.appendChild(t); bar.appendChild(d);
  }
}

export function openLevelUp(fromChest) {
  if (!fromChest) G.pendingLv--;
  G.state = 'levelup';
  const cards = rollCards(fromChest);
  const box = $('lu-cards'); box.innerHTML = '';
  $('lu-title').textContent = fromChest ? '宝箱！' : '升级！';
  cards.forEach(c => {
    const el = document.createElement('div'); el.className = 'card';
    const isW = c.t !== 'PAS';
    const def = isW ? WEAPONS[c.id] : PASSIVES[c.id];
    const icc = document.createElement('canvas'); icc.width = icc.height = 40;
    icc.getContext('2d').drawImage(SPR['i_' + c.id], 5, 5);
    const tag = c.t === 'NEW' ? '新武器' : c.t === 'UP' ? ('升级 → Lv' + (c.w.lv + 1)) : ('强化 → Lv' + (c.lv + 1));
    let desc = def.desc;
    if (c.t === 'UP') { const u = WEAPONS[c.id].up; desc = u[Math.min(u.length - 1, c.w.lv - 1)] + '　—　' + def.desc; }
    const cn = document.createElement('div'); cn.className = 'cn'; cn.textContent = def.name;
    const ct = document.createElement('div'); ct.className = 'ct ' + c.t; ct.textContent = tag;
    const cd = document.createElement('div'); cd.className = 'cd'; cd.textContent = desc;
    el.appendChild(icc);
    el.appendChild(cn); el.appendChild(ct); el.appendChild(cd);
    el.onclick = () => {
      applyCard(c); rebuildWpnBar(); hide('levelup');
      if (G.pendingLv > 0) openLevelUp(false); else G.state = 'play';
    };
    box.appendChild(el);
  });
  show('levelup');
}

