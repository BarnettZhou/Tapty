import { create } from 'zustand'
import type { Terminal } from 'xterm'

export interface Session {
  id: string
  shell: string
  pid?: number
  title: string
  terminal?: Terminal
  connected: boolean
}

interface SessionState {
  sessions: Session[]
  activeId: string | null
  fontSize: number

  addSession: (id: string, shell: string, pid?: number, terminal?: Terminal) => void
  removeSession: (id: string) => void
  setActive: (id: string) => void
  updateTitle: (id: string, title: string) => void
  updatePid: (id: string, pid: number) => void
  bindTerminal: (id: string, terminal: Terminal) => void
  setConnected: (id: string, connected: boolean) => void
  disconnectAll: () => void
  setFontSize: (size: number) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: null,
  fontSize: 14,

  addSession: (id, shell, pid, terminal) =>
    set((state) => {
      if (state.sessions.some((s) => s.id === id)) {
        return { activeId: id }
      }
      return {
        sessions: [
          ...state.sessions,
          { id, shell, pid: pid ?? 0, title: shell, terminal: terminal!, connected: true },
        ],
        activeId: id,
      }
    }),

  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      const activeId = state.activeId === id
        ? (sessions[sessions.length - 1]?.id ?? null)
        : state.activeId
      return { sessions, activeId }
    }),

  setActive: (id) => set({ activeId: id }),

  updateTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    })),

  updatePid: (id, pid) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, pid } : s
      ),
    })),

  bindTerminal: (id, terminal) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, terminal } : s
      ),
    })),

  setConnected: (id, connected) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, connected } : s
      ),
    })),

  disconnectAll: () =>
    set((state) => ({
      sessions: state.sessions.map((s) => ({ ...s, connected: false })),
    })),

  setFontSize: (size) => {
    const rounded = Math.max(8, Math.min(32, Math.round(size)))
    set({ fontSize: rounded })
    // 同步到所有已存在的 terminal
    const { sessions } = get()
    for (const s of sessions) {
      if (s.terminal) {
        s.terminal.options.fontSize = rounded
      }
    }
  },
}))
