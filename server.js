const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// 从 config.json 读取固定配置
let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch {}

const TOKEN = config.token || process.env.MOBE_TOKEN || crypto.randomBytes(16).toString('hex');
const PORT = config.port || process.env.MOBE_PORT || 3399;
const BASE_CWD = config.cwd || process.env.MOBE_CWD || process.cwd();
const TUNNEL_NAME = config.tunnel || '';
const TUNNEL_DOMAIN = config.domain || '';

const app = express();
const server = http.createServer(app);
app.use(express.json());

// 认证中间件
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (req.query.token !== TOKEN) return res.status(403).send('Forbidden');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// === 多会话管理 ===
const sessions = new Map(); // id -> { proc, cwd, name, createdAt }

function createSession(cwd, name) {
  const id = crypto.randomBytes(4).toString('hex');
  const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
  const proc = pty.spawn(shell, [], {
    name: 'xterm-256color', cols: 120, rows: 30,
    cwd, env: { ...process.env, TERM: 'xterm-256color' },
  });
  const session = { proc, cwd, name, id, createdAt: Date.now() };
  proc.onExit(() => sessions.delete(id));
  sessions.set(id, session);
  return session;
}

function getOrCreateDefault() {
  if (sessions.size > 0) return sessions.values().next().value;
  return createSession(BASE_CWD, path.basename(BASE_CWD));
}

// API: 会话列表
app.get('/api/sessions', (req, res) => {
  const list = [...sessions.values()].map(s => ({
    id: s.id, name: s.name, cwd: s.cwd, createdAt: s.createdAt,
  }));
  res.json(list);
});

// API: 新建会话
app.post('/api/sessions', (req, res) => {
  const cwd = req.body.cwd || BASE_CWD;
  const name = req.body.name || path.basename(cwd);
  const s = createSession(cwd, name);
  res.json({ id: s.id, name: s.name, cwd: s.cwd });
});

// API: 删除会话
app.delete('/api/sessions/:id', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.proc.kill();
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

// API: 项目列表（扫描上级目录的文件夹）
app.get('/api/projects', (req, res) => {
  const parentDir = path.dirname(BASE_CWD);
  try {
    const dirs = fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .map(d => ({ name: d.name, path: path.join(parentDir, d.name) }));
    res.json(dirs);
  } catch { res.json([]); }
});

// WebSocket 服务
const wss = new WebSocketServer({ server });
wss.on('error', () => {});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.searchParams.get('token') !== TOKEN) {
    ws.close(4003, 'Forbidden');
    return;
  }

  const mode = url.searchParams.get('mode') || 'terminal';
  const sid = url.searchParams.get('sid');
  const session = sid && sessions.has(sid) ? sessions.get(sid) : getOrCreateDefault();
  const proc = session.proc;

  // 告知客户端当前会话ID
  ws.send(JSON.stringify({ type: 'session', id: session.id, name: session.name }));

  if (mode === 'terminal') {
    const onData = proc.onData(data => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data }));
    });
    ws.on('message', msg => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'input') proc.write(parsed.data);
      if (parsed.type === 'resize') proc.resize(parsed.cols, parsed.rows);
    });
    ws.on('close', () => onData.dispose());
  } else {
    let buffer = '';
    let timer = null;
    const flush = () => {
      if (buffer && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'output', data: buffer }));
        buffer = '';
      }
    };
    const onData = proc.onData(data => {
      buffer += data;
      clearTimeout(timer);
      timer = setTimeout(flush, 300);
    });
    ws.on('message', msg => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'input') proc.write(parsed.data + '\r');
    });
    ws.on('close', () => { onData.dispose(); clearTimeout(timer); });
  }
});

// === 文件管理 API ===
app.get('/api/files', (req, res) => {
  const dir = path.resolve(req.query.path || BASE_CWD);
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => !d.name.startsWith('.'))
      .map(d => ({ name: d.name, isDir: d.isDirectory(), path: path.join(dir, d.name) }))
      .sort((a, b) => b.isDir - a.isDir || a.name.localeCompare(b.name));
    res.json({ path: dir, parent: path.dirname(dir), items });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/file', (req, res) => {
  try {
    const content = fs.readFileSync(path.resolve(req.query.path), 'utf8');
    res.json({ content });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/file', (req, res) => {
  try {
    fs.writeFileSync(path.resolve(req.body.path), req.body.content, 'utf8');
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = { app, server, TOKEN, PORT, TUNNEL_NAME, TUNNEL_DOMAIN };
