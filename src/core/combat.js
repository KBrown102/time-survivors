// core/combat.js · 武器开火 / 投射物 / 拾取物 / 升级卡牌 / 特效
import { G, _near } from './state.js';
import { TAU, rand, lerp, dist2 } from './util.js';
import { WEAPONS, PASSIVE_IDS, PASSIVES, WEAPON_IDS, loadSave, isUnlocked } from '../config/index.js';
import { damageEnemy, hurtPlayer, dmgScale, poolGet, addWeapon, upWeapon } from './engine.js';
import { openLevelUp } from '../ui/hud.js';

/* ---------------- 特效池 ---------------- */
export const DMG_CAP = 48;            // 伤害飘字上限，防止密集打击掉帧
export let dmgActive = 0;
export function resetDmgActive() { dmgActive = 0; }
export function burst(x, y, col, spd) {
  const f = poolGet(G.fx, () => ({}));
  const a = Math.random() * TAU;
  f.alive = true; f.x = x; f.y = y; f.vx = Math.cos(a) * spd; f.vy = Math.sin(a) * spd;
  f.life = f.max = rand(0.25, 0.5); f.col = col; f.r = rand(2, 4); f.kind = 'p';
  return f;
}
export function bolt(x1, y1, x2, y2, col) {
  const f = poolGet(G.fx, () => ({}));
  f.alive = true; f.kind = 'bolt'; f.x = x1; f.y = y1; f.x2 = x2; f.y2 = y2;
  f.life = f.max = 0.16; f.col = col;
}
export function ring(x, y, r, col) {
  const f = poolGet(G.fx, () => ({}));
  f.alive = true; f.kind = 'ring'; f.x = x; f.y = y; f.r = r; f.life = f.max = 0.3; f.col = col;
}
export function pushDmg(x, y, v, crit) {
  if (dmgActive >= DMG_CAP) return;
  const d = poolGet(G.dmgs, () => ({}));
  d.alive = true; d.x = x + rand(-6, 6); d.y = y; d.v = v; d.crit = crit;
  d.life = d.max = 0.6; d.vy = -46;
  dmgActive++;
}
export function updateFx(dt) {
  for (const f of G.fx) {
    if (!f.alive) continue;
    f.life -= dt; if (f.life <= 0) { f.alive = false; continue; }
    if (f.kind === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
  }
  for (const d of G.dmgs) {
    if (!d.alive) continue;
    d.life -= dt; if (d.life <= 0) { d.alive = false; dmgActive--; continue; }
    d.y += d.vy * dt; d.vy += 90 * dt;
  }
}

/* ---------------- 投射物 ---------------- */
export function newProj(o) {
  const p = poolGet(G.projs, () => ({}));
  Object.assign(p, o); p.alive = true; p.hitSet = p.hitSet || new Set(); p.hitSet.clear();
  return p;
}
export function fireEnemyBullet(e, dx, dy, sh) {
  newProj({
    x: e.x, y: e.y, vx: dx * sh.spd, vy: dy * sh.spd, r: 6,
    dmg: sh.dmg, life: 5, enemy: true, col: '#ff6a9a', kind: 'bullet', spin: 0
  });
}

export function findNearest(x, y, maxR) {
  let best = null, bd = (maxR || 900) ** 2;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/* ---------------- 武器开火 ---------------- */
export function fireWeapon(w, p) {
  const d = WEAPONS[w.id], s = w.stats, A = p.mul.area;
  const dmg = s.dmg, sz = (s.size || 10) * A;

  if (d.kind === 'nearest') {
    const t = findNearest(p.x, p.y);
    if (!t) return;
    for (let i = 0; i < s.count; i++) {
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i - (s.count - 1) / 2) * 0.14;
      newProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: sz, dmg, pierce: (s.pierce || 1) + (p.pierceBonus || 0), life: 2.2, col: d.color, kind: w.id,
        knock: s.knock, life_steal: s.life || 0, critB: s.crit || 0, spin: 0
      });
    }
  }
  else if (d.kind === 'spread') {
    const t = findNearest(p.x, p.y);
    const base = t ? Math.atan2(t.y - p.y, t.x - p.x) : rand(0, TAU);
    for (let i = 0; i < s.count; i++) {
      const a = base + (i - (s.count - 1) / 2) * (s.spread || 0.5);
      newProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: sz, dmg, pierce: (s.pierce || 1) + (p.pierceBonus || 0), life: 2.2, col: d.color, kind: w.id,
        knock: s.knock, slow: s.slow || 0, slowDur: s.slowDur || 0, spin: 0
      });
    }
  }
  else if (d.kind === 'boomerang') {
    const t = findNearest(p.x, p.y);
    const base = t ? Math.atan2(t.y - p.y, t.x - p.x) : rand(0, TAU);
    for (let i = 0; i < s.count; i++) {
      const a = base + i * (TAU / Math.max(1, s.count));
      newProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: sz, dmg, pierce: 99, life: 3, col: d.color, kind: 'boomerang',
        knock: s.knock, boomT: 0, maxT: (s.range * A) / s.speed, spin: 0, home: p
      });
    }
  }
  else if (d.kind === 'chain') {
    let src = { x: p.x, y: p.y };
    const hit = new Set();
    let n = (s.count || 1) + (s.chains || 0);
    for (let i = 0; i < n; i++) {
      let best = null, bd = (s.range * A) ** 2;
      for (const e of G.enemies) {
        if (!e.alive || hit.has(e)) continue;
        const dd = dist2(src.x, src.y, e.x, e.y);
        if (dd < bd) { bd = dd; best = e; }
      }
      if (!best) break;
      hit.add(best);
      bolt(src.x, src.y, best.x, best.y, d.color);
      const ang = Math.atan2(best.y - src.y, best.x - src.x);
      damageEnemy(best, dmg * (1 - i * 0.08), Math.cos(ang) * s.knock, Math.sin(ang) * s.knock);
      src = best;
    }
  }
  else if (d.kind === 'area') {
    for (let i = 0; i < s.count; i++) {
      const t = findNearest(p.x, p.y, 420);
      const ax = t ? t.x : p.x + rand(-160, 160), ay = t ? t.y : p.y + rand(-160, 160);
      const a = poolGet(G.areas, () => ({}));
      a.alive = true; a.x = ax; a.y = ay; a.r = s.size * A; a.dmg = dmg;
      a.life = a.max = s.dur; a.pull = s.pull; a.col = d.color; a.tick = 0;
    }
  }
  else if (d.kind === 'mine') {
    for (let i = 0; i < s.count; i++) {
      const m = poolGet(G.mines, () => ({}));
      m.alive = true; m.x = p.x + rand(-26, 26); m.y = p.y + rand(-26, 26);
      m.r = s.size * A; m.dmg = dmg; m.life = s.dur; m.col = d.color; m.armT = 0.25;
    }
  }
}

