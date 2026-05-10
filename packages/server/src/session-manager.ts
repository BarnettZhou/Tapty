import type { WebSocket } from 'ws'
import type { IPty } from 'node-pty'
import { spawnShell } from './pty-engine.js'

export interface Session {
  id: string
  pty: IPty
  ws: WebSocket | null
  createdAt: number
  lastActivity: number
  title: string
}

let counter = 0
function generateId(): string {
  return `sess-${Date.now()}-${++counter}`
}

class SessionManager {
  private sessions = new Map<string, Session>()

  create(shell?: string, cwd?: string): Session {
    const id = generateId()
    const pty = spawnShell(shell, 80, 24, cwd)
    const session: Session = {
      id,
      pty,
      ws: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      title: pty.process || shell || 'shell',
    }
    this.sessions.set(id, session)
    return session
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  list(): { id: string; shell: string; pid: number; title: string; createdAt: number }[] {
    const result: { id: string; shell: string; pid: number; title: string; createdAt: number }[] = []
    for (const [id, session] of this.sessions) {
      result.push({
        id,
        shell: session.pty.process,
        pid: session.pty.pid,
        title: session.title,
        createdAt: session.createdAt,
      })
    }
    return result
  }

  attach(id: string, ws: WebSocket): boolean {
    const session = this.sessions.get(id)
    if (!session) return false
    session.ws = ws
    session.lastActivity = Date.now()
    return true
  }

  detach(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      session.ws = null
    }
  }

  detachByWs(ws: WebSocket): void {
    for (const session of this.sessions.values()) {
      if (session.ws === ws) {
        session.ws = null
      }
    }
  }

  rename(id: string, title: string): boolean {
    const session = this.sessions.get(id)
    if (!session) return false
    session.title = title
    return true
  }

  kill(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      try {
        session.pty.kill()
      } catch {
        // ignore
      }
      this.sessions.delete(id)
    }
  }

  killInactive(thresholdMs: number): void {
    // 默认阈值建议 4 小时（14_400_000ms），当前未启用定时调用
    const now = Date.now()
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > thresholdMs) {
        this.kill(id)
      }
    }
  }
}

export const sessionManager = new SessionManager()
