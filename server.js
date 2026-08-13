// server.js · 零依赖本地静态服务器（ES Modules 必须以 http 提供）
// 用法：node server.js  然后浏览器打开 http://localhost:5173
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
let PORT = parseInt(process.env.PORT, 10) || 5173;
const MAX_ATTEMPTS = 20;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.map':  'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    // 防目录穿越
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

function tryListen(port, attempts = 0) {
  function onError(err) {
    server.off('listening', onListening);
    if (err.code === 'EADDRINUSE' && attempts < MAX_ATTEMPTS) {
      console.log('端口 ' + port + ' 被占用，尝试 ' + (port + 1) + ' ...');
      tryListen(port + 1, attempts + 1);
    } else {
      console.error('服务器启动失败：', err.message);
      process.exit(1);
    }
  }
  function onListening() {
    server.off('error', onError);
    console.log('Time Survivors 本地服务器已启动：');
    console.log('  ▶ http://localhost:' + port);
    console.log('  （Ctrl+C 停止）');
  }
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port);
}

tryListen(PORT);
