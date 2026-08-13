"use strict";
/* =====================================================================
   boot.js · 渲染 / HUD / 状态机 / 主循环
   ===================================================================== */

const cv = document.getElementById('game');
const cx = cv.getContext('2d');
cv.width = VW; cv.height = VH;
cx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  cv.style.width = (VW * s) + 'px';
  cv.style.height = (VH * s) + 'px';
}
addEventListener('resize', fitCanvas); fitCanvas();

/* ---------------- 旧存档迁移 ---------------- */
migrateOldSave();

/* ---------------- 输入 ---------------- */
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Escape') {
    e.preventDefault();
    if (G.state === 'play') { G.state = 'pause'; show('paused'); }
    else if (G.state === 'pause') { resumeGame(); }
  } else if (e.code === 'Space') {
    e.preventDefault();
    if (G.state === 'play' && G.player && G.player.specCd <= 0) castSpecial(G.player);
  }
});
addEventListener('keyup', e => keys[e.code] = false);

// 暂停中的「继续/退出」流程
function resumeGame() { if (G.state === 'pause') { G.state = 'play'; hide('paused'); } }
function quitToMenu() {
  G.state = 'menu'; G.player = null;
  hide('paused'); hide('hud');
  updateTopres();
  show('menu');
}

/* ---------------- UI 助手 ---------------- */
const $ = id => document.getElementById(id);
function show(id) { $(id).classList.remove('hidden'); $(id).classList.add('show'); }
function hide(id) { $(id).classList.add('hidden'); $(id).classList.remove('show'); }
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  G.toastT = 2.2;
}

/* ---------------- 地面：预渲染平铺图案 ---------------- */
let groundPat = null;
function buildGround() {
  const S = 200;
  const th = G.theme || { grass1:'#1d2a1c', grass2:'#1a2618', grass3:'#2a3d26', stone:'#3a3a42', blade:'rgba(120,170,90,.35)' };
  const g = document.createElement('canvas'); g.width = g.height = S;
  const x = g.getContext('2d');
  x.fillStyle = th.grass1; x.fillRect(0, 0, S, S);
  // 草地噪点
  for (let i = 0; i < 420; i++) {
    const px_ = Math.random() * S, py = Math.random() * S;
    x.fillStyle = [th.grass3, th.grass2, th.grass3][(Math.random() * 3) | 0];
    x.fillRect(px_ | 0, py | 0, 3, 3);
  }
  // 草叶
  for (let i = 0; i < 46; i++) {
    const px_ = Math.random() * S, py = Math.random() * S;
    x.strokeStyle = th.blade; x.lineWidth = 1;
    x.beginPath(); x.moveTo(px_, py); x.lineTo(px_ + rand(-2, 2), py - rand(3, 7)); x.stroke();
  }
  // 石头
  for (let i = 0; i < 7; i++) {
    const px_ = Math.random() * S, py = Math.random() * S, r = rand(3, 6);
    x.fillStyle = th.stone; x.beginPath(); x.arc(px_, py, r, 0, TAU); x.fill();
    x.fillStyle = '#4a4a54'; x.beginPath(); x.arc(px_ - 1, py - 1, r * .6, 0, TAU); x.fill();
  }
  groundPat = cx.createPattern(g, 'repeat');
}

