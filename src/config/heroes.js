// config/heroes.js · 英雄 / 英雄特技 / 技能配色
export const HEROES = [
  {
    id: 'lincoln', name: '林肯', role: '壁垒者',
    story: '第 16 任美国总统。以坚韧著称，在废奴与统一的风暴中屹立不倒。',
    abil: '<b>主动·樱花壁垒·爆发</b>：空格炸开环形花瓣冲击波削敌击退，并短时减伤。起手带<b>连枷</b>。',
    hp: 120, speed: 175, might: 1.0, magnet: 90,
    startWeapon: 'flail', special: 'barrier',
    skin: { body:'#3a4a6a', dark:'#2a3450', skin:'#e0b088', hair:'#1a1a1a', accent:'#ff9ecf' },
    stats: { maxHp:120, healing:0, weaponSlots:1, armor:0, repel:0, moveSpeed:175, might:1.0, magnet:90, luck:0, learning:1, wealth:1, revive:0, projSize:1, projSpeed:1, duration:1, cooldown:1, extraAmmo:0, reroll:0, crit:0.05, knockback:1, challenge:0, relic:0 }
  },
  {
    id: 'tesla', name: '特斯拉', role: '电击者',
    story: '交流电之父。一生痴迷于无线输电与闪电，传说能徒手引雷。',
    abil: '<b>主动·电极风暴</b>：空格引动闪电在敌群疯狂连锁。起手带<b>特斯拉线圈</b>。',
    hp: 95, speed: 185, might: 1.1, magnet: 100,
    startWeapon: 'tesla', special: 'chain',
    skin: { body:'#2a2a3a', dark:'#1a1a28', skin:'#e8c0a0', hair:'#4a4a5a', accent:'#7ec8ff' },
    stats: { maxHp:95, healing:0, weaponSlots:1, armor:0, repel:0, moveSpeed:185, might:1.1, magnet:100, luck:0, learning:1, wealth:1, revive:0, projSize:1, projSpeed:1.1, duration:1, cooldown:0.95, extraAmmo:0, reroll:0, crit:0.05, knockback:1, challenge:0, relic:0 }
  },
  {
    id: 'cleo', name: '克利奥帕特拉', role: '召唤者', locked: true,
    story: '埃及托勒密王朝末代女王。以智慧与魅力周旋于帝国之间。',
    abil: '<b>主动·圣甲虫狂袭</b>：空格爆发毒雾新星灼烧减速群敌。起手带<b>水蛭镖</b>。',
    hp: 100, speed: 190, might: 1.0, magnet: 110,
    startWeapon: 'leech', special: 'pet',
    skin: { body:'#c8a028', dark:'#a07810', skin:'#e0b088', hair:'#101018', accent:'#3ad0c0' },
    stats: { maxHp:100, healing:1, weaponSlots:1, armor:0, repel:0, moveSpeed:190, might:1.0, magnet:110, luck:0, learning:1, wealth:1, revive:0, projSize:1, projSpeed:1, duration:1, cooldown:1, extraAmmo:0, reroll:0, crit:0.05, knockback:1, challenge:0, relic:0 }
  },
  {
    id: 'nobu', name: '织田信长', role: '忍者', locked: true,
    story: '日本战国风云人物。第六天魔王，以雷霆手段席卷乱世。',
    abil: '<b>主动·疾风斩</b>：空格向前疾冲挥出真空斩。起手带<b>飞镖</b>三连发，走位刁钻。',
    hp: 90, speed: 215, might: 1.05, magnet: 90,
    startWeapon: 'shuriken', special: 'swift',
    skin: { body:'#7a1a1a', dark:'#5a1010', skin:'#e8c0a0', hair:'#101018', accent:'#ffcf6b' },
    stats: { maxHp:90, healing:0, weaponSlots:1, armor:0, repel:0, moveSpeed:215, might:1.05, magnet:90, luck:0, learning:1, wealth:1, revive:0, projSize:1, projSpeed:1, duration:1, cooldown:0.9, extraAmmo:0, reroll:0, crit:0.08, knockback:1, challenge:0, relic:0 }
  },
  {
    id: 'joku', name: '贞德', role: '圣骑士', locked: true,
    story: '百年战争中的法兰西少女。高举旗帜，于烈火中成为不朽的传奇。',
    abil: '<b>主动·圣焰</b>：空格降下神圣火柱持续灼烧。起手带<b>火球</b>。',
    hp: 140, speed: 160, might: 1.15, magnet: 100,
    startWeapon: 'fireball', special: 'barrier',
    skin: { body:'#c8b040', dark:'#8a7020', skin:'#e8c0a0', hair:'#5a3a1a', accent:'#ffe17a' },
    stats: { maxHp:140, healing:2, weaponSlots:1, armor:0.1, repel:0, moveSpeed:160, might:1.15, magnet:100, luck:0, learning:1, wealth:1, revive:0, projSize:1, projSpeed:1, duration:1, cooldown:1, extraAmmo:0, reroll:0, crit:0.05, knockback:1, challenge:0, relic:0 }
  }
];
export const HERO_BY_ID = {};
HEROES.forEach(h => HERO_BY_ID[h.id] = h);

// 主动特技定义（按英雄）
export const HERO_SPEC = {
  lincoln: { kind:'barrier', name:'樱花壁垒·爆发', cd:9,  icon:'🌸', desc:'脚下炸开环形花瓣冲击波，大范围削敌并击退，随后短暂时停减伤。' },
  tesla:   { kind:'storm',   name:'电极风暴',     cd:8,  icon:'⚡', desc:'闪电在敌群间疯狂连锁，最多命中 12 个敌人，伤害极高。' },
  cleo:    { kind:'nova',    name:'圣甲虫狂袭',   cd:10, icon:'🐞', desc:'圣甲虫盘旋爆发毒雾新星，范围内灼烧并减速敌人。' },
  nobu:    { kind:'dash',    name:'疾风斩',       cd:7,  icon:'🌀', desc:'向前疾冲并挥出真空斩，沿途敌人受重创。' },
  joku:    { kind:'flame',   name:'圣焰',         cd:11, icon:'🔥', desc:'降下神圣火柱，范围内持续灼烧敌人。' }
};
export const SKILL_COLORS = { weapon:'#7ec8ff', passive:'#7dffa0', hero:'#c89aff', slot:'#ffcf6b' };
