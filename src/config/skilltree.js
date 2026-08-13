// config/skilltree.js · 技能树 = 游戏内「攻击 / 增益 / 英雄 / 装备槽」的激活树
import { HEROES, HERO_SPEC } from './heroes.js';
import { WEAPONS, WEAPON_IDS } from './weapons.js';
import { PASSIVES, PASSIVE_IDS } from './passives.js';
import { STAGES } from './stages.js';

// 解锁条件 → 进度
export function reqProgress(req, save) {
  if (!req) return { cur:1, goal:1, met:true };
  if (req.flag) { const ok = save.cleared.includes(req.flag); return { cur: ok?1:0, goal:1, met: ok }; }
  if (req.slot) { const v = save.slots[req.slot] || 3; return { cur:v, goal:req.lv, met: v >= req.lv }; }
  const cur = save.stats[req.stat] || 0;
  return { cur, goal: req.goal, met: cur >= req.goal };
}
export function reqLabel(req) {
  if (!req) return '初始可用';
  if (req.flag) { const s = STAGES.find(s => s.id === req.flag); return '通关「' + (s ? s.name : req.flag) + '」'; }
  if (req.slot) return '装备槽已达 ' + req.lv;
  const map = { kills:'累计击杀', bestTime:'单局存活(秒)', bestLv:'单局等级', wins:'累计通关', clears:'通关关卡' };
  return (map[req.stat] || req.stat) + ' ≥ ' + req.goal;
}

// 由 武器/被动/英雄/装备槽 自动生成技能树节点
export function buildSkillTreeData() {
  const W = [], P = [], H = [], S = [];
  // 攻击技能（初始 3 种可用，其余按累计统计解锁）
  const wCond = { flail:null, tesla:null, shuriken:null,
    fireball:{stat:'kills',goal:500}, boomerang:{stat:'kills',goal:2000}, crossbow:{stat:'bestLv',goal:20},
    iceorb:{flag:'stone'}, leech:{stat:'kills',goal:1000}, blackhole:{flag:'dark'}, minefield:{flag:'golden'} };
  const wCost = { flail:0, tesla:0, shuriken:0, fireball:80, boomerang:120, crossbow:100, iceorb:140, leech:90, blackhole:160, minefield:200 };
  const wIcon = { flail:'🔗', tesla:'⚡', shuriken:'✳', fireball:'🔥', boomerang:'🪃', crossbow:'🏹', iceorb:'❄', leech:'🩸', blackhole:'🕳', minefield:'💣' };
  for (const id of WEAPON_IDS) W.push({ id, cat:'weapon', name:WEAPONS[id].name, icon:wIcon[id]||'⚔', desc:WEAPONS[id].desc, req:wCond[id], cost:{gold:wCost[id]} });
  // 增益技能（初始 3 种可用）
  const pCond = { might:null, haste:null, area:null, swift:{stat:'kills',goal:300}, vigor:{stat:'bestLv',goal:15},
    regen:{flag:'stone'}, luck:{stat:'kills',goal:3000}, magnet:{stat:'wins',goal:1} };
  const pCost = { might:0, haste:0, area:0, swift:60, vigor:70, regen:80, luck:120, magnet:90 };
  const pIcon = { might:'💪', haste:'🌬', area:'🔆', swift:'👟', vigor:'❤', regen:'💗', luck:'🍀', magnet:'🧲' };
  for (const id of PASSIVE_IDS) P.push({ id:'p_'+id, wid:id, cat:'passive', name:PASSIVES[id].name, icon:pIcon[id]||'✦', desc:PASSIVES[id].desc, req:pCond[id], cost:{gold:pCost[id]} });
  // 英雄
  const hCond = { lincoln:null, tesla:null, cleo:{flag:'dark'}, nobu:{stat:'bestLv',goal:30}, joku:{flag:'end'} };
  const hCost = { lincoln:0, tesla:0, cleo:150, nobu:150, joku:260 };
  for (const h of HEROES) {
    const sp = HERO_SPEC[h.id];
    H.push({ id:'h_'+h.id, hid:h.id, cat:'hero', name:h.name, icon:sp.icon, desc:'解锁英雄「'+h.name+'」· 起手 '+WEAPONS[h.startWeapon].name, req:hCond[h.id], cost:{gold:hCost[h.id]} });
  }
  // 装备槽（消耗 Boss 掉落的特殊材料「时之结晶」）
  S.push({ id:'slot_atk4',  cat:'slot', slot:'atk',  to:4, name:'攻击槽 +1', icon:'🗡', desc:'攻击技能装备槽 3 → 4（消耗时之结晶）', req:null,                 cost:{mat:1} });
  S.push({ id:'slot_atk5',  cat:'slot', slot:'atk',  to:5, name:'攻击槽 +1', icon:'🗡', desc:'攻击技能装备槽 4 → 5（消耗时之结晶）', req:{slot:'atk',lv:4},   cost:{mat:2} });
  S.push({ id:'slot_buff4', cat:'slot', slot:'buff', to:4, name:'增益槽 +1', icon:'🛡', desc:'增益技能装备槽 3 → 4（消耗时之结晶）', req:null,                 cost:{mat:1} });
  S.push({ id:'slot_buff5', cat:'slot', slot:'buff', to:5, name:'增益槽 +1', icon:'🛡', desc:'增益技能装备槽 4 → 5（消耗时之结晶）', req:{slot:'buff',lv:4},  cost:{mat:2} });
  return [
    { title:'攻击技能', cat:'weapon',  nodes:W },
    { title:'增益技能', cat:'passive', nodes:P },
    { title:'英雄',     cat:'hero',    nodes:H },
    { title:'装备槽（时之结晶）', cat:'slot', nodes:S }
  ];
}

// 由数据生成技能树（武器/被动/英雄/装备槽），并建扁平索引
export const SKILL_GROUPS = buildSkillTreeData();
export const SKILL_NODES = SKILL_GROUPS.flatMap(g => g.nodes);
export const SKILL_NODE_BY_ID = {};
SKILL_NODES.forEach(n => SKILL_NODE_BY_ID[n.id] = n);
