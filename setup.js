const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));

async function main() {
  console.log('\n=== MobeClaude 一键初始化 ===\n');

  // 1. 生成 config.json
  const token = crypto.randomBytes(16).toString('hex');
  const port = (await ask(`端口 (默认 3399): `)).trim() || '3399';
  const cwd = (await ask(`工作目录 (默认 ${process.cwd()}): `)).trim() || process.cwd();

  console.log('\n--- Cloudflare 命名隧道配置 ---');
  console.log('如需固定域名，请先完成以下步骤:');
  console.log('  1. cloudflared tunnel login');
  console.log('  2. cloudflared tunnel create mobeclaude');
  console.log('  3. cloudflared tunnel route dns mobeclaude <你的子域名>');
  const tunnel = (await ask('\n隧道名称 (留空则用临时隧道): ')).trim();

  const config = { token, port: parseInt(port), cwd, tunnel };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
  console.log(`\n配置已写入 ${CONFIG_PATH}`);

  // 2. 构建访问 URL 并显示二维码
  let url;
  if (tunnel) {
    const domain = (await ask('你绑定的域名 (如 mobe.example.com): ')).trim();
    url = domain ? `https://${domain}?token=${token}` : null;
  }
  if (!url) {
    url = `http://localhost:${port}?token=${token}`;
    console.log('\n未配置固定域名，启动后会显示临时地址');
  }

  try {
    const qrcode = require('qrcode-terminal');
    console.log(`\n访问地址: ${url}\n`);
    qrcode.generate(url, { small: true }, qr => console.log(qr));
    console.log('请截图保存此二维码到手机\n');
  } catch { console.log(`\n访问地址: ${url}\n`); }

  // 3. PM2 注册
  const usePm2 = (await ask('是否注册 PM2 开机自启? (Y/n): ')).trim().toLowerCase();
  if (usePm2 !== 'n') {
    try {
      execSync('pm2 --version', { stdio: 'ignore' });
    } catch {
      console.log('正在安装 PM2...');
      execSync('npm install -g pm2', { stdio: 'inherit' });
    }

    console.log('注册 PM2 服务...');
    execSync(`pm2 start ecosystem.config.js`, { cwd: __dirname, stdio: 'inherit' });
    execSync('pm2 save', { stdio: 'inherit' });

    console.log('\n设置开机自启 (需要管理员权限):');
    if (process.platform === 'win32') {
      console.log('  请以管理员身份运行: pm2-startup install');
      console.log('  或手动运行: pm2 save');
    } else {
      try { execSync('pm2 startup', { stdio: 'inherit' }); } catch {}
    }
  }

  console.log('\n=== 初始化完成 ===');
  console.log(`Token: ${token}`);
  console.log(`端口: ${port}`);
  if (tunnel) console.log(`隧道: ${tunnel}`);
  console.log('\n手动启动: npm start');
  if (usePm2 !== 'n') console.log('PM2 管理: pm2 status / pm2 logs mobeclaude / pm2 restart mobeclaude');
  console.log('');

  rl.close();
}

main().catch(e => { console.error(e); rl.close(); process.exit(1); });
