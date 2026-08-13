// core/engine.js · 游戏状态 / 实体 / 对象池 / 空间网格 / 波次导演
import { G, _near } from './state.js';
import { TAU, rand, dist2, clamp } from './util.js';
import { WEAPONS, ENEMIES, BOSS, HERO_SPEC, WAVES } from '../config/index.js';
import { fireEnemyBullet, burst, ring, pushDmg, dropPickup } from './combat.js';
import { toast } from '../ui/dom.js';
import { endRun } from '../ui/lifecycle.js';

/* ---------------- 空间网格（敌人查询 + 软分离） ---------------- */
export class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  key(x, y) { return ((x / this.cell) | 0) + ',' + ((y / this.cell) | 0); }
  add(e) {
    const k = this.key(e.x, e.y);
    let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); }
    a.push(e);
  }
  // 返回 (x,y) 周围 3x3 格内的实体（复用数组，避免 GC）
  near(x, y, out) {
    out.length = 0;
    const cx = (x / this.cell) | 0, cy = (y / this.cell) | 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.map.get((cx + i) + ',' + (cy + j));
      if (a) for (let k = 0; k < a.length; k++) out.push(a[k]);
    }
    return out;
  }
}

/* ---------------- 对象池 ---------------- */
export function poolGet(arr, factory) {
  for (let i = 0; i < arr.length; i++) if (!arr[i].alive) return arr[i];
  const o = factory(); arr.push(o); return o;
}

/* ---------------- 玩家 ---------------- */
export function makePlayer(hero) {
  const st = hero.stats || {};
  const p = {
    x: 0, y: 0, r: 13, hp: hero.hp, maxHp: hero.hp,
    speed: hero.speed, magnet: hero.magnet, regen: 0, crit: 0.05,
    mul: { dmg: hero.might, cd: 1 / (st.cooldown || 1), area: 1, speed: 1 },
    lv: 1, xp: 0, xpNeed: 8,
    weapons: [],                     // {id, lv, t, stats}
    passives: {},                    // id -> lv
    atkSlots: 3, buffSlots: 3,      // 单局可装备上限（开局由存档注入）
    inv: 0, face: 1, walkT: 0,
    special: (HERO_SPEC[hero.id] || {}).kind || 'barrier', specT: 0, petA: 0,
    specCd: 0, specCdMax: (HERO_SPEC[hero.id] || {}).cd || 9,
    specShieldT: 0, dashSpeedT: 0,
    hurtFlash: 0,
    xpMul: 1, goldMul: 1, dmgResist: (st.armor || 0), luck: 0,
    pierceBonus: 0, revive: 0, vigorBurst: 0, extraAmmo: 0,
    reviveUsed: false
  };
  if (st.crit) p.crit = st.crit;
  addWeapon(p, hero.startWeapon);
  return p;
}

export function weaponStats(id, lv) {
  const d = WEAPONS[id], b = d.base, s = Object.assign({}, b);
  // 每级递进：伤害与关键项按 up[] 的语义成长（统一公式，简洁可控）
  for (let i = 1; i < lv; i++) {
    switch (i) {
      case 1: s.count = (s.count || 1) + 1; break;
      case 2: s.cd = (s.cd || 0) * 0.85; break;
      case 3: s.dmg = s.dmg * 1.35; break;
      case 4:
        if (d.kind === 'chain') s.chains += 2;
        else if (d.kind === 'orbit') s.speed *= 1.35;
        else if (d.kind === 'area') s.size *= 1.3;
        else if (id === 'iceorb') s.slow = Math.min(0.75, s.slow + 0.2);
        else if (id === 'leech') s.life += 0.08;
        else if (id === 'crossbow') s.crit += 0.15;
        else if (id === 'boomerang') s.range *= 1.35;
        else s.pierce = (s.pierce || 1) + 2;
        break;
      case 5: s.size *= 1.25; if (d.kind === 'orbit') s.radius *= 1.15; break;
      case 6: s.dmg *= 1.3; s.cd = (s.cd || 0) * 0.9; break;
      case 7: s.count = (s.count || 1) + 1; s.dmg *= 1.15; break;
    }
  }
  return s;
}
export function addWeapon(p, id) {
  p.weapons.push({ id, lv: 1, t: 0, stats: weaponStats(id, 1), orbA: Math.random() * TAU });
}
export function upWeapon(w) { w.lv++; w.stats = weaponStats(w.id, w.lv); }

