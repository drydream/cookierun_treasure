// Local-only tool for editing the Kakao/global treasure dataset (English name,
// English ability text). Run with `node server.cjs`, then open http://localhost:5177
const http = require('http');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'treasures-kr.json');
const indexPath = path.join(__dirname, 'index.html');
const PORT = 5177;

function readItems() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/admin')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(indexPath, 'utf8'));
    return;
  }
  if (req.method === 'GET' && req.url === '/api/items') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(dataPath, 'utf8'));
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/images-kr/')) {
    const file = path.join(__dirname, '..', decodeURIComponent(req.url));
    const ext = path.extname(file).slice(1);
    const contentType = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif' }[ext] || 'application/octet-stream';
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(buf);
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { id, abilityEn, englishName } = JSON.parse(body);
      const items = readItems();
      const item = items.find(it => it.id === id);
      if (item) {
        item.abilityEn = abilityEn;
        if (englishName) item.englishName = englishName;
      }
      fs.writeFileSync(dataPath, JSON.stringify(items, null, 1));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => console.log(`Translator admin running at http://localhost:${PORT}`));
