# MobeClaude

> "随时随地掌控你的 Claude Code 终端，让 AI 编码无界限。"

---

## 下载安装

### 快速开始

```bash
# 克隆项目
git clone https://github.com/yourusername/MobeClaude.git
cd MobeClaude

# 安装依赖
npm install

# 启动服务
npm start
```

### Electron 桌面版

```bash
npm run electron
```

### 环境要求

- Node.js >= 18
- Windows / macOS / Linux
- （可选）cloudflared：用于公网隧道访问

---

## 什么是 MobeClaude？

MobeClaude 是一个轻量级的远程终端解决方案，专为 Claude Code 用户设计。通过 Web 界面，你可以随时随地访问和控制你的开发环境，不再受限于本地终端。

### 核心特性

- **三种交互模式** — 终端模式、聊天模式、文件管理
- **Cloudflare Tunnel 集成** — 无需端口映射，一键公网访问
- **多会话管理** — 同时管理多个终端会话
- **文件在线编辑** — 直接在浏览器中查看和编辑代码
- **Token 认证** — 安全的访问控制机制
- **响应式设计** — 完美适配手机和平板设备

### 与传统方案的区别

|  | SSH / VS Code Remote | MobeClaude |
| --- | --- | --- |
| 部署难度 | 需要配置端口映射/SSH | 零配置，自动隧道 |
| 移动端体验 | 需要专用 App | 浏览器即开即用 |
| 资源占用 | 较高 | 极低（纯 Node.js） |
| 访问方式 | 局域网或公网 IP | 自动生成公网地址 |

---

## 功能特性

### 终端模式

完整的终端体验，基于 xterm.js。

![终端模式](https://via.placeholder.com/800x400?text=Terminal+Mode)

- 实时终端输出
- 虚拟键盘（支持 Ctrl、方向键等）
- 自动适配屏幕尺寸
- 连接状态指示

### 聊天模式

对话式交互界面，简化 AI 编程体验。

![聊天模式](https://via.placeholder.com/800x400?text=Chat+Mode)

- 简洁的聊天界面
- 输入缓冲（300ms 延迟）
- 历史记录保留

### 文件管理

在线浏览和编辑项目文件。

![文件管理](https://via.placeholder.com/800x400?text=File+Manager)

- 目录树浏览
- 文件内容查看
- 在线编辑保存
- 智能排序（文件夹优先）

### 隧道访问

支持 Cloudflare 快速隧道和命名隧道。

```bash
# 快速隧道（自动生成随机域名）
https://xxx.trycloudflare.com

# 命名隧道（固定域名，需配置）
https://your-domain.com
```

---

## 配置说明

### 配置文件

编辑 `config.json` 自定义配置：

```json
{
  "token": "your-token-here",
  "port": 3399,
  "cwd": "H:\\long\\MobeClaude",
  "tunnel": "",
  "domain": ""
}
```

| 参数 | 说明 |
| --- | --- |
| `token` | 访问令牌（留空自动生成） |
| `port` | 本地服务端口（默认 3399） |
| `cwd` | 默认工作目录 |
| `tunnel` | 命名隧道名称（可选） |
| `domain` | 固定域名（可选） |

### 安装 cloudflared（可选）

```bash
# Windows (WinGet)
winget install cloudflare.cloudflared

# macOS (Homebrew)
brew install cloudflare/cloudflared/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | Electron |
| 后端 | Node.js + Express |
| WebSocket | ws |
| 终端 | node-pty + xterm.js |
| 二维码 | qrcode |
| 隧道 | cloudflared |
| 前端 | 原生 HTML/CSS/JS |

---

## 项目结构

```
MobeClaude/
├── main.js           # Electron 主进程
├── server.js         # Express 服务器 + WebSocket
├── start.js          # 终端启动脚本
├── setup.js          # 安装脚本
├── config.json       # 配置文件
├── app.html          # Electron 界面
├── package.json      # 项目依赖
└── public/           # Web 前端
    ├── index.html    # 主页（模式选择）
    ├── terminal.html # 终端模式
    ├── chat.html     # 聊天模式
    └── files.html    # 文件管理
```

---

## API 接口

### 认证

所有请求需要通过 `?token=xxx` 参数进行认证。

### WebSocket 连接

```
ws://localhost:3399?token=xxx&mode=terminal
```

| 模式 | 说明 |
| --- | --- |
| `terminal` | 终端模式（双向实时通信） |
| `chat` | 聊天模式（带输入缓冲） |

### REST API

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/sessions` | GET | 获取会话列表 |
| `/api/sessions` | POST | 创建新会话 |
| `/api/sessions/:id` | DELETE | 删除会话 |
| `/api/projects` | GET | 获取项目列表 |
| `/api/files` | GET | 获取文件列表 |
| `/api/file` | GET | 读取文件内容 |
| `/api/file` | POST | 保存文件内容 |

---

## 使用场景

- **移动开发** — 手机上随时查看终端输出
- **远程调试** — 远程服务器代码调试
- **演示分享** — 向团队展示 AI 编程过程
- **多设备协同** — 在不同设备间无缝切换

---

## 常见问题

### 端口被占用怎么办？

MobeClaude 会自动尝试关闭占用端口的进程，如果失败请手动关闭：

```bash
# Windows
netstat -ano | findstr :3399
taskkill /F /PID <pid>

# Linux/macOS
lsof -ti:3399 | xargs kill -9
```

### 如何获取固定域名？

1. 注册 [Cloudflare Zero Trust](https://dash.cloudflare.com/sign-up)
2. 创建命名隧道
3. 在 `config.json` 中配置 `tunnel` 和 `domain`

---

## 安全建议

- 使用强随机 Token
- 避免在公网环境暴露 Token
- 定期更新 cloudflared
- 生产环境建议使用命名隧道 + HTTPS

---

## 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 发起 Pull Request

---

## 许可证

MIT License

---

**MobeClaude** — 随时随地，掌控你的终端。

Built with passion. Open by nature.