/* ---------------- 敌人 ---------------- */
export function spawnEnemy(type, x, y, hpMul, isBoss) {
  const d = isBoss ? G.boss : ENEMIES[type];
  const e = poolGet(G.enemies, () => ({}));
  e.alive = true; e.type = isBoss ? 'boss' : type; e.def = d;
  e.x = x; e.y = y;
  e.hp = e.maxHp = d.hp * hpMul;
  e.r = d.r; e.speed = d.speed; e.dmg = d.dmg;
  e.kind = d.kind; e.slow = 0; e.slowT = 0;
  e.kx = 0; e.ky = 0; e.flash = 0; e.shootT = rand(0, 2);
  e.dashT = rand(1, 3); e.dashing = 0; e.wob = Math.random() * TAU;
  e.isBoss = !!isBoss || d.kind === 'miniboss';
  e.hitT = 0;
  return e;
}

// 在玩家视野外的环形位置生成
export function spawnRing(type, hpMul, n, radius) {
  const p = G.player;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, R = radius || rand(620, 760);
    spawnEnemy(type, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, hpMul);
  }
}
// 列阵：一条横线整齐推进
export function spawnLine(type, hpMul, n) {
  const p = G.player, side = Math.random() < .5 ? -1 : 1;
  const ox = p.x + side * 720, oy = p.y - (n * 34) / 2;
  for (let i = 0; i < n; i++) spawnEnemy(type, ox + rand(-14, 14), oy + i * 34, hpMul);
}

/* ---------------- 波次导演 ---------------- */
export function hpScale() { return 1 + G.t / 200 + (G.diffMul - 1) * Math.min(1, G.t / 600); }   // 随时间变厚，并叠加关卡难度
export function dmgScale() { return 1 + G.t / 600 + (G.diffMul - 1) * Math.min(1, G.t / 600); }

export function updateDirector(dt) {
  const W = G.waves || WAVES;
  // 找当前波段
  let w = null;
  for (let i = 0; i < W.length; i++) if (G.t >= W[i].t0 && G.t < W[i].t1) { w = W[i]; break; }
  if (!w) return;

  // 特殊事件
  if (w.special && !G.firedSpecials[w.special.at] && G.t >= w.special.at) {
    G.firedSpecials[w.special.at] = 1;
    const s = w.special;
    toast(s.name);
    if (s.type === 'swarm') spawnRing(s.enemy, hpScale() * 0.8, s.n, rand(560, 640));
    else if (s.type === 'line') spawnLine(s.enemy, hpScale(), s.n);
    else if (s.type === 'miniboss') { spawnRing(G.stage.miniShape, hpScale() * 0.9, 1, 560); G.cam.shake = 14; }
    else if (s.type === 'miniboss2') { spawnRing(G.stage.miniShape, hpScale() * 0.9, 2, 560); G.cam.shake = 16; }
    else if (s.type === 'boss') {
      const p = G.player, a = Math.random() * TAU;
      spawnEnemy(null, p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 520, 1, true);
      G.bossAlive = true; G.cam.shake = 22;
    }
  }

  // 常规生成（有软上限，防爆炸）
  if (w.rate > 0 && G.enemies.reduce((a, e) => a + (e.alive ? 1 : 0), 0) < 420) {
    G.spawnAcc += w.rate * dt;
    while (G.spawnAcc >= 1) {
      G.spawnAcc -= 1;
      let tot = 0; for (const it of w.pool) tot += it[1];
      let r = Math.random() * tot, t = w.pool[0][0];
      for (const it of w.pool) { r -= it[1]; if (r <= 0) { t = it[0]; break; } }
      spawnRing(t, hpScale(), 1);
    }
  }
}

