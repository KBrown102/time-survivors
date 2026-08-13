// config/stages.js · 多关卡场景（敌人池 / 配色 / Boss / 难度 / 时长）
import { genWaves } from './waves.js';
import { BOSS } from './enemies.js';

export const STAGES = [
  {
    id:'stone', name:'石器时代', en:'STONE AGE', diff:'★☆☆☆', diffMul:1.0, time:780, miniShape:'raptor',
    boss:{ name:'霸王龙王', kind:'boss', hp:4200, dmg:24, speed:82, r:46, xp:400, gold:300, color:'#c07a3a', dark:'#8a4a1a', shape:'trex', shoot:{ cd:1.5, spd:150, dmg:11 } },
    theme:{ grass1:'#27331f', grass2:'#1c2816', grass3:'#2f3d24', stone:'#3a3a42', blade:'rgba(130,180,90,.35)', accent:'#8ad06a', sky1:'#1d2a14', sky2:'#0a1408' },
    e:[['rat',3],['skeleton',2]], m:[['skeleton',2],['bat',3],['wolf',2]], l:[['raptor',3],['wolf',2],['witch',2]]
  },
  {
    id:'dark', name:'黑暗时代', en:'DARK AGE', diff:'★★☆☆', diffMul:1.2, time:900, miniShape:'wolf',
    boss:{ name:'骷髅君王', kind:'boss', hp:5200, dmg:28, speed:70, r:44, xp:450, gold:340, color:'#d8d8e0', dark:'#9a9a90', shape:'brute', shoot:{ cd:1.3, spd:160, dmg:12 } },
    theme:{ grass1:'#241a2e', grass2:'#160e1e', grass3:'#2c2038', stone:'#33304a', blade:'rgba(150,120,190,.3)', accent:'#a06bff', sky1:'#1a1228', sky2:'#0a0612' },
    e:[['skeleton',3],['bat',2]], m:[['wolf',2],['bat',3],['witch',2]], l:[['brute',2],['witch',3],['wolf',2]]
  },
  {
    id:'golden', name:'黄金时代', en:'GOLDEN AGE', diff:'★★★☆', diffMul:1.4, time:1020, miniShape:'brute',
    boss:{ name:'黄金巨像', kind:'boss', hp:6400, dmg:32, speed:60, r:48, xp:520, gold:420, color:'#e8c24a', dark:'#a07810', shape:'brute', shoot:{ cd:1.2, spd:170, dmg:14 } },
    theme:{ grass1:'#2e2a16', grass2:'#1e1a0c', grass3:'#362f18', stone:'#4a4226', blade:'rgba(220,190,90,.32)', accent:'#ffcf6b', sky1:'#2a2410', sky2:'#100c04' },
    e:[['wolf',3],['raptor',2]], m:[['raptor',3],['witch',2],['brute',1]], l:[['brute',3],['witch',3],['raptor',2]]
  },
  {
    id:'end', name:'终末时代', en:'END TIMES', diff:'★★★★', diffMul:1.7, time:1200, miniShape:'raptor',
    boss: BOSS, // 时之守护者
    theme:{ grass1:'#2e1414', grass2:'#1e0a0a', grass3:'#361818', stone:'#3a2630', blade:'rgba(230,110,110,.3)', accent:'#ff7b54', sky1:'#2a1014', sky2:'#100406' },
    e:[['skeleton',2],['bat',3],['wolf',2]], m:[['raptor',2],['witch',3],['brute',2]], l:[['brute',3],['witch',3],['raptor',3],['wolf',2]]
  }
];
STAGES.forEach(s => s.waves = genWaves(s.time, s.e, s.m, s.l, s.miniShape));
