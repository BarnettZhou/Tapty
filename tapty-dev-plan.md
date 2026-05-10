# Tapty 开发方案

## 1. 项目定位

**Tapty**（Tap + PTY）是一个面向触摸设备（iPad/平板）的 Web 终端壳层。它在本地网络环境下，通过浏览器提供多标签 PowerShell 会话，并解决移动端键盘缺失方向键、Tab、Ctrl 组合键等核心痛点。

---

## 2. 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 后端运行时 | Node.js 18+ | 轻量高效，生态成熟 |
| PTY 引擎 | `node-pty` | 跨平台伪终端，Windows PowerShell 兼容性好 |
| 实时通信 | `ws` (WebSocket) | 轻量，无 Socket.io 冗余，支持原生二进制/文本帧 |
| 前端框架 | React 18 + TypeScript | 类型安全，组件化开发 |
| 终端渲染 | `xterm.js` + `xterm-addon-fit` | 社区标准，VT 序列兼容完整 |
| 构建工具 | Vite (前端) + tsc (后端) | 启动快，配置少 |
| 包管理 | pnpm workspaces | monorepo 结构清晰，前后端依赖隔离 |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────┐
│                  iPad Safari                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Tab A   │  │  Tab B   │  │  Tab C   │  │
│  │ xterm.js │  │ xterm.js │  │ xterm.js │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │          │
│  ┌────┴─────────────┴─────────────┴─────┐  │
│  │      Virtual Keyboard Layer          │  │
│  │  [↑][↓][←][→] [Tab] [Ctrl+C] ...   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────┬───────────────────────┘
                      │ WebSocket (ws://host:3000)
┌─────────────────────┴───────────────────────┐
│              Tapty Server (Node)             │
│  ┌──────────────────────────────────────┐   │
│  │        SessionManager (Map)          │   │
│  │  session-1 → node-pty (PowerShell)   │   │
│  │  session-2 → node-pty (PowerShell)   │   │
│  │  session-3 → node-pty (PowerShell)   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 4. 后端设计 (`packages/server`)

### 4.1 目录结构

```
packages/server/
├── src/
│   ├── index.ts              # 入口：启动 HTTP + WS 服务
│   ├── server.ts             # HTTP 服务器与静态文件托管
│   ├── websocket-router.ts   # WS 连接生命周期与消息路由
│   ├── session-manager.ts    # 会话池：创建、销毁、查询
│   ├── pty-engine.ts         # node-pty 封装，平台适配
│   ├── protocol.ts           # 消息类型定义与校验
│   └── config.ts             # 端口、Shell 路径、心跳等配置
├── package.json
└── tsconfig.json
```

### 4.2 核心模块接口

#### SessionManager

```typescript
interface Session {
  id: string;
  pty: IPty;              // node-pty 实例
  ws: WebSocket | null;   // 当前挂载的 WS 连接
  createdAt: number;
  lastActivity: number;
}

class SessionManager {
  create(shell: string, cwd: string): Session;
  attach(sessionId: string, ws: WebSocket): boolean;
  detach(sessionId: string): void;
  kill(sessionId: string): void;
  killInactive(thresholdMs: number): void;  // 定时清理僵尸会话
}
```

#### PtyEngine

```typescript
class PtyEngine {
  spawn(shell: string, cols: number, rows: number, cwd: string): IPty;
  // Windows 下自动探测 powershell/pwsh 路径
  // macOS/Linux 下默认 $SHELL
  getDefaultShell(): string;
}
```

### 4.3 WebSocket 通信协议

所有消息为 JSON 文本帧。

**客户端 → 服务端**

| type | 字段 | 说明 |
|------|------|------|
| `create` | `{ shell?: string, cwd?: string }` | 请求新建会话 |
| `input` | `{ sessionId, data: string }` | 用户输入（含控制序列） |
| `resize` | `{ sessionId, cols, rows }` | 终端尺寸变更 |
| `ping` | `{}` | 心跳（前端 30s 发送一次） |
| `close` | `{ sessionId }` | 主动关闭会话 |

**服务端 → 客户端**

| type | 字段 | 说明 |
|------|------|------|
| `created` | `{ sessionId, shell, pid }` | 会话创建成功 |
| `output` | `{ sessionId, data: string }` | PTY 输出 |
| `error` | `{ sessionId?, message }` | 错误通知 |
| `exited` | `{ sessionId, exitCode? }` | 会话进程退出 |
| `pong` | `{}` | 心跳响应 |

### 4.4 关键代码骨架

```typescript
// websocket-router.ts
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString()) as ClientMessage;

    switch (msg.type) {
      case 'create': {
        const session = sessionManager.create(msg.shell, msg.cwd);
        sessionManager.attach(session.id, ws);
        ws.send(JSON.stringify({ 
          type: 'created', 
          sessionId: session.id, 
          pid: session.pty.pid 
        }));

        // PTY 输出 → WS
        session.pty.onData(data => {
          ws.send(JSON.stringify({ 
            type: 'output', 
            sessionId: session.id, 
            data 
          }));
        });

        session.pty.onExit(({ exitCode }) => {
          ws.send(JSON.stringify({ 
            type: 'exited', 
            sessionId: session.id, 
            exitCode 
          }));
          sessionManager.kill(session.id);
        });
        break;
      }

      case 'input': {
        const session = sessionManager.get(msg.sessionId);
        session?.pty.write(msg.data);
        break;
      }

      case 'resize': {
        const session = sessionManager.get(msg.sessionId);
        session?.pty.resize(msg.cols, msg.rows);
        break;
      }
    }
  });

  ws.on('close', () => {
    // 可选策略：断开即杀，或保持后台运行（Tabby 行为）
    // Tapty 采用：断开保留 5 分钟，超时自动清理
  });
});
```

---

## 5. 前端设计 (`packages/client`)

### 5.1 目录结构

```
packages/client/
├── src/
│   ├── components/
│   │   ├── TabBar/           # 多标签栏
│   │   ├── TerminalView/     # xterm.js 挂载容器
│   │   ├── VirtualKeyboard/  # 底部虚拟按键条
│   │   └── StatusBar/        # 连接状态、会话信息
│   ├── hooks/
│   │   ├── useTerminal.ts    # xterm.js 初始化、销毁、fit
│   │   ├── useWebSocket.ts   # WS 连接、重连、心跳
│   │   └── useSession.ts     # 会话级状态管理
│   ├── stores/
│   │   └── sessionStore.ts   # Zustand：标签列表、激活标签、会话元数据
│   ├── services/
│   │   └── protocol.ts       # 消息构造与发送封装
│   ├── utils/
│   │   └── keymap.ts         # 虚拟按键 → 控制序列映射表
│   ├── App.tsx
│   └── main.tsx
├── index.html
└── vite.config.ts
```

### 5.2 状态管理 (Zustand)

```typescript
interface SessionState {
  sessions: Session[];
  activeId: string | null;

  addSession: (id: string, shell: string) => void;
  removeSession: (id: string) => void;
  setActive: (id: string) => void;
  updateTitle: (id: string, title: string) => void;  // 捕获 PS1/标题序列
}
```

### 5.3 虚拟按键映射表 (`utils/keymap.ts`)

```typescript
export const KEY_SEQUENCES = {
  ARROW_UP:    '\x1b[A',
  ARROW_DOWN:  '\x1b[B',
  ARROW_RIGHT: '\x1b[C',
  ARROW_LEFT:  '\x1b[D',
  TAB:         '\t',
  ESC:         '\x1b',
  ENTER:       '\r',
  BACKSPACE:   '\x7f',
  CTRL_C:      '\x03',
  CTRL_D:      '\x04',
  CTRL_L:      '\x0c',
  CTRL_U:      '\x15',
  CTRL_A:      '\x01',
  CTRL_E:      '\x05',
} as const;
```

### 5.4 iPad 交互层核心逻辑

**问题**：点击虚拟按钮会导致 `xterm.js` 的隐藏 textarea 失焦，物理键盘再次弹出时焦点错乱。

**解决策略**：

```typescript
// VirtualKeyboard.tsx
const sendSequence = (seq: string) => {
  const activeSession = useSessionStore.getState().getActiveSession();
  if (!activeSession) return;

  // 1. 通过 WS 发送，而非依赖 xterm 键盘事件
  wsService.sendInput(activeSession.id, seq);

  // 2. 强制将焦点还给 xterm，保证后续物理键盘输入正常
  activeSession.terminal.focus();
};

// 按钮绑定
<button
  onTouchStart={(e) => {
    e.preventDefault();        // 阻止 iPad 默认行为（缩放、失焦）
    sendSequence(KEY_SEQUENCES.ARROW_UP);
  }}
>
  ↑
</button>
```

### 5.5 前端通信封装

```typescript
// services/protocol.ts
class WsService {
  private ws: WebSocket;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => this.send({ type: 'create' });
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
  }

  createSession() {
    this.send({ type: 'create' });
  }

  sendInput(sessionId: string, data: string) {
    this.send({ type: 'input', sessionId, data });
  }

  resize(sessionId: string, cols: number, rows: number) {
    this.send({ type: 'resize', sessionId, cols, rows });
  }

  private handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'created':
        useSessionStore.getState().addSession(msg.sessionId, msg.shell);
        break;
      case 'output':
        // 路由到对应 xterm 实例
        const session = useSessionStore.getState().getSession(msg.sessionId);
        session?.terminal.write(msg.data);
        break;
      case 'exited':
        useSessionStore.getState().removeSession(msg.sessionId);
        break;
    }
  }
}
```

---

## 6. 关键实现细节

### 6.1 多标签与 xterm.js 生命周期

每个标签对应一个独立的 `Terminal` 实例，切换标签时：

1. **视觉上**：通过 CSS `display: none/block` 切换容器。
2. **焦点上**：切换后执行 `terminal.focus()` + `addonFit.fit()`。
3. **资源上**：标签关闭时调用 `terminal.dispose()`，释放 DOM 和解析器资源。

### 6.2 终端尺寸同步

xterm.js 的 `addon-fit` 根据容器宽度计算列数，但 iPad 横竖屏切换时需要主动通知后端：

```typescript
const resizeObserver = new ResizeObserver(() => {
  const { cols, rows } = fitAddon.proposeDimensions();
  fitAddon.fit();
  wsService.resize(sessionId, cols, rows);
});
```

### 6.3 会话保活策略

| 场景 | 策略 |
|------|------|
| 用户刷新页面 | WS 断开，会话保留 5 分钟，超时自动 `pty.kill()` |
| 用户主动关闭标签 | 前端发送 `close`，服务端立即 `kill` |
| 用户关闭浏览器 | 同刷新，依赖心跳超时检测（60s 无 ping 视为失联） |
| PowerShell 进程崩溃 | `pty.onExit` 触发，前端收到 `exited`，标签变灰 |

---

## 7. 开发里程碑

| 阶段 | 周期 | 交付物 | 验收标准 |
|------|------|--------|----------|
| **M0：脚手架** | 0.5 天 | pnpm monorepo、tsconfig、热更新 | `pnpm dev` 同时启动前后端 |
| **M1：PTY 管道** | 1 天 | 后端 WS + 单会话 PowerShell | iPad 访问 `ws://ip:3000`，能输入 `ls` 并看到输出 |
| **M2：多标签** | 1 天 | TabBar + 会话池 + 切换/关闭 | 同时开 3 个标签，各自独立 Shell |
| **M3：虚拟键盘** | 1 天 | 底部按键条 + 控制序列映射 | iPad 上能用 ↑↓←→ 翻历史命令，Tab 补全 |
| **M4：iPad 打磨** | 1 天 | 焦点保持、横竖屏适配、心跳重连 | 物理键盘与虚拟按键混合使用无冲突 |
| **M5：打包部署** | 0.5 天 | 生产构建、环境变量、systemd 服务 | `pnpm build` 产出可执行目录，开机自启 |

**总预估：5 天**（含调试与 iPad 真机测试）。

---

## 8. 部署方式

```bash
# 开发
pnpm install
pnpm dev          # 并行启动前端 Vite + 后端 nodemon

# 生产
pnpm build        # 前端产物 → packages/server/dist/public
pnpm start        # 后端启动，托管静态文件 + WS 服务

# Windows 自启（可选）
# 使用 node-windows 或 nssm 将 node packages/server/dist/index.js 注册为服务
```

---

## 9. 风险与对策

| 风险 | 对策 |
|------|------|
| iPad Safari WebSocket 断连激进 | 前端实现指数退避重连（1s → 2s → 4s → 8s） |
| PowerShell 编码问题（中文乱码） | 启动参数加 `-NoExit -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8"` |
| xterm.js 在 iPad 上滚动卡顿 | 关闭 WebGL addon，使用 DOM renderer；限制 scrollback 至 1000 行 |
| node-pty Windows 编译失败 | 确保安装 `windows-build-tools` 或使用预构建镜像 |