/* ---------------- 敌人更新 ---------------- */
export function updateEnemies(dt) {
  const p = G.player;
  G.grid.clear();
  for (let i = 0; i < G.enemies.length; i++) { const e = G.enemies[i]; if (e.alive) G.grid.add(e); }

  for (let i = 0; i < G.enemies.length; i++) {
    const e = G.enemies[i]; if (!e.alive) continue;

    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.flash > 0) e.flash -= dt;
    if (e.hitT > 0) e.hitT -= dt;

    let dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let sp = e.speed * (1 - e.slow);

    // AI
    if (e.kind === 'swarm') { e.wob += dt * 6; sp *= 1 + Math.sin(e.wob) * 0.18; }
    else if (e.kind === 'dasher') {
      e.dashT -= dt;
      if (e.dashing > 0) { e.dashing -= dt; sp *= 3.1; }
      else if (e.dashT <= 0 && d < 340) { e.dashing = 0.38; e.dashT = rand(2.2, 3.6); }
    }
    else if (e.kind === 'ranged') {
      if (d < 300) sp *= -0.55;                       // 保持距离
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 460) {
        e.shootT = e.def.shoot.cd;
        fireEnemyBullet(e, dx, dy, e.def.shoot);
      }
    }
    else if (e.kind === 'boss') {
      e.shootT -= dt;
      if (e.shootT <= 0) {
        e.shootT = e.def.shoot.cd;
        const n = 10, off = Math.random() * TAU;      // 弹幕环（bullet hell 味）
        for (let k = 0; k < n; k++) {
          const a = off + k / n * TAU;
          fireEnemyBullet(e, Math.cos(a), Math.sin(a), e.def.shoot);
        }
      }
      if (d < 220) sp *= 0.4;
    }

    e.x += dx * sp * dt; e.y += dy * sp * dt;

    // 击退衰减
    if (e.kx || e.ky) {
      e.x += e.kx * dt; e.y += e.ky * dt;
      e.kx *= 0.86; e.ky *= 0.86;
      if (Math.abs(e.kx) < 2) e.kx = 0; if (Math.abs(e.ky) < 2) e.ky = 0;
    }

    // 软分离：避免叠成一坨（只查邻格，限次数）
    if (!e.isBoss) {
      G.grid.near(e.x, e.y, _near);
      let cnt = 0;
      for (let k = 0; k < _near.length && cnt < 6; k++) {
        const o = _near[k]; if (o === e || !o.alive) continue;
        const ox = e.x - o.x, oy = e.y - o.y, dd = ox * ox + oy * oy;
        const mr = e.r + o.r;
        if (dd > 0.01 && dd < mr * mr) {
          const dl = Math.sqrt(dd), push = (mr - dl) / dl * 0.5;
          e.x += ox * push; e.y += oy * push; cnt++;
        }
      }
    }

    // 撞玩家
    const pr = e.r + p.r;
    if (dist2(e.x, e.y, p.x, p.y) < pr * pr) hurtPlayer(e.dmg * dmgScale() * dt * 1.6);

    // 太远回收（防内存堆积）
    if (dist2(e.x, e.y, p.x, p.y) > 1500 * 1500) e.alive = false;
  }
}

/* ---------------- 伤害 / 死亡 ---------------- */
export function damageEnemy(e, dmg, kx, ky, canCrit) {
  let d = dmg * G.player.mul.dmg;
  let crit = false;
  if (canCrit !== false && Math.random() < G.player.crit) { d *= 2; crit = true; }
  e.hp -= d; e.flash = 0.1;
  if (kx || ky) { const k = e.isBoss ? 0.15 : 1; e.kx += kx * k; e.ky += ky * k; }
  pushDmg(e.x, e.y - e.r - 6, Math.round(d), crit);
  if (e.hp <= 0) killEnemy(e);
}

export function killEnemy(e) {
  e.alive = false;
  G.kills++;
  const d = e.def;
  // 经验宝石
  let gemT = 1;
  if (d.xp >= 40) gemT = 3; else if (d.xp >= 4) gemT = 2;
  dropPickup(e.x, e.y, 'xp', d.xp, gemT);
  if (d.gold > 0 && Math.random() < 0.55) dropPickup(e.x, e.y, 'gold', Math.round(d.gold * (G.player.goldMul || 1)));
  if (Math.random() < 0.012) dropPickup(e.x, e.y, 'heart', 20);
  if (e.isBoss) {
    dropPickup(e.x, e.y, 'chest', 0);
    G.cam.shake = 16;
    for (let i = 0; i < 26; i++) burst(e.x, e.y, d.color, rand(80, 260));
    if (e.type === 'boss') G.finalKilled = true; else G.miniKills = (G.miniKills || 0) + 1;
  }
  for (let i = 0; i < (e.isBoss ? 18 : 6); i++) burst(e.x, e.y, d.color, rand(40, 160));
  if (e.type === 'boss') { G.bossAlive = false; G.win = true; endRun(true); }
}

export function hurtPlayer(amount) {
  const p = G.player;
  if (p.inv > 0) return;
  const dr = (p.dmgResist || 0) + (p.specShieldT > 0 ? 0.3 : 0);
  p.hp -= amount * (1 - dr);
  p.hurtFlash = 0.18;
  if (p.hp <= 0) {
    if (p.revive > 0 && !p.reviveUsed) {           // 技能树「不屈」：原地复活
      p.reviveUsed = true; p.revive--;
      p.hp = p.maxHp * 0.5; p.inv = 2.5;
      G.cam.shake = 16; toast('不屈！原地复活');
    } else { p.hp = 0; endRun(false); }
  }
}
