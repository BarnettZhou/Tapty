# Tapty

基于浏览器的终端模拟器，支持多标签 PTY 会话、虚拟键盘和移动端访问。

## 特性

- **真实 PTY**：通过 `node-pty` 在服务端启动系统 Shell（Windows 优先 PowerShell 7）
- **多标签会话**：支持同时打开多个终端标签页，自由切换
- **Session 保活**：WebSocket 断开后 PTY 进程继续运行，重连后自动恢复
- **虚拟键盘**：移动端悬浮键盘，支持方向键与常用 Ctrl 组合键
- **响应式设计**：适配桌面、平板和手机，支持局域网内 iPad 访问
- **Nerd Font 集成**：内置 JetBrainsMono Nerd Font，图标与符号完美显示
- **字体设置**：全局字体大小调节，实时生效

## 技术栈

- **前端**：React + Vite + xterm.js + zustand
- **后端**：Node.js + WebSocket (`ws`) + `node-pty`
- **构建**：TypeScript + pnpm workspaces

## 快速开始

### 开发环境

```bash
pnpm install
pnpm dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3456`

### 生产构建

```bash
pnpm build
pnpm start
```

生产环境统一在 `http://0.0.0.0:3456`。

### 局域网访问

确保设备与电脑在同一 Wi-Fi 下，访问 `http://<电脑IP>:5173`（开发）或 `:3456`（生产）。

## 项目结构

```
.
├── packages/
│   ├── client/          # React + Vite 前端
│   └── server/          # Node.js + WS 后端
├── .workspace/          # 开发计划与诊断脚本（未纳入版本控制）
├── AGENTS.md            # 项目开发规范
└── pnpm-workspace.yaml
```

## 许可证

- 代码：MIT
- 字体：JetBrainsMono Nerd Font（SIL Open Font License 1.1）
