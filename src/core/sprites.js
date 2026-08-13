// core/sprites.js · 程序化像素精灵工厂
// 所有美术在运行时用 Canvas 画出并缓存为离屏图，无任何外部图片资源。
import { TAU } from './util.js';
import { HEROES } from '../config/heroes.js';
import { ENEMIES, BOSS } from '../config/enemies.js';
import { WEAPONS } from '../config/weapons.js';
import { PASSIVES } from '../config/passives.js';

export const SPR = {};                 // 缓存：key -> canvas
export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { c, x };
}
// 硬边像素块
export function px(x, X, Y, W, H, col) { x.fillStyle = col; x.fillRect(X | 0, Y | 0, W | 0, H | 0); }
// 圆（用于身体轮廓，配合像素化放大后呈块状）
export function ci(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
export function el(x, cx, cy, rx, ry, col) {
  x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, TAU); x.fill();
}

/* ---------------- 英雄 ---------------- */
// 32x36，站立朝向观众。s = skin palette
export function drawHero(s) {
  const { c, x } = mk(32, 36);
  // 影子
  el(x, 16, 33, 10, 3, 'rgba(0,0,0,.35)');
  // 腿
  px(x, 11, 25, 4, 8, s.dark); px(x, 17, 25, 4, 8, s.dark);
  px(x, 10, 32, 6, 3, '#2a2a34'); px(x, 16, 32, 6, 3, '#2a2a34');
  // 身体（斗篷/外套）
  px(x, 8, 14, 16, 12, s.body);
  px(x, 8, 14, 16, 2, s.dark);
  px(x, 7, 16, 2, 9, s.dark); px(x, 23, 16, 2, 9, s.dark);
  // 腰带
  px(x, 8, 23, 16, 2, s.accent);
  // 手臂
  px(x, 5, 17, 3, 7, s.body); px(x, 24, 17, 3, 7, s.body);
  px(x, 5, 23, 3, 3, s.skin); px(x, 24, 23, 3, 3, s.skin);
  // 头
  px(x, 11, 5, 10, 10, s.skin);
  px(x, 11, 5, 10, 2, s.hair);           // 发际
  px(x, 9, 4, 14, 3, s.hair);            // 头发/帽檐
  // 眼睛
  px(x, 13, 9, 2, 2, '#101018'); px(x, 18, 9, 2, 2, '#101018');
  // 高光
  px(x, 13, 15, 6, 1, 'rgba(255,255,255,.18)');
  return c;
}

