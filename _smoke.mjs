/* 无头冒烟测试（ESM 版）：桩件模拟浏览器环境，import 真实模块图，跑通整局逻辑。
   覆盖：三存档读写·切换·清档 / 多关卡遍历 / 技能树地图(节点·连线·激活·材料扩槽) /
        ESC暂停·退出 / 空格主动特技+冷却 / 升级卡只出已激活技能 / 装备槽上限 /
        Boss掉落时之结晶 / 胜负判定 / UI构建与菜单导航。 */
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/* ---------- 浏览器环境桩件 ---------- */
function makeCtx() {
  const noop = () => {};
  return new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return { width: 0, height: 0 };
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createPattern') return () => ({});
      if (p === 'createLinearGradient' || p === 'createRadialGradient')
        return () => ({ addColorStop: noop });
      if (p === 'getImageData') return () => ({ data: [] });
      return (...a) => {};
    },
    set() { return true; }
  });
}
function makeEl(tag) {
  const el = {
    tag, children: [], style: {}, _cls: new Set(), _text: '', value: '', type: '', disabled: false,
    min: 0, max: 0, selected: false, width: 0, height: 0,
    onclick: null, oninput: null, onchange: null,
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore(c, ref) {
      const i = this.children.indexOf(ref);
      if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
      c.parentNode = this; return c;
    },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get firstChild() { return this.children[0] || null; },
    set innerHTML(v) { this.children.length = 0; },
    get innerHTML() { return ''; },
    set textContent(v) { this._text = v; },
    get textContent() { return this._text; },
    set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return [...this._cls].join(' '); },
    cloneNode() { return makeEl(this.tag); },
    getContext() { return makeCtx(); },
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 540 }; },
    querySelector(sel) {
      if (!sel) return null;
      const cls = sel.replace('.', '');
      function find(node) { if (node._cls && node._cls.has(cls)) return node; for (const c of node.children) { const r = find(c); if (r) return r; } return null; }
      return find(this);
    },
    querySelectorAll(sel) {
      if (!sel) return [];
      const cls = sel.replace('.', '');
      const out = []; const find = node => { if (node._cls && node._cls.has(cls)) out.push(node); for (const c of node.children) find(c); };
      find(this); return out;
    },
    closest(sel) {
      if (!sel) return null;
      const cls = sel.replace('.', '');
      let node = this;
      while (node) { if (node._cls && node._cls.has(cls)) return node; node = node.parentNode; }
      return null;
    },
    setAttribute(k, v) { (this._attr || (this._attr = {}))[k] = v; },
    getAttribute(k) { return (this._attr || {})[k]; },
  };
  el.classList = {
    add: c => el._cls.add(c), remove: c => el._cls.delete(c),
    contains: c => el._cls.has(c),
    toggle: c => el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c),
  };
  return el;
}
const elements = {};
globalThis.document = {
  getElementById(id) { return elements[id] || (elements[id] = makeEl('div')); },
  createElement(tag) { return makeEl(tag); },
  createElementNS(ns, tag) { return makeEl(tag); },
  body: makeEl('body'),
  addEventListener() {},
};
globalThis.window = globalThis;
globalThis.innerWidth = 960;
globalThis.innerHeight = 540;
const __listeners = {};
globalThis.__listeners = __listeners;
globalThis.addEventListener = (type, fn) => { (__listeners[type] || (__listeners[type] = [])).push(fn); };
globalThis.removeEventListener = () => {};
const _ls = new Map();
globalThis.localStorage = { getItem(k) { return _ls.has(k) ? _ls.get(k) : null; }, setItem(k, v) { _ls.set(k, String(v)); }, removeItem(k) { _ls.delete(k); } };
globalThis.__T = 0;
globalThis.performance = { now: () => globalThis.__T };
globalThis.__raf = null;
globalThis.requestAnimationFrame = fn => { globalThis.__raf = fn; };

/* ---------- import 真实模块图（main.js 会执行初始化与菜单绑定） ---------- */
const state = await import('./src/core/state.js');
const util = await import('./src/core/util.js');
const canvas = await import('./src/core/canvas.js');
const sprites = await import('./src/core/sprites.js');
const cfg = await import('./src/config/index.js');
const eng = await import('./src/core/engine.js');
const com = await import('./src/core/combat.js');
const dom = await import('./src/ui/dom.js');
const life = await import('./src/ui/lifecycle.js');
const menu = await import('./src/ui/menu.js');
const sk = await import('./src/ui/skilltree.js');

