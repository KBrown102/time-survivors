// ui/draw.js · 渲染 / 地面图案 / 玩家特技可视化
import { G } from '../core/state.js';
import { TAU, rand, lerp, clamp } from '../core/util.js';
import { SPR } from '../core/sprites.js';
import { WEAPONS, HERO_SPEC } from '../config/index.js';
import { VW, VH, cx } from '../core/canvas.js';

let groundPat = null;

export function buildGround() {
  const S = 200;
  const th = G.theme || { grass1:'#1d2a1c', grass2:'#1a2618', grass3:'#2a3d26', stone:'#3a3a42', blade:'rgba(120,170,90,.35)' };
  const g = document.createElement('canvas'); g.width = g.height = S;
  const x = g.getContext('2d');
  x.fillStyle = th.grass1; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) {
    const px_ = Math.random() * S, py = Math.random() * S;
    x.fillStyle = [th.grass3, th.grass2, th.grass3][(Math.random() * 3) | 0];
    x.fillRect(px_ | 0, py | 0, 3, 3);
  }
  for (let i = 0; i < 46; i++) {
    const px_ = Math.random() * S, py = Math.random() * S;
    x.strokeStyle = th.blade; x.lineWidth = 1;
    x.beginPath(); x.moveTo(px_, py); x.lineTo(px_ + rand(-2, 2), py - rand(3, 7)); x.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const px_ = Math.random() * S, py = Math.random() * S, r = rand(3, 6);
    x.fillStyle = th.stone; x.beginPath(); x.arc(px_, py, r, 0, TAU); x.fill();
    x.fillStyle = '#4a4a54'; x.beginPath(); x.arc(px_ - 1, py - 1, r * .6, 0, TAU); x.fill();
  }
  groundPat = cx.createPattern(g, 'repeat');
}

export function draw() {
  const p = G.player, cam = G.cam;
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, VW, VH);

  if (!p) { cx.fillStyle = '#12121c'; cx.fillRect(0, 0, VW, VH); return; }

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
    if (e.flash > 0) {
      cx.globalAlpha = e.flash / 0.1 * 0.75;
      cx.globalCompositeOperation = 'lighter';
      cx.drawImage(img, (e.x - w / 2) | 0, (e.y - h / 2) | 0);
      cx.globalCompositeOperation = 'source-over';
      cx.globalAlpha = 1;
    }
    if (e.isBoss) {
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

  drawPlayerHp(ox, oy);

  if (p.hurtFlash > 0) {
    cx.fillStyle = 'rgba(255,40,60,' + (p.hurtFlash * 0.9) + ')';
    cx.fillRect(0, 0, VW, VH);
  }
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
  if (!ready) {
    cx.strokeStyle = '#ffe17a'; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + (1 - p.specCd / p.specCdMax) * TAU); cx.stroke();
  }
  cx.restore();
}
