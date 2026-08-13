// main.js · 入口：初始化画布 / 精灵 / 菜单导航 / 启动主循环
import { G } from '../core/state.js';
import { initCanvas } from '../core/canvas.js';
import { buildSprites } from '../core/sprites.js';
import { migrateOldSave, loadSave, heroUnlocked } from '../config/index.js';
import { $, hide, show, updateTopres } from './dom.js';
import { bindInput } from './input.js';
import { buildHeroList, buildStageList, buildUnlocks, buildOptions, buildSavesList, firstUnlockedHero, toggleUnlocksFilter, optDefault, optReset, resetSave, selHero, selStage } from './menu.js';
import { buildSkillTree, reinitSkillMap } from './skilltree.js';
import { startRun, resumeGame, quitToMenu, frame } from './lifecycle.js';

// 旧存档迁移（必须在任何 loadSave 之前）
migrateOldSave();

// 画布 / 精灵 / 地面
initCanvas();
buildSprites();

// 菜单初始化
buildHeroList();
buildStageList();
updateTopres();
bindInput();

// 顶部资源（常驻）
updateTopres();

/* ---------------- 主菜单 / 面板导航 ---------------- */
$('btn-start').onclick = () => { buildSavesList(); hide('menu'); show('saves'); };
$('btn-saves-back').onclick = () => { hide('saves'); show('menu'); };
$('btn-choose').onclick = () => { hide('stages'); show('select'); };
$('btn-stage-back').onclick = () => { hide('stages'); show('skilltree'); };
$('btn-choose-back').onclick = () => { hide('select'); show('stages'); };
$('btn-unlocks').onclick = () => { buildUnlocks(); hide('menu'); show('unlocks'); };
$('btn-unlocks-back').onclick = () => { hide('unlocks'); show('menu'); };
$('un-toggle').onclick = () => { toggleUnlocksFilter(); };
$('btn-options').onclick = () => { buildOptions(); hide('menu'); show('options'); };
$('btn-opt-done').onclick = () => { hide('options'); show('menu'); };
$('btn-opt-default').onclick = () => { optDefault(); };
$('btn-opt-reset').onclick = () => { optReset(); };
$('btn-skill-back').onclick = () => { hide('skilltree'); show('saves'); reinitSkillMap(); };
$('sk-start').onclick = () => { hide('skilltree'); show('stages'); };
$('btn-play').onclick = () => {
  const h = (selHero && heroUnlocked(selHero, loadSave())) ? selHero : firstUnlockedHero();
  startRun(h, selStage);
};
$('btn-again').onclick = () => {
  hide('results');
  G.state = 'menu'; G.player = null;
  show('skilltree');
  reinitSkillMap();
  buildSkillTree();
  updateTopres();
};
$('btn-exit').onclick = () => { if (typeof window.close === 'function') window.close(); };
$('btn-resume').onclick = () => resumeGame();
$('btn-quit').onclick = () => quitToMenu();

// 主循环
requestAnimationFrame(frame);