/* ---------------- 渲染 ---------------- */
function draw() {
  const p = G.player, cam = G.cam;
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, VW, VH);

  if (!p) { cx.fillStyle = '#12121c'; cx.fillRect(0, 0, VW, VH); return; }

  // 相机（带震动）
  let sx = 0, sy = 0;
  if (cam.shake > 0) { sx = rand(-cam.shake, cam.shake); sy = rand(-cam.shake, cam.shake); }
  const ox = VW / 2 - p.x + sx, oy = VH / 2 - p.y + sy;

  // 地面
  cx.save();
  cx.translate(ox % 200, oy % 200);
  cx.fillStyle = groundPat;
  cx.fillRect(-200, -200, VW + 400, VH + 400);
  cx.restore();

  cx.save();
  cx.translate(ox, oy);

  // 拾取物
  for (const k of G.pickups) {
    if (!k.alive) continue;
    const bob = Math.sin(k.bob) * 2;
    let img;
    if (k.kind === 'xp') img = SPR['gem' + k.gemT];
    else if (k.kind === 'gold') img = SPR.coin;
    else if (k.kind === 'heart') img = SPR.heart;
    else img = SPR.chest;
    cx.drawImage(img, (k.x - img.width / 2) | 0, (k.y - img.height / 2 + bob) | 0);
  }

  // 黑洞 / 地雷
  for (const a of G.areas) {
    if (!a.alive) continue;
    const t = a.life / a.max;
    cx.globalAlpha = 0.25 + t * 0.35;
    const grd = cx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r);
    grd.addColorStop(0, a.col); grd.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grd; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, TAU); cx.fill();
    cx.globalAlpha = 1;
    cx.strokeStyle = a.col; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(a.x, a.y, a.r * (0.6 + Math.sin(G.t * 8) * 0.06), 0, TAU); cx.stroke();
  }
  for (const m of G.mines) {
    if (!m.alive) continue;
    const bl = m.armT > 0 ? 0.4 : (0.6 + Math.sin(G.t * 12) * 0.4);
    cx.fillStyle = m.col; cx.globalAlpha = bl;
    cx.beginPath(); cx.arc(m.x, m.y, 6, 0, TAU); cx.fill();
    cx.globalAlpha = 0.18;
    cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, TAU); cx.fill();
    cx.globalAlpha = 1;
  }

  // 敌人（按 y 排序做伪 2.5D 叠放）
  const vis = [];
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.x < p.x - VW / 2 - 80 || e.x > p.x + VW / 2 + 80 || e.y < p.y - VH / 2 - 80 || e.y > p.y + VH / 2 + 80) continue;
    vis.push(e);
  }
  vis.sort((a, b) => a.y - b.y);
  for (const e of vis) {
    const img = SPR['e_' + e.type];
    const w = img.width, h = img.height;
    cx.drawImage(img, (e.x - w / 2) | 0, (e.y - h / 2) | 0);
    if (e.flash > 0) {                             // 受击白闪
      cx.globalAlpha = e.flash / 0.1 * 0.75;
      cx.globalCompositeOperation = 'lighter';
      cx.drawImage(img, (e.x - w / 2) | 0, (e.y - h / 2) | 0);
      cx.globalCompositeOperation = 'source-over';
      cx.globalAlpha = 1;
    }
    if (e.isBoss) {                                 // Boss 血条
      const bw = e.r * 2.2, hp = e.hp / e.maxHp;
      cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw, 5);
      cx.fillStyle = '#ff5a5a'; cx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw * hp, 5);
    }
  }

  // 玩家
  {
    const img = SPR['hero_' + G.hero.id];
    const bob = Math.sin(p.walkT * 10) * 1.5;
    cx.save();
    if (p.face < 0) { cx.scale(-1, 1); }
    const dx = (p.face < 0 ? -p.x - img.width / 2 : p.x - img.width / 2) | 0;
    if (p.hurtFlash > 0) cx.globalAlpha = 0.55 + Math.sin(G.t * 60) * 0.3;
    cx.drawImage(img, dx, (p.y - img.height / 2 + bob) | 0);
    cx.globalAlpha = 1;
    cx.restore();
  }

  // 玩家特殊（宠物 / 壁垒）
  drawSpecial(p);

  // 连枷（环绕体）
  for (const w of p.weapons) {
    if (WEAPONS[w.id].kind !== 'orbit') continue;
    const s = w.stats, A = p.mul.area, R = s.radius * A, rr = s.size * A;
    for (let i = 0; i < s.count; i++) {
      const a = w.orbA + i / s.count * TAU;
      const bx = p.x + Math.cos(a) * R, by = p.y + Math.sin(a) * R;
      cx.strokeStyle = 'rgba(200,200,220,.35)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(bx, by); cx.stroke();
      cx.fillStyle = WEAPONS[w.id].color;
      cx.beginPath(); cx.arc(bx, by, rr, 0, TAU); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)';
      cx.beginPath(); cx.arc(bx - rr * .3, by - rr * .3, rr * .35, 0, TAU); cx.fill();
    }
  }

  // 投射物
  for (const b of G.projs) {
    if (!b.alive) continue;
    cx.save(); cx.translate(b.x, b.y);
    if (b.enemy) {
      cx.fillStyle = b.col; cx.beginPath(); cx.arc(0, 0, b.r, 0, TAU); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.arc(-1, -1, b.r * .4, 0, TAU); cx.fill();
    } else if (b.kind === 'shuriken' || b.kind === 'boomerang') {
      cx.rotate(b.spin);
      cx.fillStyle = b.col;
      for (let i = 0; i < 4; i++) { cx.rotate(TAU / 4); cx.fillRect(-1.5, -b.r, 3, b.r); }
      cx.beginPath(); cx.arc(0, 0, b.r * .3, 0, TAU); cx.fill();
    } else if (b.kind === 'iceorb') {
      cx.rotate(b.spin * .5); cx.strokeStyle = b.col; cx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { cx.rotate(TAU / 6); cx.beginPath(); cx.moveTo(-b.r, 0); cx.lineTo(b.r, 0); cx.stroke(); }
    } else {
      const grd = cx.createRadialGradient(0, 0, 0, 0, 0, b.r * 1.6);
      grd.addColorStop(0, '#fff'); grd.addColorStop(.4, b.col); grd.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grd; cx.beginPath(); cx.arc(0, 0, b.r * 1.6, 0, TAU); cx.fill();
    }
    cx.restore();
  }

  // 特效
  for (const f of G.fx) {
    if (!f.alive) continue;
    const t = f.life / f.max;
    if (f.kind === 'p') {
      cx.globalAlpha = t; cx.fillStyle = f.col;
      cx.fillRect((f.x - f.r) | 0, (f.y - f.r) | 0, (f.r * 2) | 0, (f.r * 2) | 0);
    } else if (f.kind === 'bolt') {
      cx.globalAlpha = t; cx.strokeStyle = f.col; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(f.x, f.y);
      const seg = 4;
      for (let i = 1; i <= seg; i++) {
        const px_ = lerp(f.x, f.x2, i / seg) + rand(-7, 7);
        const py = lerp(f.y, f.y2, i / seg) + rand(-7, 7);
        cx.lineTo(px_, py);
      }
      cx.stroke();
      cx.globalAlpha = t * .5; cx.lineWidth = 7; cx.stroke();
    } else if (f.kind === 'ring') {
      cx.globalAlpha = t; cx.strokeStyle = f.col; cx.lineWidth = 4;
      cx.beginPath(); cx.arc(f.x, f.y, f.r * (1.2 - t * .3), 0, TAU); cx.stroke();
    }
    cx.globalAlpha = 1;
  }

  // 伤害数字
  cx.textAlign = 'center'; cx.font = 'bold 14px Segoe UI, sans-serif';
  for (const d of G.dmgs) {
    if (!d.alive) continue;
    const t = d.life / d.max;
    cx.globalAlpha = Math.min(1, t * 2);
    cx.fillStyle = d.crit ? '#ffe17a' : '#fff';
    cx.font = d.crit ? 'bold 19px Segoe UI, sans-serif' : 'bold 14px Segoe UI, sans-serif';
    cx.strokeStyle = 'rgba(0,0,0,.75)'; cx.lineWidth = 3;
    cx.strokeText(d.v, d.x, d.y); cx.fillText(d.v, d.x, d.y);
  }
  cx.globalAlpha = 1;
  cx.restore();

  // 玩家血条（跟随，画在世界层之上）
  drawPlayerHp(ox, oy);

  // 受伤红屏
  if (p.hurtFlash > 0) {
    cx.fillStyle = 'rgba(255,40,60,' + (p.hurtFlash * 0.9) + ')';
    cx.fillRect(0, 0, VW, VH);
  }
  // 低血警告
  if (p.hp / p.maxHp < 0.3 && G.state === 'play') {
    cx.fillStyle = 'rgba(255,30,50,' + (0.06 + Math.sin(G.t * 6) * 0.05) + ')';
    cx.fillRect(0, 0, VW, VH);
  }
}

