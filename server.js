const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 5000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const DATA_DIR = process.env.FOMOLESS_DATA_DIR || path.join(ROOT, 'storage');
const SEARCHES_FILE = path.join(DATA_DIR, 'searches.jsonl');
const requestCounts = new Map();

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

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 16 * 1024) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Please send valid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function rateLimited(req) {
  const key = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(key) || { count: 0, start: now };
  if (now - entry.start > 60 * 60 * 1000) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  requestCounts.set(key, entry);
  if (requestCounts.size > 5000) {
    for (const [ip, item] of requestCounts) if (now - item.start > 60 * 60 * 1000) requestCounts.delete(ip);
  }
  return entry.count > 30;
}

async function saveSearch(req, res) {
  if (rateLimited(req)) return send(res, 429, { error: 'Too many saved searches. Please wait before trying again.' });
  let body;
  try { body = await readJson(req); }
  catch (error) { return send(res, error.status || 400, { error: error.message }); }
  if (body.consent !== true) return send(res, 400, { error: 'The user must opt in before a search is saved.' });
  if (process.env.NODE_ENV === 'production' && !process.env.FOMOLESS_DATA_DIR) {
    return send(res, 503, { error: 'Saved searches are not configured on this site yet.' });
  }
  const submitted = body.filters && typeof body.filters === 'object' ? body.filters : {};
  const filters = {
    place: typeof submitted.place === 'string' ? submitted.place.trim().slice(0, 100) : '',
    dateFrom: typeof submitted.dateFrom === 'string' ? submitted.dateFrom.slice(0, 10) : '',
    dateTo: typeof submitted.dateTo === 'string' ? submitted.dateTo.slice(0, 10) : '',
    time: typeof submitted.time === 'string' ? submitted.time.slice(0, 5) : ''
  };
  if (!filters.place && !filters.dateFrom && !filters.dateTo && !filters.time) return send(res, 400, { error: 'Enter a place, date, or time before saving the search.' });
  const row = { id: crypto.randomUUID(), submittedAt: new Date().toISOString(), filters };
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(SEARCHES_FILE, `${JSON.stringify(row)}\n`, { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    console.error('Could not store saved search:', error.code || 'unknown');
    return send(res, 503, { error: 'This search could not be saved. Your event results are still available.' });
  }
  return send(res, 201, { saved: true });
}

function authorized(req) {
  const expected = process.env.ADMIN_TOKEN || '';
  const actual = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function listSearches(req, res) {
  if (!authorized(req)) return send(res, 401, { error: 'Enter the admin access token to view saved searches.' });
  try {
    if (!fs.existsSync(SEARCHES_FILE)) return send(res, 200, []);
    const rows = fs.readFileSync(SEARCHES_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
    return send(res, 200, rows.map(line => JSON.parse(line)).reverse().slice(0, 1000));
  } catch (error) {
    console.error('Could not read saved searches:', error.code || 'invalid data');
    return send(res, 500, { error: 'Saved searches could not be loaded.' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/hackathons/search') return send(res, 200, search(url.searchParams));
  if (req.method === 'POST' && url.pathname === '/api/searches') return saveSearch(req, res);
  if (req.method === 'GET' && url.pathname === '/api/admin/searches') return listSearches(req, res);
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'API route not found' });

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(PUBLIC, `.${requested}`);
  if (!file.startsWith(`${path.resolve(PUBLIC)}${path.sep}`)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(file, (err, content) => {
    if (err) return send(res, err.code === 'ENOENT' ? 404 : 500, 'Page not found', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`FOMOless is ready on port ${PORT}`));

