// config/waves.js · 波次时间线模板 + 关卡波次缩放
export const WAVES = [
  { t0:0,   t1:90,   rate:1.2, pool:[['rat',3],['skeleton',2]] },
  { t0:90,  t1:180,  rate:1.8, pool:[['rat',2],['skeleton',3],['bat',2]] },
  { t0:180, t1:300,  rate:2.4, pool:[['skeleton',2],['bat',3],['wolf',2]], special:{name:'蝙蝠群',at:210,type:'swarm',enemy:'bat',n:40} },
  { t0:300, t1:420,  rate:2.8, pool:[['wolf',3],['raptor',2],['skeleton',1]], special:{name:'列阵冲锋',at:360,type:'line',enemy:'raptor',n:26} },
  { t0:420, t1:600,  rate:3.4, pool:[['raptor',3],['wolf',2],['witch',2]] },
  { t0:600, t1:602,  rate:0,   pool:[], special:{name:'⚠ 霸王龙来袭',at:600,type:'miniboss'} },
  { t0:602, t1:780,  rate:3.8, pool:[['raptor',2],['witch',3],['brute',1],['wolf',2]], special:{name:'追踪蜂群',at:690,type:'swarm',enemy:'bat',n:55} },
  { t0:780, t1:960,  rate:4.4, pool:[['brute',2],['witch',2],['raptor',3]], special:{name:'列阵冲锋',at:870,type:'line',enemy:'wolf',n:34} },
  { t0:960, t1:1140, rate:5.2, pool:[['brute',3],['witch',3],['raptor',3],['wolf',2]], special:{name:'⚠ 双霸王龙',at:1050,type:'miniboss2'} },
  { t0:1140,t1:1198, rate:6.5, pool:[['brute',3],['raptor',4],['witch',3],['wolf',3]] },
  { t0:1198,t1:1200, rate:0,   pool:[], special:{name:'☠ 终局 Boss：时之守护者',at:1198,type:'boss'} }
];
export const GAME_TIME = 1200; // 20 分钟（默认时长，关卡会覆盖 G.time）

// 按关卡时长 time 比例缩放 20 分钟波次模板；pool 由关卡决定
export function genWaves(time, e, m, l, mini) {
  const k = time / 1200, sp = t => Math.round(t * k);
  return [
    { t0:0,        t1:sp(90),   rate:1.2, pool:e },
    { t0:sp(90),   t1:sp(180),  rate:1.8, pool:e.concat([[mini,1]]) },
    { t0:sp(180),  t1:sp(300),  rate:2.4, pool:m, special:{ name:'蜂群来袭', at:sp(210), type:'swarm', enemy:'bat', n:40 } },
    { t0:sp(300),  t1:sp(420),  rate:2.8, pool:m, special:{ name:'列阵冲锋', at:sp(360), type:'line', enemy:m[0][0], n:26 } },
    { t0:sp(420),  t1:sp(600),  rate:3.4, pool:m },
    { t0:sp(600),  t1:sp(602),  rate:0,   pool:[], special:{ name:'⚠ 小Boss 来袭', at:sp(600), type:'miniboss' } },
    { t0:sp(602),  t1:sp(780),  rate:3.8, pool:l, special:{ name:'追踪蜂群', at:sp(690), type:'swarm', enemy:'bat', n:55 } },
    { t0:sp(780),  t1:sp(960),  rate:4.4, pool:l, special:{ name:'列阵冲锋', at:sp(870), type:'line', enemy:l[0][0], n:34 } },
    { t0:sp(960),  t1:sp(1140), rate:5.2, pool:l, special:{ name:'⚠ 双小Boss', at:sp(1050), type:'miniboss2' } },
    { t0:sp(1140), t1:sp(1198), rate:6.5, pool:l },
    { t0:sp(1198), t1:sp(1200), rate:0,   pool:[], special:{ name:'☠ 终局 Boss：' + mini, at:sp(1198), type:'boss' } }
  ];
}