function drawPlayerHp(ox, oy) {
  const p = G.player;
  const w = 46, x = p.x + ox - w / 2, y = p.y + oy + 22;
  cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(x, y, w, 5);
  const hp = clamp(p.hp / p.maxHp, 0, 1);
  cx.fillStyle = hp > .5 ? '#7dffa0' : hp > .25 ? '#ffcf6b' : '#ff5a5a';
  cx.fillRect(x, y, w * hp, 5);
}

function drawSpecial(p) {
  if (!G.hero) return;
  const sp = HERO_SPEC[G.hero.id] || {};
  const ready = p.specCd <= 0;
  const x = p.x, y = p.y - 36;
  cx.save();
  cx.globalAlpha = ready ? 0.95 : 0.4;
  cx.fillStyle = ready ? '#ffe17a' : '#8a8aa0';
  cx.beginPath(); cx.arc(x, y, 5, 0, TAU); cx.fill();
  if (!ready) {                                   // 冷却弧
    cx.strokeStyle = '#ffe17a'; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + (1 - p.specCd / p.specCdMax) * TAU); cx.stroke();
  }
  cx.restore();
}

/* ---------------- 主动特技（空格触发，带冷却） ---------------- */
function castSpecial(p) {
  const lv = p.lv, kind = p.special;
  if (kind === 'barrier') {                        // 林肯：樱花壁垒·爆发
    const R = 165; ring(p.x, p.y, R * 1.2, '#ff9ecf'); G.cam.shake = 10;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) { const a = Math.atan2(e.y - p.y, e.x - p.x); damageEnemy(e, 70 + lv * 10, Math.cos(a) * 260, Math.sin(a) * 260); } }
    p.specShieldT = 2.0;
  } else if (kind === 'storm') {                   // 特斯拉：电极风暴
    let src = { x: p.x, y: p.y }; const hit = new Set();
    for (let i = 0; i < 14; i++) {
      let best = null, bd = 340 ** 2;
      for (const e of G.enemies) { if (!e.alive || hit.has(e)) continue; const dd = dist2(src.x, src.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
      if (!best) break; hit.add(best); bolt(src.x, src.y, best.x, best.y, '#7ec8ff'); damageEnemy(best, 32 + lv * 4, 0, 0); src = best;
    }
  } else if (kind === 'nova') {                    // 克利奥：圣甲虫狂袭
    const R = 135; ring(p.x, p.y, R, '#3ad0c0'); G.cam.shake = 8;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) { damageEnemy(e, 50 + lv * 8, 0, 0); e.slow = Math.max(e.slow, 0.4); e.slowT = 2; } }
    const a = poolGet(G.areas, () => ({})); a.alive = true; a.x = p.x; a.y = p.y; a.r = R * 0.8; a.dmg = 18 + lv * 2; a.life = a.max = 3; a.pull = 0; a.col = '#3ad0c0'; a.tick = 0;
  } else if (kind === 'dash') {                    // 织田信长：疾风斩
    const dx = p.face >= 0 ? 1 : -1, tx = p.x + dx * 175;
    for (const e of G.enemies) { if (!e.alive) continue; if (Math.abs(e.y - p.y) < 42 && ((e.x > p.x && e.x < tx) || (e.x < p.x && e.x > tx))) damageEnemy(e, 56 + lv * 8, dx * 200, 0); }
    p.x = tx; ring(tx, p.y, 64, '#ffcf6b'); G.cam.shake = 8; p.dashSpeedT = 1.2;
  } else if (kind === 'flame') {                   // 贞德：圣焰
    const R = 155; ring(p.x, p.y, R, '#ffe17a'); G.cam.shake = 12;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) damageEnemy(e, 60 + lv * 10, 0, 0); }
    const a = poolGet(G.areas, () => ({})); a.alive = true; a.x = p.x; a.y = p.y; a.r = R * 0.85; a.dmg = 22 + lv * 3; a.life = a.max = 3.5; a.pull = 0; a.col = '#ffb04a'; a.tick = 0;
  }
  p.specCd = p.specCdMax;
  toast((HERO_SPEC[G.hero.id] || {}).name + '！');
}