/* ---------------- 环绕体（连枷）单独处理 ---------------- */
export function updateOrbit(w, p, dt) {
  const s = w.stats, A = p.mul.area;
  w.orbA += s.speed * dt / p.mul.cd;
  const R = s.radius * A, rr = s.size * A;
  for (let i = 0; i < s.count; i++) {
    const a = w.orbA + i / s.count * TAU;
    const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
    w.px = ox; w.py = oy;
    G.grid.near(ox, oy, _near);
    for (const e of _near) {
      if (!e.alive || e.hitT > 0) continue;
      const mr = e.r + rr;
      if (dist2(ox, oy, e.x, e.y) < mr * mr) {
        e.hitT = 0.28;
        damageEnemy(e, s.dmg, Math.cos(a) * s.knock, Math.sin(a) * s.knock);
      }
    }
  }
}

/* ---------------- 投射物更新 ---------------- */
export function updateProjs(dt) {
  const p = G.player;
  for (const b of G.projs) {
    if (!b.alive) continue;
    b.life -= dt; if (b.life <= 0) { b.alive = false; continue; }
    b.spin += dt * 14;

    if (b.kind === 'boomerang') {
      b.boomT += dt;
      if (b.boomT > b.maxT) {                     // 回收阶段：朝玩家飞
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        const sp = 460;
        b.vx = dx / d * sp; b.vy = dy / d * sp;
        if (d < 22) { b.alive = false; continue; }
        if (b.boomT > b.maxT + 3) { b.alive = false; continue; }
        if (b.boomT > b.maxT + 0.25) b.hitSet.clear(), b.boomT = b.maxT + 0.001;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;

    if (b.enemy) {                                 // 敌弹打玩家
      const mr = b.r + p.r;
      if (dist2(b.x, b.y, p.x, p.y) < mr * mr) { hurtPlayer(b.dmg * dmgScale()); b.alive = false; }
      if (dist2(b.x, b.y, p.x, p.y) > 1200 * 1200) b.alive = false;
      continue;
    }

    // 玩家弹打敌人
    G.grid.near(b.x, b.y, _near);
    for (const e of _near) {
      if (!e.alive || b.hitSet.has(e)) continue;
      const mr = e.r + b.r;
      if (dist2(b.x, b.y, e.x, e.y) < mr * mr) {
        b.hitSet.add(e);
        const a = Math.atan2(b.vy, b.vx);
        const oldCrit = p.crit;
        if (b.critB) p.crit += b.critB;
        damageEnemy(e, b.dmg, Math.cos(a) * (b.knock || 0), Math.sin(a) * (b.knock || 0));
        p.crit = oldCrit;
        if (b.slow) { e.slow = Math.max(e.slow, b.slow); e.slowT = b.slowDur; }
        if (b.life_steal) { p.hp = Math.min(p.maxHp, p.hp + b.dmg * b.life_steal); }
        burst(b.x, b.y, b.col, rand(30, 90));
        b.pierce--;
        if (b.pierce <= 0) { b.alive = false; break; }
      }
    }
  }
}

/* ---------------- 区域（黑洞）/ 地雷 ---------------- */
export function updateAreas(dt) {
  for (const a of G.areas) {
    if (!a.alive) continue;
    a.life -= dt; if (a.life <= 0) { a.alive = false; continue; }
    a.tick -= dt;
    const doTick = a.tick <= 0; if (doTick) a.tick = 0.25;
    G.grid.near(a.x, a.y, _near);
    for (const e of _near) {
      if (!e.alive) continue;
      const dd = dist2(a.x, a.y, e.x, e.y);
      if (dd < (a.r + e.r) ** 2) {
        if (a.pull && !e.isBoss) {                       // 吸拢
          const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy) || 1;
          e.x += dx / d * a.pull * dt; e.y += dy / d * a.pull * dt;
        }
        if (doTick) damageEnemy(e, a.dmg, 0, 0, false);
      }
    }
  }
  for (const m of G.mines) {
    if (!m.alive) continue;
    m.life -= dt; if (m.armT > 0) m.armT -= dt;
    if (m.life <= 0) { m.alive = false; continue; }
    if (m.armT > 0) continue;
    G.grid.near(m.x, m.y, _near);
    for (const e of _near) {
      if (!e.alive) continue;
      if (dist2(m.x, m.y, e.x, e.y) < (e.r + 14) ** 2) {   // 触发
        m.alive = false; ring(m.x, m.y, m.r, m.col);
        G.cam.shake = Math.max(G.cam.shake, 5);
        G.grid.near(m.x, m.y, _near);
        for (const o of _near) {
          if (!o.alive) continue;
          if (dist2(m.x, m.y, o.x, o.y) < (m.r + o.r) ** 2) {
            const a = Math.atan2(o.y - m.y, o.x - m.x);
            damageEnemy(o, m.dmg, Math.cos(a) * 160, Math.sin(a) * 160);
          }
        }
        for (let i = 0; i < 12; i++) burst(m.x, m.y, m.col, rand(90, 240));
        break;
      }
    }
  }
}

/* ---------------- 拾取物 ---------------- */
export function dropPickup(x, y, kind, val, gemT) {
  const k = poolGet(G.pickups, () => ({}));
  k.alive = true; k.x = x + rand(-6, 6); k.y = y + rand(-6, 6);
  k.kind = kind; k.val = val; k.gemT = gemT || 1; k.vx = 0; k.vy = 0; k.bob = Math.random() * TAU;
  return k;
}
export function updatePickups(dt) {
  const p = G.player, mag = p.magnet;
  for (const k of G.pickups) {
    if (!k.alive) continue;
    k.bob += dt * 4;
    const d = Math.hypot(p.x - k.x, p.y - k.y);
    if (d < mag) {                                  // 磁吸
      const s = lerp(140, 620, 1 - d / mag);
      k.x += (p.x - k.x) / d * s * dt; k.y += (p.y - k.y) / d * s * dt;
    }
    if (d < p.r + 12) {
      k.alive = false;
      if (k.kind === 'xp') gainXp(k.val);
      else if (k.kind === 'gold') G.gold += k.val;
      else if (k.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + k.val); pushDmg(p.x, p.y - 20, '+' + k.val, false); }
      else if (k.kind === 'chest') { openLevelUp(true); }
    }
  }
}

