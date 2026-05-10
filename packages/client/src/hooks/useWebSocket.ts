import { useEffect, useRef } from 'react'
import type { ServerMessage } from '../../../server/src/protocol'
import { useSessionStore } from '../stores/sessionStore'

const WS_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
})()

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(1000)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const addSession = useSessionStore((s) => s.addSession)
  const removeSession = useSessionStore((s) => s.removeSession)
  const setConnected = useSessionStore((s) => s.setConnected)
  const disconnectAll = useSessionStore((s) => s.disconnectAll)

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WS connected')
      reconnectDelay.current = 1000
      ws.send(JSON.stringify({ type: 'list' }))
      heartbeatTimer.current = setInterval(() => {
        ws.send(JSON.stringify({ type: 'ping' }))
      }, 30000)
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as ServerMessage
      const store = useSessionStore.getState()

      switch (msg.type) {
        case 'sessions': {
          if (msg.sessions) {
            const remoteIds = new Set(msg.sessions.map((s) => s.sessionId))
            const localIds = new Set(store.sessions.map((s) => s.id))
            // 恢复远程存在的 session
            for (const s of msg.sessions) {
              if (!localIds.has(s.sessionId)) {
                addSession(s.sessionId, s.shell || 'powershell', s.pid)
              } else {
                setConnected(s.sessionId, true)
              }
              ws.send(JSON.stringify({ type: 'attach', sessionId: s.sessionId }))
            }
            // 清理本地有但远程已不存在的
            for (const local of store.sessions) {
              if (!remoteIds.has(local.id)) {
                removeSession(local.id)
              }
            }
            if (msg.sessions.length === 0) {
              ws.send(JSON.stringify({ type: 'create' }))
            }
          }
          break
        }
        case 'attached': {
          if (msg.sessionId) {
            setConnected(msg.sessionId, true)
          }
          break
        }
        case 'created': {
          if (msg.sessionId) {
            addSession(msg.sessionId, msg.shell || 'powershell', msg.pid)
          }
          break
        }
        case 'output': {
          if (msg.sessionId && msg.data) {
            const session = store.sessions.find((s) => s.id === msg.sessionId)
            session?.terminal?.write(msg.data)
          }
          break
        }
        case 'exited': {
          if (msg.sessionId) {
            removeSession(msg.sessionId)
          }
          break
        }
        case 'error': {
          console.error('Server error:', msg.message)
          break
        }
      }
    }

    ws.onclose = () => {
      console.log('WS disconnected')
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
        heartbeatTimer.current = null
      }
      disconnectAll()
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('WS error:', err)
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null
      connect()
    }, reconnectDelay.current)
    reconnectDelay.current = Math.min(reconnectDelay.current * 2, 8000)
  }

  const sendInput = (sessionId: string, data: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'input', sessionId, data }))
  }

  const sendResize = (sessionId: string, cols: number, rows: number) => {
    wsRef.current?.send(JSON.stringify({ type: 'resize', sessionId, cols, rows }))
  }

  const createSession = () => {
    wsRef.current?.send(JSON.stringify({ type: 'create' }))
  }

  const closeSession = (sessionId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'close', sessionId }))
    removeSession(sessionId)
  }

  const attachSession = (sessionId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'attach', sessionId }))
  }

  useEffect(() => {
    connect()
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [])

  return { sendInput, sendResize, createSession, closeSession, attachSession, wsRef }
}