/* ---------------- 敌人 ---------------- */
export function drawEnemy(shape, col, dark, size) {
  const S = size, W = S * 2 + 8, H = S * 2 + 10;
  const { c, x } = mk(W, H);
  const cx = W / 2, cy = H / 2 + 1;
  el(x, cx, H - 4, S * 0.8, S * 0.28, 'rgba(0,0,0,.32)');   // 影子

  if (shape === 'rat') {
    el(x, cx, cy, S * .9, S * .65, col);
    el(x, cx + S * .6, cy - 1, S * .45, S * .4, col);       // 头
    px(x, cx - S * 1.5, cy, S * .7, 2, dark);               // 尾
    px(x, cx + S * .85, cy - 3, 2, 2, '#ff5a5a');           // 眼
    px(x, cx + S * .2, cy - S * .7, 3, 3, dark);            // 耳
  } else if (shape === 'skull') {
    el(x, cx, cy - 1, S * .8, S * .85, col);
    px(x, cx - S * .42, cy - S * .2, 3, 4, '#101018');
    px(x, cx + S * .12, cy - S * .2, 3, 4, '#101018');
    px(x, cx - 2, cy + S * .35, 4, 3, '#101018');           // 嘴
    px(x, cx - S * .7, cy + S * .55, S * 1.4, 3, dark);     // 肋
  } else if (shape === 'bat') {
    el(x, cx, cy, S * .55, S * .5, col);
    // 翅膀（上下摆动感由渲染层做，这里给静态）
    x.fillStyle = dark;
    x.beginPath(); x.moveTo(cx - S * .4, cy);
    x.lineTo(cx - S * 1.6, cy - S * .5); x.lineTo(cx - S * 1.3, cy + S * .4); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(cx + S * .4, cy);
    x.lineTo(cx + S * 1.6, cy - S * .5); x.lineTo(cx + S * 1.3, cy + S * .4); x.closePath(); x.fill();
    px(x, cx - 3, cy - 2, 2, 2, '#ff5a5a'); px(x, cx + 1, cy - 2, 2, 2, '#ff5a5a');
  } else if (shape === 'raptor') {
    el(x, cx - 1, cy + 1, S * .95, S * .6, col);            // 身
    x.fillStyle = dark;                                     // 尾
    x.beginPath(); x.moveTo(cx - S * .7, cy);
    x.lineTo(cx - S * 1.7, cy - S * .45); x.lineTo(cx - S * .7, cy + S * .35); x.closePath(); x.fill();
    el(x, cx + S * .75, cy - S * .45, S * .5, S * .38, col);// 头
    px(x, cx + S * 1.0, cy - S * .5, 3, 2, '#ffe17a');      // 眼
    px(x, cx + S * .95, cy - S * .15, S * .5, 2, '#f0f0e0');// 牙
    px(x, cx - 2, cy + S * .5, 3, S * .55, dark);           // 腿
    px(x, cx + S * .4, cy + S * .5, 3, S * .55, dark);
  } else if (shape === 'wolf') {
    el(x, cx, cy, S * 1.0, S * .55, col);
    el(x, cx + S * .8, cy - S * .3, S * .45, S * .35, col);
    x.fillStyle = dark;
    x.beginPath(); x.moveTo(cx + S * .55, cy - S * .55);
    x.lineTo(cx + S * .7, cy - S * 1.0); x.lineTo(cx + S * .9, cy - S * .55); x.closePath(); x.fill(); // 耳
    px(x, cx + S * 1.05, cy - S * .35, 2, 2, '#ffe17a');
    px(x, cx - S * 1.3, cy - S * .2, S * .5, 3, dark);      // 尾
    px(x, cx - S * .5, cy + S * .45, 3, S * .5, dark);
    px(x, cx + S * .35, cy + S * .45, 3, S * .5, dark);
  } else if (shape === 'witch') {
    el(x, cx, cy + S * .35, S * .75, S * .6, col);          // 袍
    el(x, cx, cy - S * .3, S * .42, S * .42, '#e0b088');    // 脸
    x.fillStyle = dark;                                     // 尖帽
    x.beginPath(); x.moveTo(cx - S * .7, cy - S * .55);
    x.lineTo(cx, cy - S * 1.5); x.lineTo(cx + S * .7, cy - S * .55); x.closePath(); x.fill();
    px(x, cx - S * .8, cy - S * .55, S * 1.6, 3, dark);
    px(x, cx - 4, cy - S * .35, 2, 2, '#101018'); px(x, cx + 2, cy - S * .35, 2, 2, '#101018');
    px(x, cx + S * .6, cy, 2, S * .9, '#8a6a3a');           // 法杖
    ci(x, cx + S * .7, cy - S * .1, 3, '#c89aff');
  } else if (shape === 'brute') {
    el(x, cx, cy + S * .2, S * 1.0, S * .8, col);           // 大身
    px(x, cx - S * .3, cy - S * .95, S * .6, S * .5, col);  // 头
    px(x, cx - S * .22, cy - S * .82, 3, 3, '#ff5a5a'); px(x, cx + S * .05, cy - S * .82, 3, 3, '#ff5a5a');
    px(x, cx - S * 1.15, cy - S * .1, S * .35, S * .7, dark);// 臂
    px(x, cx + S * .8, cy - S * .1, S * .35, S * .7, dark);
    px(x, cx + S * .95, cy - S * .5, S * .5, 4, '#b0b0b8'); // 棒
    px(x, cx - S * .5, cy + S * .85, S * .35, S * .4, dark);
    px(x, cx + S * .15, cy + S * .85, S * .35, S * .4, dark);
  } else if (shape === 'trex') {
    el(x, cx - S * .1, cy + S * .1, S * 1.0, S * .7, col);
    x.fillStyle = dark;                                     // 大尾
    x.beginPath(); x.moveTo(cx - S * .8, cy);
    x.lineTo(cx - S * 1.9, cy - S * .6); x.lineTo(cx - S * .8, cy + S * .45); x.closePath(); x.fill();
    el(x, cx + S * .85, cy - S * .5, S * .6, S * .45, col); // 头
    px(x, cx + S * 1.15, cy - S * .6, 4, 3, '#ffe17a');     // 眼
    px(x, cx + S * .95, cy - S * .18, S * .7, 3, '#fff8e0');// 牙
    px(x, cx - S * .25, cy + S * .6, 5, S * .7, dark);      // 腿
    px(x, cx + S * .45, cy + S * .6, 5, S * .7, dark);
    // 背刺
    for (let i = 0; i < 4; i++) {
      x.fillStyle = dark;
      const bx = cx - S * .6 + i * S * .4;
      x.beginPath(); x.moveTo(bx, cy - S * .5);
      x.lineTo(bx + S * .12, cy - S * .85); x.lineTo(bx + S * .25, cy - S * .5); x.closePath(); x.fill();
    }
  } else if (shape === 'boss') {
    // 时之守护者：石像 + 齿轮环
    el(x, cx, cy + S * .25, S * .95, S * .85, col);
    px(x, cx - S * .45, cy - S * 1.05, S * .9, S * .7, col);// 头
    px(x, cx - S * .3, cy - S * .85, S * .18, S * .18, '#7ec8ff');
    px(x, cx + S * .12, cy - S * .85, S * .18, S * .18, '#7ec8ff');
    px(x, cx - S * .55, cy - S * 1.15, S * 1.1, 4, dark);
    px(x, cx - S * 1.25, cy - S * .2, S * .35, S * .9, dark);
    px(x, cx + S * .9, cy - S * .2, S * .35, S * .9, dark);
    // 齿轮环
    x.strokeStyle = '#7ec8ff'; x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, S * 1.25, 0, TAU); x.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      px(x, cx + Math.cos(a) * S * 1.25 - 2, cy + Math.sin(a) * S * 1.25 - 2, 5, 5, '#7ec8ff');
    }
  }
  return c;
}

