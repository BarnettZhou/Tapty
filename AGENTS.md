# Tapty — Agent 开发指南

## 项目简介

**Tapty**（Tap + PTY）是一个面向触摸设备（iPad/平板/手机）的 Web 终端壳层。在本地网络环境下，通过浏览器提供多标签 PowerShell 会话，解决移动端键盘缺失方向键、Tab、Ctrl 组合键等痛点。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端运行时 | Node.js 18+ | 轻量高效 |
| PTY 引擎 | `node-pty` | 跨平台伪终端，Windows PowerShell 兼容 |
| 实时通信 | `ws` (WebSocket) | 轻量原生二进制/文本帧 |
| 前端框架 | React 18 + TypeScript | 类型安全，组件化 |
| 终端渲染 | `xterm.js` + `xterm-addon-fit` | 社区标准，VT 序列兼容完整 |
| 状态管理 | Zustand | 轻量状态库 |
| 构建工具 | Vite (前端) + tsc (后端) | 启动快，配置少 |
| 包管理 | pnpm workspaces | monorepo 结构 |

## 项目结构

```
tapty/
├── pnpm-workspace.yaml
├── package.json
├── LICENSE-FONTS.txt          # JetBrainsMono Nerd Font (SIL OFL 1.1)
├── plan/                      # 方案文档
│   └── session-persistence.md # Session 持久化保活方案
├── packages/
│   ├── server/                # 后端 Node.js + WebSocket + node-pty
│   │   └── src/
│   │       ├── index.ts       # HTTP + WS 服务入口
│   │       ├── server.ts      # HTTP 静态文件托管
│   │       ├── websocket-router.ts  # WS 消息路由
│   │       ├── session-manager.ts   # 会话池管理
│   │       ├── pty-engine.ts        # node-pty 封装
│   │       └── protocol.ts          # 消息类型定义
│   └── client/                # 前端 React + xterm.js
│       ├── public/fonts/      # JetBrainsMono Nerd Font (.ttf)
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── index.css      # 全局样式 + @font-face + 滚动条美化
│           ├── stores/sessionStore.ts
│           ├── hooks/useWebSocket.ts
│           ├── components/
│           │   ├── TabBar/TabBar.tsx
│           │   ├── TerminalView/TerminalView.tsx
│           │   ├── VirtualKeyboard/VirtualKeyboard.tsx
│           │   ├── StatusBar/StatusBar.tsx
│           │   └── SettingsModal/SettingsModal.tsx
│           └── utils/keymap.ts
```

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发：并行启动前端 Vite (5173) + 后端 tsx watch (3456)
pnpm build            # 生产构建：前端 → server/dist/public
pnpm start            # 生产启动：node server/dist/index.js
```

## 开发规范

### 后端 (packages/server)
- `"type": "module"` — 纯 ES Module，相对导入必须带 `.js` 扩展名
- `require()` 在 ESM 中不可用，文件系统操作请用 `import fs from 'node:fs'`
- 端口：**3456**（开发 & 生产），**5173**（Vite dev server）
- 监听地址：`0.0.0.0`（支持局域网访问）

### 前端 (packages/client)
- Vite 配置 `host: true`，支持局域网 IP 访问
- WebSocket URL 使用 `window.location.host`，不硬编码 `localhost`
- xterm.js 初始化前需 `await document.fonts.ready`，否则 Nerd Font 宽度计算错误
- `React.StrictMode` 已移除（避免 xterm.js 双 mount/unmount 导致定时器异常）

### 代码风格
- 最小改动原则
- 遵循现有文件命名和目录结构
- 修改后保持 `pnpm build` 能通过

## 重启服务的规定 ⚠️

**如果需要重启开发服务器（`pnpm dev`），必须明确告知用户，由用户亲自执行。**

### 为什么

- `pnpm dev` 启动的是**长期运行进程**（Vite + tsx watch）
- 强制自动重启可能导致端口冲突、旧进程残留、文件句柄未释放
- 用户可能需要先保存当前终端会话状态

### 正确的重启流程

当代码改动涉及以下任一情况时，告知用户重启：

1. **后端源码修改**（`packages/server/src/` 下任何文件）
   - tsx watch 通常能自动重载，但如果遇到端口占用、ESM 缓存问题，需要手动重启
2. **Vite 配置修改**（`vite.config.ts`）
   - 热更新不生效，必须重启
3. **新增/删除依赖**（`package.json` 改动）
   - 必须 `pnpm install` 后重启
4. **端口冲突**（`EADDRINUSE` 错误）
   - 需要先杀进程再重启

### 告知用户的话术模板

代码已改完，需要重启 dev server 才能生效：

```bash
taskkill /F /IM node.exe
pnpm dev
```

刷新浏览器即可看到效果。

### 重启后注意事项

1. **端口输出**：
   - 前端 Vite：`http://localhost:5173`（局域网 IP 也会显示，如 `http://192.168.x.x:5173`）
   - 后端 Node：`http://0.0.0.0:3456`

2. **WebSocket 连接**：
   - 刷新浏览器后，前端会自动连接 `ws://<当前host>:<当前port>/ws`
   - 开发模式下 Vite proxy 会把 `/ws` 转发到后端 3456 端口

3. **xterm.js 初始化时机**：
   - 重启后首次加载页面，需等待 `document.fonts.ready`（Nerd Font 加载）
   - 如果字体加载慢，xterm 初始化会有短暂延迟

4. **后台进程残留检查**：
   - 如果重启后报错 `EADDRINUSE`，说明旧 Node 进程还在
   - 执行 `taskkill /F /IM node.exe` 后重试

## 字体文件

本项目嵌入了 **JetBrainsMono Nerd Font**，许可证为 **SIL Open Font License 1.1**。字体文件位于 `packages/client/public/fonts/`，许可证文本位于项目根目录 `LICENSE-FONTS.txt`。

## 已知问题与限制

1. **手机浏览器切后台 = WS 断开**：这是浏览器/OS 层面的限制，无法完全阻止。当前缓解策略是指数退避重连（1s→2s→4s→8s）。
2. **Node 进程退出 = 所有 PTY session 销毁**：OS 父子进程关系决定，父死子亡。如需长期驻留，请使用 Windows 服务 / pm2 / systemd。
3. **iOS Safari 100vh 问题**：已用 `100dvh` fallback 解决。
