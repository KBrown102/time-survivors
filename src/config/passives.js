// config/passives.js · 被动强化（8 种）
export const PASSIVES = {
  might:  { name:'力量', color:'#ff7a7a', desc:'所有武器伤害 +12%。',   max:5, apply:p=>p.mul.dmg+=0.12 },
  haste:  { name:'急速', color:'#7ec8ff', desc:'武器冷却 -8%。',        max:5, apply:p=>p.mul.cd*=0.92 },
  area:   { name:'领域', color:'#c89aff', desc:'攻击范围/体积 +12%。',  max:5, apply:p=>p.mul.area+=0.12 },
  swift:  { name:'疾行', color:'#7dffa0', desc:'移动速度 +10%。',       max:5, apply:p=>p.mul.speed+=0.10 },
  vigor:  { name:'活力', color:'#ff9ecf', desc:'最大生命 +20，并回满。',max:5, apply:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+20);} },
  regen:  { name:'回复', color:'#9affd0', desc:'每秒回血 +0.6。',       max:5, apply:p=>p.regen+=0.6 },
  luck:   { name:'幸运', color:'#ffe17a', desc:'暴击率 +8%，暴击 2 倍伤害。',max:5, apply:p=>p.crit+=0.08 },
  magnet: { name:'磁力', color:'#8fd8ff', desc:'拾取范围 +40%。',       max:3, apply:p=>p.magnet*=1.4 }
};
export const PASSIVE_IDS = Object.keys(PASSIVES);
