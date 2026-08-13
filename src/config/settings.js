// config/settings.js · 选项设置
import { loadSave } from './save.js';

export const LANGS = ['简体中文', 'English', '日本語', '한국어'];
export const DEFAULT_SETTINGS = {
  master: 80, sfx: 80, music: 60,        // 音频 0-100
  hurtFx: 100, vsync: true, shake: true, // 视频
  flash: true, retro: false, fps: false,
  lang: '简体中文'                        // 语言
};
export function loadSettings() { return Object.assign({}, DEFAULT_SETTINGS, loadSave().settings); }
