// core/state.js · 全局游戏状态 + 共享可变状态
import { GAME_TIME } from '../config/waves.js';

export const G = {
  state: 'menu',                   // menu|select|play|levelup|pause|over
  t: 0,                            // 局内时间（秒）
  dt: 0,
  player: null,
  enemies: [], projs: [], pickups: [], fx: [], dmgs: [], areas: [], mines: [],
  grid: null,
  kills: 0, gold: 0,
  cam: { x: 0, y: 0, shake: 0 },
  waveIdx: 0, spawnAcc: 0, firedSpecials: {},
  bossAlive: false, win: false,
  hero: null,
  toastT: 0,
  stage: null, theme: null, waves: null, boss: null,
  time: GAME_TIME, diffMul: 1
};

// 空间网格邻近查询复用的临时数组（engine / combat 共享）
export const _near = [];
