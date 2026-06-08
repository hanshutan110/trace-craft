const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.join(__dirname, '..', 'public');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname || '/';

  if (pathname === '/api-health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('TraceCraft Frontend Server');
    return;
  }

  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(root, rel);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath) && !fs.statSync(indexPath).isDirectory()) {
      serveFile(indexPath, res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Frontend file not found');
    return;
  }

  serveFile(filePath, res);
});

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Frontend file not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
}

server.listen(port, () => {
  console.log(`TraceCraft frontend served at http://localhost:${port}`);
});
