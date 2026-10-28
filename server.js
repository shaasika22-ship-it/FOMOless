const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 5000);
const ROOT = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function search(params) {
  const place = (params.get('place') || '').trim().toLowerCase();
  const date = (params.get('date') || '').trim();
  let time = (params.get('time') || '').trim();
  if (time.length === 4 && time[1] === ':') time = `0${time}`;
  return DATA.filter(h => {
    if (place && ![h.city, h.state].some(v => v && v.toLowerCase().includes(place))) return false;
    if (date && h.date < date) return false;
    if (time) {
      const op = time.match(/^(>=|<=|>|<|=)\s*(.*)$/);
      const val = op ? op[2] : time;
      if (op && op[1] === '>=' && !(h.start_time >= val)) return false;
      if (op && op[1] === '<=' && !(h.start_time <= val)) return false;
      if (op && op[1] === '>' && !(h.start_time > val)) return false;
      if (op && op[1] === '<' && !(h.start_time < val)) return false;
      if (op && op[1] === '=' && !(h.start_time === val)) return false;
      if (!op && !(h.start_time >= val)) return false;
    }
    return true;
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/hackathons/search') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(search(url.searchParams)));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(ROOT, 'public', `.${requested}`);
  const publicRoot = path.resolve(ROOT, 'public') + path.sep;
  if (!file.startsWith(publicRoot)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end('Page not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Gather is ready at http://localhost:${PORT}`));