// 把需要的绑定挂到 globalThis，使 driver 字符串以全局名访问（与旧版一致）
Object.assign(globalThis, {
  G: state.G, _near: state._near,
  TAU: util.TAU, rand: util.rand, randInt: util.randInt, clamp: util.clamp, lerp: util.lerp, dist2: util.dist2, pick: util.pick, now: util.now,
  SPR: sprites.SPR, buildSprites: sprites.buildSprites, VW: canvas.VW, VH: canvas.VH,
  HEROES: cfg.HEROES, HERO_BY_ID: cfg.HERO_BY_ID, HERO_SPEC: cfg.HERO_SPEC,
  WEAPONS: cfg.WEAPONS, WEAPON_IDS: cfg.WEAPON_IDS, PASSIVES: cfg.PASSIVES, PASSIVE_IDS: cfg.PASSIVE_IDS,
  ENEMIES: cfg.ENEMIES, BOSS: cfg.BOSS, WAVES: cfg.WAVES, GAME_TIME: cfg.GAME_TIME,
  STAGES: cfg.STAGES, UNLOCKS: cfg.UNLOCKS, UNLOCK_BY_ID: cfg.UNLOCK_BY_ID,
  LANGS: cfg.LANGS, DEFAULT_SETTINGS: cfg.DEFAULT_SETTINGS, SAVE_KEY: cfg.SAVE_KEY, SAVE_SLOTS: cfg.SAVE_SLOTS,
  loadSave: cfg.loadSave, writeSave: cfg.writeSave, migrateOldSave: cfg.migrateOldSave, clearSlot: cfg.clearSlot,
  bumpStat: cfg.bumpStat, isUnlocked: cfg.isUnlocked, heroUnlocked: cfg.heroUnlocked, earnGold: cfg.earnGold,
  setSlot: cfg.setSlot, getSlot: cfg.getSlot, reqProgress: cfg.reqProgress, reqLabel: cfg.reqLabel,
  SKILL_GROUPS: cfg.SKILL_GROUPS, SKILL_NODES: cfg.SKILL_NODES, SKILL_NODE_BY_ID: cfg.SKILL_NODE_BY_ID,
  Grid: eng.Grid, makePlayer: eng.makePlayer, weaponStats: eng.weaponStats, addWeapon: eng.addWeapon, upWeapon: eng.upWeapon,
  spawnEnemy: eng.spawnEnemy, spawnRing: eng.spawnRing, spawnLine: eng.spawnLine, hpScale: eng.hpScale, dmgScale: eng.dmgScale,
  updateDirector: eng.updateDirector, updateEnemies: eng.updateEnemies, damageEnemy: eng.damageEnemy, killEnemy: eng.killEnemy, hurtPlayer: eng.hurtPlayer,
  DMG_CAP: com.DMG_CAP, burst: com.burst, bolt: com.bolt, ring: com.ring, pushDmg: com.pushDmg,
  fireWeapon: com.fireWeapon, findNearest: com.findNearest, updateProjs: com.updateProjs, updateAreas: com.updateAreas,
  updatePickups: com.updatePickups, gainXp: com.gainXp, rollCards: com.rollCards, applyCard: com.applyCard,
  startRun: life.startRun, endRun: life.endRun, resumeGame: life.resumeGame, quitToMenu: life.quitToMenu,
  castSpecial: life.castSpecial, updateSpecial: life.updateSpecial, updatePlayer: life.updatePlayer, frame: life.frame,
  buildHeroList: menu.buildHeroList, renderHeroDetail: menu.renderHeroDetail, firstUnlockedHero: menu.firstUnlockedHero,
  buildStageList: menu.buildStageList, buildUnlocks: menu.buildUnlocks, buildOptions: menu.buildOptions,
  buildSavesList: menu.buildSavesList, toggleUnlocksFilter: menu.toggleUnlocksFilter, optDefault: menu.optDefault,
  optReset: menu.optReset, resetSave: menu.resetSave, fmtDate: menu.fmtDate, fmtPlayTime: menu.fmtPlayTime,
  selHero: menu.selHero, selStage: menu.selStage,
  buildSkillTree: sk.buildSkillTree, renderSkillDetail: sk.renderSkillDetail, tryUnlock: sk.tryUnlock,
  skOwned: sk.skOwned, skCanBuy: sk.skCanBuy, costText: sk.costText, SK_LAYOUT: sk.SK_LAYOUT, SK_LINKS: sk.SK_LINKS, reinitSkillMap: sk.reinitSkillMap,
  $: dom.$, show: dom.show, hide: dom.hide, toast: dom.toast, updateTopres: dom.updateTopres,
});

