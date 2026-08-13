// config/unlocks.js · 已解锁成就
export const UNLOCKS = [
  { id:'u_kill1k',  icon:'☠', name:'初露锋芒',   desc:'累计击杀 1000 个敌人',     reward:'金币 ×50',   stat:'kills',  goal:1000 },
  { id:'u_kill5k',  icon:'💀', name:'尸山血海',   desc:'累计击杀 5000 个敌人',     reward:'金币 ×150',  stat:'kills',  goal:5000 },
  { id:'u_kill20k', icon:'⚰', name:'末日收割',   desc:'累计击杀 20000 个敌人',    reward:'金币 ×400',  stat:'kills',  goal:20000 },
  { id:'u_time5',   icon:'⏱', name:'坚持五分',   desc:'单局存活满 5 分钟',         reward:'金币 ×40',   stat:'bestTime', goal:300 },
  { id:'u_time15',  icon:'⏳', name:'老当益壮',   desc:'单局存活满 15 分钟',        reward:'金币 ×120',  stat:'bestTime', goal:900 },
  { id:'u_lv20',    icon:'⭐', name:'登峰造极',   desc:'单局达到 20 级',           reward:'金币 ×80',   stat:'bestLv',  goal:20 },
  { id:'u_lv40',    icon:'🌟', name:'超凡入圣',   desc:'单局达到 40 级',           reward:'金币 ×200',  stat:'bestLv',  goal:40 },
  { id:'u_stone',   icon:'🪨', name:'石器时代通关', desc:'击败「霸王龙王」',        reward:'金币 ×100',  stat:'clears',  goal:1, flag:'stone' },
  { id:'u_dark',    icon:'🌑', name:'黑暗时代通关', desc:'击败「骷髅君王」',        reward:'金币 ×160',  stat:'clears',  goal:1, flag:'dark' },
  { id:'u_golden',  icon:'👑', name:'黄金时代通关', desc:'击败「黄金巨像」',        reward:'金币 ×240',  stat:'clears',  goal:1, flag:'golden' },
  { id:'u_end',     icon:'☀', name:'终末时代通关', desc:'击败「时之守护者」',       reward:'金币 ×500',  stat:'clears',  goal:1, flag:'end' },
  { id:'u_win3',    icon:'🏆', name:'三连胜',     desc:'累计通关 3 次',            reward:'金币 ×200',  stat:'wins',    goal:3 },
  { id:'u_hero',    icon:'🗡', name:'群英荟萃',   desc:'解锁全部英雄',            reward:'金币 ×300',  stat:'heroes',  goal:5 },
  { id:'u_skill10', icon:'🌿', name:'初窥门径',   desc:'累计激活 10 个技能/英雄/槽', reward:'金币 ×120',  stat:'unlocks', goal:10 },
  { id:'u_skill20', icon:'🌳', name:'融会贯通',   desc:'累计激活 20 个技能/英雄/槽', reward:'金币 ×400',  stat:'unlocks', goal:20 },
  { id:'u_skillAll',icon:'🌟', name:'全知全能',   desc:'激活全部可用项（共 27）',   reward:'金币 ×700',  stat:'unlocks', goal:27 },
  { id:'u_mats',    icon:'💎', name:'时之收藏家', desc:'累计获得 10 个时之结晶',   reward:'金币 ×150',  stat:'matsGet', goal:10 },
  { id:'u_apex',    icon:'✨', name:'时之眷顾',   desc:'激活顶点节点「时之眷顾」',  reward:'称号·眷顾者', stat:'apex',    goal:1 }
];
export const UNLOCK_BY_ID = {};
UNLOCKS.forEach(u => UNLOCK_BY_ID[u.id] = u);