/* ---------------- 特殊技能冷却 / 临时增益 tick ---------------- */
function updateSpecial(p, dt) {
  if (p.specCd > 0) p.specCd = Math.max(0, p.specCd - dt);
  if (p.specShieldT > 0) p.specShieldT -= dt;
  if (p.dashSpeedT > 0) p.dashSpeedT -= dt;
  p.specT += dt; p.petA += dt * 2.4;
}

/* ---------------- 玩家更新 ---------------- */
function updatePlayer(dt) {
  const p = G.player;
  let dx = 0, dy = 0;
  if (keys.KeyA || keys.ArrowLeft) dx--;
  if (keys.KeyD || keys.ArrowRight) dx++;
  if (keys.KeyW || keys.ArrowUp) dy--;
  if (keys.KeyS || keys.ArrowDown) dy++;
  if (dx || dy) {
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    const sp = p.speed * p.mul.speed * (p.dashSpeedT > 0 ? 1.6 : 1);
    p.x += dx * sp * dt; p.y += dy * sp * dt;
    p.walkT += dt; if (dx !== 0) p.face = dx > 0 ? 1 : -1;
  }
  if (p.inv > 0) p.inv -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  // 武器冷却
  for (const w of p.weapons) {
    const d = WEAPONS[w.id];
    if (d.kind === 'orbit') { updateOrbit(w, p, dt); continue; }
    w.t -= dt;
    if (w.t <= 0) {
      w.t = Math.max(0.08, w.stats.cd * p.mul.cd);
      fireWeapon(w, p);
    }
  }
  updateSpecial(p, dt);
}

