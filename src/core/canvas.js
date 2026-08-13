// core/canvas.js · 画布初始化与缩放
export const VW = 960, VH = 540;          // 内部渲染分辨率
export const WORLD = 4000;                // 世界半边长

export let cv = null;   // <canvas id="game">
export let cx = null;   // 2d 上下文

export function initCanvas() {
  cv = document.getElementById('game');
  cx = cv.getContext('2d');
  cv.width = VW; cv.height = VH;
  cx.imageSmoothingEnabled = false;
  addEventListener('resize', fitCanvas);
  fitCanvas();
}

export function fitCanvas() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  cv.style.width = (VW * s) + 'px';
  cv.style.height = (VH * s) + 'px';
}
