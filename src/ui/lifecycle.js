// ui/lifecycle.js · 主动特技 / 玩家更新 / 局流程 / 主循环
import { G, _near } from '../core/state.js';
import { TAU, rand, dist2, clamp, now, fmtTime } from '../core/util.js';
import { SPR } from '../core/sprites.js';
import { WEAPONS, HERO_SPEC, HEROES, loadSave, earnGold, bumpStat, heroUnlocked, writeSave } from '../config/index.js';
import { makePlayer, damageEnemy, hurtPlayer, dmgScale, Grid, poolGet, updateDirector, updateEnemies } from '../core/engine.js';
import { bolt, ring, fireWeapon, updateOrbit, updateProjs, updateAreas, updatePickups, updateFx, resetDmgActive } from '../core/combat.js';
import { draw, buildGround } from './draw.js';
import { updateHud, rebuildWpnBar } from './hud.js';
import { $, toast, hide, show, updateTopres } from './dom.js';
import { keys } from './input.js';

/* ---------------- 主动特技（空格触发，带冷却） ---------------- */
export function castSpecial(p) {
  const lv = p.lv, kind = p.special;
  if (kind === 'barrier') {
    const R = 165; ring(p.x, p.y, R * 1.2, '#ff9ecf'); G.cam.shake = 10;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) { const a = Math.atan2(e.y - p.y, e.x - p.x); damageEnemy(e, 70 + lv * 10, Math.cos(a) * 260, Math.sin(a) * 260); } }
    p.specShieldT = 2.0;
  } else if (kind === 'storm') {
    let src = { x: p.x, y: p.y }; const hit = new Set();
    for (let i = 0; i < 14; i++) {
      let best = null, bd = 340 ** 2;
      for (const e of G.enemies) { if (!e.alive || hit.has(e)) continue; const dd = dist2(src.x, src.y, e.x, e.y); if (dd < bd) { bd = dd; best = e; } }
      if (!best) break; hit.add(best); bolt(src.x, src.y, best.x, best.y, '#7ec8ff'); damageEnemy(best, 32 + lv * 4, 0, 0); src = best;
    }
  } else if (kind === 'nova') {
    const R = 135; ring(p.x, p.y, R, '#3ad0c0'); G.cam.shake = 8;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) { damageEnemy(e, 50 + lv * 8, 0, 0); e.slow = Math.max(e.slow, 0.4); e.slowT = 2; } }
    const a = poolGet(G.areas, () => ({})); a.alive = true; a.x = p.x; a.y = p.y; a.r = R * 0.8; a.dmg = 18 + lv * 2; a.life = a.max = 3; a.pull = 0; a.col = '#3ad0c0'; a.tick = 0;
  } else if (kind === 'dash') {
    const dx = p.face >= 0 ? 1 : -1, tx = p.x + dx * 175;
    for (const e of G.enemies) { if (!e.alive) continue; if (Math.abs(e.y - p.y) < 42 && ((e.x > p.x && e.x < tx) || (e.x < p.x && e.x > tx))) damageEnemy(e, 56 + lv * 8, dx * 200, 0); }
    p.x = tx; ring(tx, p.y, 64, '#ffcf6b'); G.cam.shake = 8; p.dashSpeedT = 1.2;
  } else if (kind === 'flame') {
    const R = 155; ring(p.x, p.y, R, '#ffe17a'); G.cam.shake = 12;
    G.grid.near(p.x, p.y, _near);
    for (const e of _near) { if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < R + e.r) damageEnemy(e, 60 + lv * 10, 0, 0); }
    const a = poolGet(G.areas, () => ({})); a.alive = true; a.x = p.x; a.y = p.y; a.r = R * 0.85; a.dmg = 22 + lv * 3; a.life = a.max = 3.5; a.pull = 0; a.col = '#ffb04a'; a.tick = 0;
  }
  p.specCd = p.specCdMax;
  toast((HERO_SPEC[G.hero.id] || {}).name + '！');
}

export function updateSpecial(p, dt) {
  if (p.specCd > 0) p.specCd = Math.max(0, p.specCd - dt);
  if (p.specShieldT > 0) p.specShieldT -= dt;
  if (p.dashSpeedT > 0) p.dashSpeedT -= dt;
  p.specT += dt; p.petA += dt * 2.4;
}

export function updatePlayer(dt) {
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

export function startRun(hero, stage) {
  G.stage = stage;
  G.time = stage.time; G.theme = stage.theme; G.waves = stage.waves; G.boss = stage.boss; G.diffMul = stage.diffMul;
  G.hero = hero;
  G.state = 'play'; G.t = 0; G.kills = 0; G.gold = 0;
  G.enemies.length = 0; G.projs.length = 0; G.pickups.length = 0;
  G.fx.length = 0; G.dmgs.length = 0; G.areas.length = 0; G.mines.length = 0;
  resetDmgActive();
  G.grid = new Grid(90);
  G.waveIdx = 0; G.spawnAcc = 0; G.firedSpecials = {}; G.pendingLv = 0;
  G.bossAlive = false; G.win = false; G.cam.shake = 0;
  G.miniKills = 0; G.finalKilled = false;
  G.runStartAt = Date.now();
  G.player = makePlayer(hero);
  const sv0 = loadSave();
  G.player.atkSlots = sv0.slots.atk;
  G.player.buffSlots = sv0.slots.buff;
  buildGround();
  hide('menu'); hide('stages'); hide('select'); hide('results'); hide('paused'); hide('skilltree');
  show('hud');
  rebuildWpnBar();
  toast('撑到 ' + fmtTime(stage.time) + ' · 击败 ' + stage.boss.name);
}

export function endRun(win) {
  G.state = 'over'; G.win = win;
  hide('hud');
  const save = loadSave();
  if (G.runStartAt) save.playTime += Math.max(0, Math.floor((Date.now() - G.runStartAt) / 1000));
  const earned = earnGold(win, G.player.lv, G.kills, G.t);
  save.gold += earned;
  bumpStat(save, 'kills', G.kills);
  bumpStat(save, 'bestTime', Math.floor(G.t));
  bumpStat(save, 'bestLv', G.player.lv);
  if (win) { bumpStat(save, 'wins', 1); if (G.stage && !save.cleared.includes(G.stage.id)) save.cleared.push(G.stage.id); }
  const matsGained = (G.miniKills || 0) * 1 + (G.finalKilled ? 3 : 0);
  if (matsGained > 0) { save.mats += matsGained; bumpStat(save, 'matsGet', matsGained); }
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

export function resumeGame() { if (G.state === 'pause') { G.state = 'play'; hide('paused'); } }
export function quitToMenu() {
  G.state = 'menu'; G.player = null;
  hide('paused'); hide('hud');
  updateTopres();
  show('menu');
}

let last = now();
export function frame() {
  const n = now();
  let dt = (n - last) / 1000; last = n;
  if (dt > 0.05) dt = 0.05;
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