await import('./src/ui/main.js');   // 执行初始化与菜单按钮绑定（requestAnimationFrame 已被桩件捕获）

/* ---------- 驱动逻辑（与旧版等价，currentSlot -> setSlot/getSlot） ---------- */
const driver = `
(function(){
  const R = {};
  function step(n){ for(let i=0;i<n;i++){ globalThis.__T += 16; if(globalThis.__raf) globalThis.__raf(); if(G.state==='over') return; } }
  function dispatchKey(code){ (globalThis.__listeners.keydown||[]).forEach(function(fn){ fn({ code: code, preventDefault: function(){} }); }); }
  function putSave(s, slot){ slot = (slot === undefined ? getSlot() : slot); localStorage.setItem(SAVE_KEY + '_' + slot, JSON.stringify(Object.assign({ gold:0, unlocked:{}, slots:{atk:3,buff:3}, mats:0, cleared:[], settings:{}, stats:{}, createdAt:Date.now(), playTime:0 }, s))); }
  function clearAllSaves(){ for(let i=0;i<SAVE_SLOTS;i++) localStorage.removeItem(SAVE_KEY + '_' + i); localStorage.removeItem(SAVE_KEY); }

  // === 0. 三存档系统：独立读写 / 切换 / 清档确认 ===
  let saveSystemOk = false;
  try {
    clearAllSaves();
    putSave({ gold:100, playTime:3600 }, 0); putSave({ gold:200, playTime:7200 }, 1); putSave({ gold:300, playTime:1800 }, 2);
    setSlot(1);
    const s1 = loadSave(); const s0 = loadSave(0);
    const switchOk = (s1.gold === 200 && s0.gold === 100 && s1.playTime === 7200);
    buildSavesList();
    const savesGrid = document.getElementById('saves-grid');
    const saveCards = savesGrid.children.length;
    const clrBtn = saveCards > 0 ? savesGrid.children[0].querySelector('.save-clr') : null;
    clrBtn && clrBtn.onclick({ stopPropagation:function(){} });
    const cleared = loadSave(0).gold === 0 && loadSave(0).playTime === 0;
    saveSystemOk = switchOk && saveCards === SAVE_SLOTS && cleared;
  } catch (e) { console.error('SAVEBUG ' + (e.stack||e)); }

  // === 1. 多关卡遍历 ===
  const stageState = {};
  for (const st of STAGES) {
    startRun(HEROES[0], st);
    const p = G.player; p.maxHp = 1e9; p.hp = 1e9;
    for (const id of WEAPON_IDS) if (!p.weapons.find(function(w){ return w.id===id; })) addWeapon(p, id);
    for (const id of PASSIVE_IDS) if (!(id in p.passives)) { p.passives[id] = 1; PASSIVES[id].apply(p); }
    for (const t of Object.keys(ENEMIES)) spawnEnemy(t, p.x + rand(-140,140), p.y + rand(-140,140), hpScale());
    G.t = st.time - 1; G.firedSpecials = {};
    spawnEnemy(null, p.x + 200, p.y, 1, true); G.bossAlive = true;
    step(300);
    stageState[st.id] = (G.state === 'over') ? 'ended' : 'alive';
  }
  R.stagesRun = STAGES.length;
  R.allStagesOk = Object.values(stageState).every(function(v){ return v==='alive' || v==='ended'; });

  // === 2. 技能树地图 ===
  putSave({ gold:9999, stats:{ kills:99999 } });
  let mapNodesOk = false, mapLinksOk = false, mapHeroOk = false;
  try {
    buildSkillTree();
    const nodeCount = document.getElementById('sk-nodes').children.length;
    const lineCount = document.getElementById('sk-lines').children.length;
    mapNodesOk = nodeCount === SKILL_NODES.length;
    mapLinksOk = lineCount === SK_LINKS.length;
    const heroNode = document.getElementById('sk-nodes').querySelector('.hero');
    mapHeroOk = !!heroNode && heroNode.children.some(function(c){ return c.tag === 'canvas'; });
  } catch (e) { console.error('MAPBUG ' + (e.stack||e)); }

  // === 3. 金币购买武器 ===
  putSave({ gold:9999, stats:{ kills:99999 } });
  let goldBuyOk = false;
  try {
    buildSkillTree();
    const node = SKILL_NODE_BY_ID['fireball'];
    const before = loadSave();
    const can = skCanBuy(node, before);
    tryUnlock(node);
    const after = loadSave();
    goldBuyOk = can && after.unlocked['fireball'] === 1 && after.gold === before.gold - 80;
  } catch (e) { console.error('GOLDBUG ' + (e.stack||e)); }

  // === 4. 材料扩槽 ===
  putSave({ mats:5, slots:{ atk:3, buff:3 } });
  let slotBuyOk = false;
  try {
    buildSkillTree();
    const node = SKILL_NODE_BY_ID['slot_atk4'];
    const before = loadSave();
    const can = skCanBuy(node, before);
    tryUnlock(node);
    const after = loadSave();
    slotBuyOk = can && after.slots.atk === 4 && after.mats === 4;
  } catch (e) { console.error('SLOTBUG ' + (e.stack||e)); }

  // === 5. 未达门槛不可购买 ===
  putSave({ gold:9999, cleared:[] });
  let lockOk = false;
  try {
    buildSkillTree();
    const node = SKILL_NODE_BY_ID['iceorb'];
    const can = skCanBuy(node, loadSave());
    tryUnlock(node);
    lockOk = (can === false) && (loadSave().unlocked['iceorb'] !== 1);
  } catch (e) { console.error('LOCKBUG ' + (e.stack||e)); }

  // === 6. ESC 暂停 / 继续 / 退出 ===
  putSave({});
  let escOk = false;
  try {
    startRun(HEROES[0], STAGES[0]);
    dispatchKey('Escape');
    const paused = (G.state === 'pause') && document.getElementById('paused').classList.contains('show');
    dispatchKey('Escape');
    const resumed = (G.state === 'play') && !document.getElementById('paused').classList.contains('show');
    dispatchKey('Escape');
    document.getElementById('btn-quit').onclick();
    const quit = (G.state === 'menu') && (G.player === null);
    escOk = paused && resumed && quit;
  } catch (e) { console.error('ESCOK ' + (e.stack||e)); }

  // === 7. 空格主动特技 + 冷却 ===
  putSave({});
  let specOk = true;
  try {
    startRun(HEROES[0], STAGES[0]);
    dispatchKey('Space');
    const p1 = G.player;
    const casted = p1.specCd > 0;
    const shield = p1.specShieldT > 0;
    dispatchKey('Space');
    const noRecast = (p1.specCd === p1.specCdMax);
    startRun(HEROES[3], STAGES[0]);
    dispatchKey('Space');
    const dashOk = (G.player.dashSpeedT > 0);
    specOk = casted && shield && noRecast && dashOk;
  } catch (e) { console.error('SPECOK ' + (e.stack||e)); specOk = false; }

  // === 8. 升级卡过滤 + 装备槽上限 ===
  putSave({});
  let rollFilterOk = true, capOk = true;
  try {
    startRun(HEROES[0], STAGES[0]);
    const sv = loadSave();
    for (let i=0;i<300;i++){
      const cards = rollCards(false);
      for (const c of cards){
        if (c.t === 'NEW' && !isUnlocked(c.id, sv)) rollFilterOk = false;
        if (c.t === 'PAS' && !isUnlocked('p_' + c.id, sv)) rollFilterOk = false;
        if (c.t === 'NEW' && c.id === 'fireball') rollFilterOk = false;
      }
    }
    const p = G.player;
    addWeapon(p, 'tesla'); addWeapon(p, 'shuriken');
    for (let i=0;i<200;i++){ if (rollCards(false).some(function(c){ return c.t==='NEW'; })) capOk = false; }
  } catch (e) { console.error('ROLLOK ' + (e.stack||e)); rollFilterOk = false; capOk = false; }

  // === 9. 时之结晶 ===
  putSave({ mats:0 });
  startRun(HEROES[0], STAGES[0]);
  G.miniKills = 2; G.finalKilled = true;
  endRun(true);
  const matBoss = loadSave().mats, matGet = loadSave().stats.matsGet;
  const matGainOk = (matBoss === 5) && (matGet === 5);
  putSave({ mats:0 });
  startRun(HEROES[0], STAGES[0]);
  G.miniKills = 0; G.finalKilled = false;
  endRun(false);
  const matZeroOk = (loadSave().mats === 0);

  // === 10. 终局 Boss 击杀 -> 胜利 ===
  putSave({});
  startRun(HEROES[0], STAGES[3]);
  const pb = G.player; pb.maxHp = 1e9; pb.hp = 1e9;
  spawnEnemy(null, pb.x + 200, pb.y, 1, true); G.bossAlive = true;
  killEnemy(G.enemies.find(function(e){ return e.type === 'boss'; }));
  const bossWinOk = (G.win === true && G.state === 'over');

  // === 11. 阵亡 -> 失败 ===
  putSave({});
  startRun(HEROES[1], STAGES[0]);
  const pd = G.player; pd.inv = 0; pd.maxHp = 10; pd.hp = 10;
  hurtPlayer(1e9);
  const loseOk = (G.win === false && G.state === 'over');

  // === 12. UI 构建 + 菜单导航 ===
  let navOk = true, unlocksOk = true, optionsOk = true, uiBuildOk = false, skillTreeOk = false;
  try {
    buildStageList(); buildHeroList(); buildUnlocks(); buildOptions(); buildSkillTree();
    const stageCount = document.getElementById('stage-list').children.length;
    const unCount = document.getElementById('un-list').children.length;
    const optCount = document.getElementById('opt-body').children.length;
    unlocksOk = unCount === UNLOCKS.length;
    optionsOk = optCount > 0;
    uiBuildOk = (stageCount === STAGES.length);
    skillTreeOk = (document.getElementById('sk-nodes').children.length === SKILL_NODES.length) && (SKILL_NODES.length === 27);
    document.getElementById('btn-start').onclick();
    const afterStart = document.getElementById('saves').classList.contains('show');
    document.getElementById('saves-grid').children[0].querySelector('.save-go').onclick({ stopPropagation:function(){} });
    const enteredSkill = document.getElementById('skilltree').classList.contains('show');
    document.getElementById('btn-skill-back').onclick();
    const backToSaves = document.getElementById('saves').classList.contains('show');
    document.getElementById('saves-grid').children[0].querySelector('.save-go').onclick({ stopPropagation:function(){} });
    document.getElementById('sk-start').onclick();
    const toStages = document.getElementById('stages').classList.contains('show');
    document.getElementById('btn-stage-back').onclick();
    document.getElementById('btn-saves-back').onclick();
    document.getElementById('btn-unlocks').onclick(); document.getElementById('btn-unlocks-back').onclick();
    document.getElementById('btn-options').onclick(); document.getElementById('btn-opt-done').onclick();
    document.getElementById('btn-exit').onclick();
    navOk = navOk && afterStart && enteredSkill && backToSaves && toStages;
  } catch (e) { console.error('NAV_ERR ' + (e.stack||e)); navOk = false; }

  console.log('SMOKE_REPORT ' + JSON.stringify({
    saveSystemOk: saveSystemOk,
    allStagesOk: R.allStagesOk, stagesRun: R.stagesRun,
    mapNodesOk: mapNodesOk, mapLinksOk: mapLinksOk, mapHeroOk: mapHeroOk,
    skillGoldBuy: goldBuyOk, skillSlotBuy: slotBuyOk, skillLockBlocks: lockOk,
    escPauseResumeQuit: escOk, spaceSpecialCd: specOk,
    rollFilterUnlocked: rollFilterOk, rollSlotCap: capOk,
    matGainOnBoss: matGainOk, matZeroNoBoss: matZeroOk,
    bossKillWin: bossWinOk, playerDeathLose: loseOk,
    uiBuildOk: uiBuildOk, skillTreeNodesOk: skillTreeOk,
    unlocksOk: unlocksOk, optionsOk: optionsOk, navOk: navOk
  }));
})();
`;

try {
  vm.runInThisContext(driver, { filename: 'smoke-driver.mjs' });
} catch (e) {
  console.error('SMOKE_ERROR:\n' + (e && e.stack || e));
  process.exit(1);
}
