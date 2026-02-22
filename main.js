const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const QRCode = require('qrcode');
const { bin: cfBin } = require('cloudflared');

const { server, TOKEN, PORT } = require('./server');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow, cfProcess, tunnelUrl = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380, height: 520,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: 'MobeClaude',
  });
  mainWindow.loadFile('app.html');
}

app.whenReady().then(() => {
  server.listen(PORT, () => {
    createWindow();
    startTunnel();
  });
});

app.on('window-all-closed', () => {
  if (cfProcess) cfProcess.kill();
  app.quit();
});

function startTunnel() {
  cfProcess = spawn(cfBin, ['tunnel', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  const onData = chunk => {
    const m = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !tunnelUrl) {
      tunnelUrl = m[0];
      mainWindow?.webContents.send('tunnel-ready');
    }
  };
  cfProcess.stdout.on('data', onData);
  cfProcess.stderr.on('data', onData);
}

ipcMain.handle('get-status', async () => {
  const url = (tunnelUrl ? tunnelUrl : `http://localhost:${PORT}`) + `?token=${TOKEN}`;
  const qr = await QRCode.toDataURL(url, { width: 220, margin: 1 });
  return { url, token: TOKEN, port: PORT, hasTunnel: !!tunnelUrl, qr };
});

ipcMain.handle('get-config', () => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch { return {}; }
});

ipcMain.handle('save-config', (_, cfg) => {
  fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(cfg, null, 2));
  return { ok: true };
});

ipcMain.handle('open-browser', (_, url) => shell.openExternal(url));
ipcMain.handle('copy', (_, text) => { clipboard.writeText(text); });