/* ---------------- HUD ---------------- */
function updateHud() {
  const p = G.player;
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
    if (p.specCd > 0) { $('spec-txt').textContent = p.specCd.toFixed(1) + 's'; $('spec').classList.add('cd'); $('spec-bar').style.width = (p.specCd / p.specCdMax * 100) + '%'; }
    else { $('spec-txt').textContent = '就绪'; $('spec').classList.remove('cd'); $('spec-bar').style.width = '100%'; }
  }
}
function rebuildWpnBar() {
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

/* ---------------- 升级面板 ---------------- */
function openLevelUp(fromChest) {
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

/* ---------------- 局流程 ---------------- */
function startRun(hero, stage) {
  G.stage = stage;
  G.time = stage.time; G.theme = stage.theme; G.waves = stage.waves; G.boss = stage.boss; G.diffMul = stage.diffMul;
  G.hero = hero;
  G.state = 'play'; G.t = 0; G.kills = 0; G.gold = 0;
  G.enemies.length = 0; G.projs.length = 0; G.pickups.length = 0;
  G.fx.length = 0; G.dmgs.length = 0; G.areas.length = 0; G.mines.length = 0;
  dmgActive = 0;
  G.grid = new Grid(90);
  G.waveIdx = 0; G.spawnAcc = 0; G.firedSpecials = {}; G.pendingLv = 0;
  G.bossAlive = false; G.win = false; G.cam.shake = 0;
  G.miniKills = 0; G.finalKilled = false;
  G.runStartAt = Date.now();
  G.player = makePlayer(hero);
  const sv0 = loadSave();
  G.player.atkSlots = sv0.slots.atk;        // 注入装备槽上限（技能树可解锁更多）
  G.player.buffSlots = sv0.slots.buff;
  buildGround();                            // 按关卡主题重建地面
  hide('menu'); hide('stages'); hide('select'); hide('results'); hide('paused'); hide('skilltree');
  show('hud');
  rebuildWpnBar();
  toast('撑到 ' + fmtTime(stage.time) + ' · 击败 ' + stage.boss.name);
}

function endRun(win) {
  G.state = 'over'; G.win = win;
  hide('hud');
  // 存档：金币 + 累计统计（驱动已解锁成就）+ 通关解锁 + 游玩时间
  const save = loadSave();
  if (G.runStartAt) save.playTime += Math.max(0, Math.floor((Date.now() - G.runStartAt) / 1000));
  const earned = earnGold(win, G.player.lv, G.kills, G.t);
  save.gold += earned;
  bumpStat(save, 'kills', G.kills);
  bumpStat(save, 'bestTime', Math.floor(G.t));
  bumpStat(save, 'bestLv', G.player.lv);
  if (win) { bumpStat(save, 'wins', 1); if (G.stage && !save.cleared.includes(G.stage.id)) save.cleared.push(G.stage.id); }
  // 时之结晶：小Boss +1、终局Boss +3
  const matsGained = (G.miniKills || 0) * 1 + (G.finalKilled ? 3 : 0);
  if (matsGained > 0) { save.mats += matsGained; bumpStat(save, 'matsGet', matsGained); }
  // 统计：解锁项 / 英雄数（驱动成就）
  let hu = 0; for (const h of HEROES) if (heroUnlocked(h, save)) hu++; save.stats.heroes = hu;
  const unlocks = Object.keys(save.unlocked).length + (save.slots.atk - 3) + (save.slots.buff - 3);
  save.stats.unlocks = unlocks;
  writeSave(save);
  updateTopres();
  $('rs-title').textContent = win ? '胜利！' : '阵亡';
  $('rs-title').className = 'rs-title ' + (win ? 'win' : 'lose');
  $('rs-sub').textContent = win ? ('你撑过了「' + (G.stage ? G.stage.name : '') + '」，' + G.stage.boss.name + ' 倒下了。')
    : '撑到 ' + fmtTime(G.t) + '。下一局早点滚雪球。';
  const p = G.player;
  const wl = p.weapons.map(w => WEAPONS[w.id].name + ' Lv' + w.lv).join('、') || '无';
  $('rs-grid').innerHTML =
    '<div class="k">关卡</div><div class="v">' + (G.stage ? G.stage.name : '-') + '</div>'
    + '<div class="k">存活时间</div><div class="v">' + fmtTime(G.t) + '</div>'
    + '<div class="k">等级</div><div class="v">Lv ' + p.lv + '</div>'
    + '<div class="k">击杀</div><div class="v">' + G.kills + '</div>'
    + '<div class="k">本局金币</div><div class="v">' + G.gold + '</div>'
    + '<div class="k">获得金币</div><div class="v">+' + earned + '（共 ' + save.gold + '）</div>'
    + (matsGained > 0 ? '<div class="k">时之结晶</div><div class="v">+' + matsGained + '（共 ' + save.mats + '）</div>' : '')
    + '<div class="k">武器</div><div class="v" style="max-width:280px">' + wl + '</div>';
  show('results');
}
function fmtTime(t) {
  const m = (t / 60) | 0, s = (t % 60) | 0;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* ---------------- 主循环 ---------------- */
let last = now();
function frame() {
  const n = now();
  let dt = (n - last) / 1000; last = n;
  if (dt > 0.05) dt = 0.05;                 // 卡帧保护
  G.dt = dt;

  if (G.state === 'play') {
    G.t += dt;
    if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) $('toast').classList.remove('show'); }
    if (G.cam.shake > 0) G.cam.shake = Math.max(0, G.cam.shake - dt * 40);
    updatePlayer(dt);
    updateDirector(dt);
    updateEnemies(dt);
    updateProjs(dt);
    updateAreas(dt);
    updatePickups(dt);
    updateFx(dt);
    updateHud();
    if (G.t >= G.time && !G.bossAlive) endRun(true);
  }
  draw();
  requestAnimationFrame(frame);
}

/* ---------------- 选角 UI（左详情 + 右网格） ---------------- */
let selHero = HEROES[0];
function firstUnlockedHero() { const s = loadSave(); return HEROES.find(h => heroUnlocked(h, s)) || HEROES[0]; }
function buildHeroList() {
  const save = loadSave();
  if (!heroUnlocked(selHero, save)) selHero = firstUnlockedHero();
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
function renderHeroDetail(h) {
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
let selStage = STAGES[0];
function buildStageList() {
  const save = loadSave();
  const box = $('stage-list'); box.innerHTML = '';
  STAGES.forEach((s, i) => {
    const unlocked = i === 0 || save.cleared.includes(STAGES[i - 1].id);
    const el = document.createElement('div');
    el.className = 'stage-card' + (unlocked ? '' : ' locked') + (s.id === selStage.id ? ' sel' : '');
    const th = s.theme;
    const swatch = document.createElement('div'); swatch.className = 'stage-swatch';
    swatch.style.background = 'linear-gradient(135deg,' + th.accent + ', ' + th.sky2 + ')';
    const nm = document.createElement('div'); nm.className = 'stage-name'; nm.textContent = s.name;
    const en = document.createElement('div'); en.className = 'stage-en'; en.textContent = s.en;
    const meta = document.createElement('div'); meta.className = 'stage-meta';
    meta.innerHTML = '<span class="star">' + s.diff + '</span><span>⏱ ' + fmtTime(s.time) + '</span><span>☠ ' + s.boss.name + '</span>';
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
}

/* ---------------- 技能树（可拖动缩放地图） ---------------- */
const SK_LAYOUT = {
  // 中心装备槽
  'slot_atk4': {x:1200, y:720}, 'slot_atk5': {x:1200, y:800},
  'slot_buff4': {x:1200, y:880}, 'slot_buff5': {x:1200, y:960},
  // 英雄
  'h_lincoln': {x:820, y:560}, 'h_tesla': {x:1580, y:560},
  'h_cleo': {x:660, y:980}, 'h_nobu': {x:1740, y:980}, 'h_joku': {x:1200, y:400},
  // 英雄绑定技能
  'flail': {x:820, y:420}, 'p_might': {x:700, y:500}, 'p_vigor': {x:920, y:500}, 'boomerang': {x:580, y:560},
  'tesla': {x:1580, y:420}, 'p_haste': {x:1700, y:500}, 'p_swift': {x:1460, y:500}, 'crossbow': {x:1820, y:560},
  'leech': {x:660, y:1120}, 'p_regen': {x:540, y:1040}, 'p_magnet': {x:780, y:1040}, 'blackhole': {x:660, y:1240},
  'shuriken': {x:1740, y:1120}, 'p_area': {x:1860, y:1040}, 'p_luck': {x:1620, y:1040}, 'minefield': {x:1740, y:1240},
  'fireball': {x:1200, y:280}, 'iceorb': {x:1320, y:340}
};
const SK_LINKS = [
  // 英雄 -> 起始武器 / 相关被动
  ['h_lincoln','flail'], ['h_lincoln','p_might'], ['h_lincoln','p_vigor'], ['h_lincoln','boomerang'],
  ['h_tesla','tesla'], ['h_tesla','p_haste'], ['h_tesla','p_swift'], ['h_tesla','crossbow'],
  ['h_cleo','leech'], ['h_cleo','p_regen'], ['h_cleo','p_magnet'], ['h_cleo','blackhole'],
  ['h_nobu','shuriken'], ['h_nobu','p_area'], ['h_nobu','p_luck'], ['h_nobu','minefield'],
  ['h_joku','fireball'], ['h_joku','iceorb'],
  // 装备槽序列
  ['slot_atk4','slot_atk5'], ['slot_buff4','slot_buff5']
];
let skSel = null;
let skPan = {x:0, y:0, scale:1, drag:false, moved:false, sx:0, sy:0, px:0, py:0};
let skEventsBound = false, skMapInited = false;

function skOwned(n, save) {
  if (n.cat === 'slot') return (save.slots[n.slot] || 3) >= n.to;
  return isUnlocked(n.id, save);
}
function skCanBuy(n, save) {
  if (skOwned(n, save)) return false;
  const prog = reqProgress(n.req, save);
  if (!prog.met) return false;
  if (n.cost.gold && save.gold < n.cost.gold) return false;
  if (n.cost.mat && save.mats < n.cost.mat) return false;
  return true;
}
function costText(n, save) {
  const parts = [];
  if (n.cost.gold) parts.push('◈ ' + n.cost.gold + (save.gold < n.cost.gold ? '（不足）' : ''));
  if (n.cost.mat) parts.push('💎 ' + n.cost.mat + (save.mats < n.cost.mat ? '（不足）' : ''));
  return parts.join('  ') || '免费';
}
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
function buildSkillTree() {
  const save = loadSave();
  updateTopres();
  const gEl = $('sk-gold'); if (gEl) gEl.textContent = save.gold;
  const mEl = $('sk-mats'); if (mEl) mEl.textContent = save.mats;
  const lines = $('sk-lines'); lines.innerHTML = '';
  const nodes = $('sk-nodes'); nodes.innerHTML = '';
  // 连线
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
  // 节点
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
}
function renderSkillDetail() {
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
function tryUnlock(n) {
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

/* ---------------- 顶部资源栏 ---------------- */
function updateTopres() {
  const s = loadSave();
  const g = $('res-gold'); if (g) g.textContent = s.gold;
  const m = $('res-mats'); if (m) m.textContent = s.mats;
}

/* ---------------- 已解锁成就 ---------------- */
let unOnlyLocked = false;
function buildUnlocks() {
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
function resetSave(slot) { clearSlot(slot === undefined ? currentSlot : slot); toast('存档已清空'); updateTopres(); buildSavesList(); }
function buildOptions() {
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
function buildSavesList() {
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
    go.onclick = (e) => { e.stopPropagation(); currentSlot = i; updateTopres(); buildSkillTree(); hide('saves'); show('skilltree'); };
    clr.onclick = (e) => { e.stopPropagation(); if (confirmReset('确定清空「存档 ' + (i + 1) + '」？该存档的金币、解锁与进度将重置。')) { resetSave(i); } };
    btns.appendChild(go); btns.appendChild(clr); el.appendChild(btns);
    box.appendChild(el);
  }
}
function fmtDate(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function fmtPlayTime(sec) { const h = (sec / 3600) | 0, m = ((sec % 3600) / 60) | 0, s = sec % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }

/* ---------------- 启动 ---------------- */
buildSprites();
buildGround();
buildHeroList();
buildStageList();
updateTopres();
$('btn-start').onclick = () => { buildSavesList(); hide('menu'); show('saves'); };
$('btn-saves-back').onclick = () => { hide('saves'); show('menu'); };
$('btn-choose').onclick = () => { hide('stages'); show('select'); };
$('btn-stage-back').onclick = () => { hide('stages'); show('skilltree'); };
$('btn-choose-back').onclick = () => { hide('select'); show('stages'); };
$('btn-unlocks').onclick = () => { buildUnlocks(); hide('menu'); show('unlocks'); };
$('btn-unlocks-back').onclick = () => { hide('unlocks'); show('menu'); };
$('un-toggle').onclick = () => { unOnlyLocked = !unOnlyLocked; buildUnlocks(); };
$('btn-options').onclick = () => { buildOptions(); hide('menu'); show('options'); };
$('btn-opt-done').onclick = () => { hide('options'); show('menu'); };
$('btn-opt-default').onclick = () => { optSettings = Object.assign({}, DEFAULT_SETTINGS); persistSettings(); buildOptions(); toast('已恢复默认'); };
$('btn-opt-reset').onclick = () => { if (confirmReset()) { resetSave(); buildOptions(); } };
$('btn-skill-back').onclick = () => { hide('skilltree'); show('saves'); skMapInited = false; };
$('sk-start').onclick = () => { hide('skilltree'); show('stages'); };
$('btn-play').onclick = () => { selHero = selHero && heroUnlocked(selHero, loadSave()) ? selHero : firstUnlockedHero(); startRun(selHero, selStage); };
$('btn-again').onclick = () => { hide('results'); show('menu'); G.state = 'menu'; G.player = null; updateTopres(); };
$('btn-exit').onclick = () => { if (typeof window.close === 'function') window.close(); };
// 暂停中的「继续 / 退出」
$('btn-resume').onclick = () => resumeGame();
$('btn-quit').onclick = () => quitToMenu();
requestAnimationFrame(frame);