/* ---------------- 武器/被动图标 ---------------- */
export function drawIcon(kind, col, size) {
  const S = size || 26;
  const { c, x } = mk(S, S);
  const h = S / 2;
  x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2.5;
  switch (kind) {
    case 'flail':
      x.beginPath(); x.moveTo(3, S - 3); x.lineTo(h + 2, h - 2); x.stroke();
      ci(x, h + 5, h - 5, S * .22, col); break;
    case 'fireball':
      ci(x, h, h + 1, S * .3, col); ci(x, h, h - 1, S * .18, '#ffe17a');
      x.beginPath(); x.moveTo(h - 5, 4); x.lineTo(h, h - 5); x.lineTo(h + 5, 4); x.stroke(); break;
    case 'shuriken':
      x.beginPath();
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; x.moveTo(h, h); x.lineTo(h + Math.cos(a) * h * .8, h + Math.sin(a) * h * .8); }
      x.stroke(); ci(x, h, h, 3, col); break;
    case 'boomerang':
      x.beginPath(); x.arc(h, h + 3, S * .32, Math.PI * 1.1, Math.PI * 1.9); x.lineWidth = 4; x.stroke(); break;
    case 'tesla':
      x.beginPath(); x.moveTo(h + 3, 3); x.lineTo(h - 4, h); x.lineTo(h + 2, h); x.lineTo(h - 4, S - 3); x.lineWidth = 3; x.stroke(); break;
    case 'blackhole':
      x.beginPath(); x.arc(h, h, S * .32, 0, TAU); x.stroke(); ci(x, h, h, S * .14, col); break;
    case 'minefield':
      ci(x, h, h + 2, S * .26, col);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.beginPath(); x.moveTo(h + Math.cos(a) * S * .26, h + 2 + Math.sin(a) * S * .26); x.lineTo(h + Math.cos(a) * S * .42, h + 2 + Math.sin(a) * S * .42); x.stroke(); }
      break;
    case 'leech':
      el(x, h, h, S * .18, S * .32, col); px(x, h - 2, h - 6, 2, 2, '#101018'); px(x, h + 1, h - 6, 2, 2, '#101018'); break;
    case 'iceorb':
      x.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.moveTo(h, h); x.lineTo(h + Math.cos(a) * h * .75, h + Math.sin(a) * h * .75); }
      x.stroke(); break;
    case 'crossbow':
      x.beginPath(); x.moveTo(4, h); x.lineTo(S - 4, h); x.stroke();
      x.beginPath(); x.moveTo(S - 10, h - 5); x.lineTo(S - 4, h); x.lineTo(S - 10, h + 5); x.stroke();
      x.beginPath(); x.arc(6, h, 7, -1.1, 1.1); x.stroke(); break;
    // 被动
    case 'might': x.beginPath(); x.moveTo(h, 4); x.lineTo(h - 6, h + 6); x.lineTo(h + 6, h + 6); x.closePath(); x.fill(); px(x, h - 2, h + 6, 4, S - h - 8, col); break;
    case 'haste': x.beginPath(); x.moveTo(h + 4, 3); x.lineTo(h - 5, h + 2); x.lineTo(h, h + 2); x.lineTo(h - 3, S - 3); x.lineTo(h + 6, h - 2); x.lineTo(h + 1, h - 2); x.closePath(); x.fill(); break;
    case 'area': x.beginPath(); x.arc(h, h, S * .34, 0, TAU); x.stroke(); x.beginPath(); x.arc(h, h, S * .16, 0, TAU); x.stroke(); break;
    case 'swift': for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(4, h - 6 + i * 6); x.lineTo(S - 5, h - 6 + i * 6); x.lineWidth = 2; x.stroke(); } break;
    case 'vigor': x.beginPath(); x.moveTo(h, S - 5); x.bezierCurveTo(-2, h, 4, 2, h, 8); x.bezierCurveTo(S - 4, 2, S + 2, h, h, S - 5); x.fill(); break;
    case 'regen': x.beginPath(); x.arc(h, h, S * .3, .5, TAU); x.stroke(); x.beginPath(); x.moveTo(h + 6, h - 8); x.lineTo(h + 9, h - 2); x.lineTo(h + 2, h - 3); x.closePath(); x.fill(); break;
    case 'luck': x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i / 5 * TAU; const r1 = h * .8, r2 = h * .36; x.lineTo(h + Math.cos(a) * r1, h + Math.sin(a) * r1); const b = a + TAU / 10; x.lineTo(h + Math.cos(b) * r2, h + Math.sin(b) * r2); } x.closePath(); x.fill(); break;
    case 'magnet':
      x.lineWidth = 4; x.beginPath(); x.arc(h, h + 2, S * .28, Math.PI, 0); x.stroke();
      px(x, h - S * .28 - 2, h + 2, 4, 6, col); px(x, h + S * .28 - 2, h + 2, 4, 6, col); break;
  }
  return c;
}

