// ui/input.js · 键盘输入（移动 / ESC 暂停 / 空格特技）
import { G } from '../core/state.js';
import { castSpecial, resumeGame } from './lifecycle.js';
import { show } from './dom.js';

export const keys = {};

export function bindInput() {
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Escape') {
      e.preventDefault();
      if (G.state === 'play') { G.state = 'pause'; show('paused'); }
      else if (G.state === 'pause') { resumeGame(); }
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (G.state === 'play' && G.player && G.player.specCd <= 0) castSpecial(G.player);
    }
  });
  addEventListener('keyup', e => keys[e.code] = false);
}