/* ---------------- 经验 / 升级 ---------------- */
export function gainXp(v) {
  const p = G.player;
  p.xp += v * (p.xpMul || 1);
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed; p.lv++;
    p.xpNeed = Math.round(8 + p.lv * 6 + Math.pow(p.lv, 1.55));
    G.pendingLv = (G.pendingLv || 0) + 1;
  }
  if (G.pendingLv > 0 && G.state === 'play') openLevelUp(false);
}

// 生成三选一候选（只纳入已激活的技能/被动；受装备槽上限约束）
export function rollCards(fromChest) {
  const p = G.player, save = loadSave(), out = [];
  const owned = {}; p.weapons.forEach(w => owned[w.id] = w);
  const cand = [];
  // 已有武器升级（不受"未激活"限制——已持有即可继续升）
  p.weapons.forEach(w => { if (w.lv < 8) cand.push({ t: 'UP', id: w.id, w }); });
  // 新武器（仅已激活 + 受攻击槽上限）
  if (p.weapons.length < p.atkSlots) {
    WEAPON_IDS.forEach(id => { if (!owned[id] && isUnlocked(id, save)) cand.push({ t: 'NEW', id }); });
  }
  // 被动（仅已激活 + 受增益槽上限；已持有可继续升）
  const pasN = Object.keys(p.passives).length;
  PASSIVE_IDS.forEach(id => {
    const lv = p.passives[id] || 0, has = lv > 0;
    if (lv < PASSIVES[id].max && (has || pasN < p.buffSlots) && isUnlocked('p_' + id, save)) cand.push({ t: 'PAS', id, lv });
  });
  // 随机抽 3
  for (let i = 0; i < 3 && cand.length; i++) {
    const idx = (Math.random() * cand.length) | 0;
    out.push(cand.splice(idx, 1)[0]);
  }
  return out;
}
export function applyCard(c) {
  const p = G.player;
  if (c.t === 'NEW') addWeapon(p, c.id);
  else if (c.t === 'UP') upWeapon(c.w);
  else { p.passives[c.id] = (p.passives[c.id] || 0) + 1; PASSIVES[c.id].apply(p); }
}
