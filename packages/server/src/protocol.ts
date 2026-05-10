export interface SessionMeta {
  sessionId: string
  shell: string
  pid: number
  title: string
  createdAt: number
}

export interface ClientMessage {
  type: 'create' | 'input' | 'resize' | 'ping' | 'close' | 'list' | 'attach' | 'rename'
  sessionId?: string
  data?: string
  cols?: number
  rows?: number
  shell?: string
  cwd?: string
  title?: string
}

export interface ServerMessage {
  type: 'created' | 'output' | 'error' | 'exited' | 'pong' | 'sessions' | 'attached' | 'renamed'
  sessionId?: string
  shell?: string
  pid?: number
  data?: string
  message?: string
  exitCode?: number
  sessions?: SessionMeta[]
  title?: string
}
