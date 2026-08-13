// config/enemies.js · 敌人原型（8 种）+ 终局 Boss
export const ENEMIES = {
  rat:      { name:'鼠群', kind:'swarm',  hp:8,   dmg:6,  speed:95,  r:9,  xp:1, gold:0, color:'#8a7a5a', dark:'#6a5a3a', shape:'rat' },
  skeleton: { name:'骷髅', kind:'chase',  hp:20,  dmg:10, speed:70,  r:12, xp:2, gold:1, color:'#e8e8e0', dark:'#b0b0a8', shape:'skull' },
  bat:      { name:'蝙蝠', kind:'swarm',  hp:12,  dmg:7,  speed:130, r:9,  xp:1, gold:0, color:'#5a4a6a', dark:'#3a2a4a', shape:'bat' },
  raptor:   { name:'迅猛龙', kind:'dasher',hp:34, dmg:14, speed:110, r:14, xp:4, gold:2, color:'#7ab05a', dark:'#4a7a2a', shape:'raptor' },
  wolf:     { name:'狼', kind:'chase',    hp:28,  dmg:12, speed:120, r:13, xp:3, gold:2, color:'#7a7a8a', dark:'#4a4a5a', shape:'wolf' },
  witch:    { name:'女巫', kind:'ranged', hp:26,  dmg:9,  speed:55,  r:13, xp:5, gold:3, color:'#8a4ab0', dark:'#5a2a7a', shape:'witch', shoot:{cd:2.4, spd:180, dmg:9} },
  brute:    { name:'蛮兵', kind:'tank',   hp:120, dmg:18, speed:48,  r:20, xp:8, gold:5, color:'#b06a4a', dark:'#7a3a2a', shape:'brute' },
  trex:     { name:'霸王龙', kind:'miniboss', hp:900, dmg:26, speed:78, r:34, xp:60, gold:40, color:'#c07a3a', dark:'#8a4a1a', shape:'trex' }
};
export const BOSS = { name:'时之守护者', kind:'boss', hp:6000, dmg:34, speed:60, r:48, xp:400, gold:300, color:'#c8b06b', dark:'#8a7020', shape:'boss', shoot:{cd:1.4, spd:150, dmg:12} };
