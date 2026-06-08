const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/api-health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('TraceCraft Frontend Server');
    return;
  }

  const filePath = path.join(root, 'index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Frontend file not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(port, () => {
  console.log(`TraceCraft frontend served at http://localhost:${port}`);
});