/* ---------------- 拾取物 ---------------- */
export function drawGem(col, s) {
  const { c, x } = mk(s * 2, s * 2);
  x.fillStyle = col;
  x.beginPath(); x.moveTo(s, 1); x.lineTo(s * 2 - 1, s); x.lineTo(s, s * 2 - 1); x.lineTo(1, s); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,.45)';
  x.beginPath(); x.moveTo(s, 3); x.lineTo(s * 1.5, s); x.lineTo(s, s * .9); x.closePath(); x.fill();
  return c;
}
export function drawCoin() {
  const { c, x } = mk(14, 14);
  ci(x, 7, 7, 6, '#c08a20'); ci(x, 7, 7, 4.5, '#ffcf6b');
  px(x, 6, 4, 2, 6, '#c08a20'); return c;
}
export function drawHeart() {
  const { c, x } = mk(16, 16);
  x.fillStyle = '#ff5a7a';
  x.beginPath(); x.moveTo(8, 14); x.bezierCurveTo(-1, 7, 2, 1, 8, 5); x.bezierCurveTo(14, 1, 17, 7, 8, 14); x.fill();
  px(x, 5, 5, 2, 2, 'rgba(255,255,255,.6)'); return c;
}
export function drawChest() {
  const { c, x } = mk(22, 18);
  px(x, 1, 6, 20, 11, '#8a5a2a'); px(x, 1, 6, 20, 3, '#a06a3a');
  x.fillStyle = '#a06a3a'; x.beginPath(); x.ellipse(11, 7, 10, 6, 0, Math.PI, 0); x.fill();
  px(x, 9, 8, 4, 6, '#ffcf6b'); px(x, 0, 11, 22, 2, '#5a3a1a'); return c;
}

/* ---------------- 建缓存 ---------------- */
export function buildSprites() {
  HEROES.forEach(h => SPR['hero_' + h.id] = drawHero(h.skin));
  for (const k in ENEMIES) { const e = ENEMIES[k]; SPR['e_' + k] = drawEnemy(e.shape, e.color, e.dark, e.r); }
  SPR['e_boss'] = drawEnemy(BOSS.shape, BOSS.color, BOSS.dark, BOSS.r);
  for (const k in WEAPONS) SPR['i_' + k] = drawIcon(k, WEAPONS[k].color, 30);
  for (const k in PASSIVES) SPR['i_' + k] = drawIcon(k, PASSIVES[k].color, 30);
  SPR.gem1 = drawGem('#4fc3f7', 5); SPR.gem2 = drawGem('#7dffa0', 7); SPR.gem3 = drawGem('#ffcf6b', 9);
  SPR.coin = drawCoin(); SPR.heart = drawHeart(); SPR.chest = drawChest();
}
