const { server, TOKEN, PORT, TUNNEL_NAME, TUNNEL_DOMAIN } = require('./server');
const os = require('os');
const { spawn, execSync } = require('child_process');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.log(`端口 ${PORT} 被占用，尝试关闭旧进程...`);
    try {
      if (process.platform === 'win32') {
        const out = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf8' });
        const pid = out.trim().split(/\s+/).pop();
        if (pid && pid !== '0') execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
      }
      setTimeout(() => server.listen(PORT), 1000);
    } catch { console.error(`无法释放端口 ${PORT}，请手动关闭占用进程`); process.exit(1); }
  } else { throw err; }
});

server.listen(PORT, () => {
  console.log(`\n服务已启动: http://localhost:${PORT}?token=${TOKEN}\n`);
  startTunnel();
});

function findCloudflared() {
  // 1. PATH 里直接找
  try { execSync('cloudflared --version', { stdio: 'ignore' }); return 'cloudflared'; } catch {}
  // 2. WinGet 安装目录
  const wingetDir = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wingetDir)) {
    for (const d of fs.readdirSync(wingetDir)) {
      if (d.toLowerCase().includes('cloudflare')) {
        const p = path.join(wingetDir, d, 'cloudflared.exe');
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

function startNamedTunnel(bin) {
  console.log(`命名隧道模式: ${TUNNEL_NAME}`);

  // 生成 cloudflared 配置文件
  const cfDir = path.join(os.homedir(), '.cloudflared');
  const cfConfig = path.join(cfDir, 'config.yml');
  if (!fs.existsSync(cfConfig) && TUNNEL_DOMAIN) {
    const yml = `tunnel: ${TUNNEL_NAME}\ningress:\n  - hostname: ${TUNNEL_DOMAIN}\n    service: http://localhost:${PORT}\n  - service: http_status:404\n`;
    try { fs.writeFileSync(cfConfig, yml); console.log(`已生成 ${cfConfig}`); } catch {}
  }

  const args = ['tunnel', 'run'];
  if (TUNNEL_DOMAIN) args.push('--url', `http://localhost:${PORT}`);
  args.push(TUNNEL_NAME);

  const cf = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let connected = false;
  cf.stderr.on('data', chunk => {
    const text = chunk.toString();
    if (text.includes('Registered tunnel connection') && !connected) {
      connected = true;
      const url = TUNNEL_DOMAIN ? `https://${TUNNEL_DOMAIN}?token=${TOKEN}` : '';
      console.log('隧道已连接!');
      if (url) { console.log(`固定地址: ${url}\n`); showQR(url, '扫描二维码连接 (固定域名):'); }
    }
  });

  cf.on('error', () => { console.log('命名隧道启动失败，回退到快速隧道'); startQuickTunnel(bin); });
  cf.on('exit', code => { if (code) { console.log('命名隧道异常退出，回退到快速隧道'); startQuickTunnel(bin); } });
  process.on('SIGINT', () => { cf.kill(); process.exit(); });
}

function startQuickTunnel(bin) {
  const cf = spawn(bin, ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let found = false;
  const onData = chunk => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !found) {
      found = true;
      const url = `${match[0]}?token=${TOKEN}`;
      console.log(`远程地址: ${url}\n`);
      showQR(url, '扫描二维码连接:');
    }
  };

  cf.stdout.on('data', onData);
  cf.stderr.on('data', onData);
  cf.on('error', () => showLocalQR());
  cf.on('exit', code => { if (code && !found) { console.log('cloudflared 异常退出'); showLocalQR(); } });
  process.on('SIGINT', () => { cf.kill(); process.exit(); });
}

function startTunnel() {
  const bin = findCloudflared();
  if (!bin) {
    console.log('cloudflared 未找到，仅局域网可用');
    console.log('安装: winget install cloudflare.cloudflared\n');
    showLocalQR();
    return;
  }

  if (TUNNEL_NAME) {
    startNamedTunnel(bin);
  } else {
    startQuickTunnel(bin);
  }
}

function showQR(url, label) {
  qrcode.generate(url, { small: true }, qr => {
    console.log(`${label}\n`);
    console.log(qr);
  });
}

function showLocalQR() {
  showQR(`http://localhost:${PORT}?token=${TOKEN}`, '扫描二维码连接 (仅局域网):');
}
