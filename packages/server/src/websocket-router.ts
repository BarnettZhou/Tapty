import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { sessionManager } from './session-manager.js'
import type { ClientMessage, ServerMessage } from './protocol.js'

export function createWebSocketRouter(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    console.log('WS connected')

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage

        switch (msg.type) {
          case 'create': {
            const session = sessionManager.create(msg.shell, msg.cwd)
            sessionManager.attach(session.id, ws)

            const createdMsg: ServerMessage = {
              type: 'created',
              sessionId: session.id,
              shell: session.pty.process,
              pid: session.pty.pid,
            }
            ws.send(JSON.stringify(createdMsg))

            session.pty.onData((data: string) => {
              const s = sessionManager.get(session.id)
              if (s?.ws && s.ws.readyState === WebSocket.OPEN) {
                const outputMsg: ServerMessage = {
                  type: 'output',
                  sessionId: session.id,
                  data,
                }
                s.ws.send(JSON.stringify(outputMsg))
              }
            })

            session.pty.onExit(({ exitCode }: { exitCode: number }) => {
              const s = sessionManager.get(session.id)
              if (s?.ws && s.ws.readyState === WebSocket.OPEN) {
                const exitedMsg: ServerMessage = {
                  type: 'exited',
                  sessionId: session.id,
                  exitCode,
                }
                s.ws.send(JSON.stringify(exitedMsg))
              }
              sessionManager.kill(session.id)
            })
            break
          }

          case 'input': {
            if (msg.sessionId && msg.data !== undefined) {
              const session = sessionManager.get(msg.sessionId)
              session?.pty.write(msg.data)
            }
            break
          }

          case 'resize': {
            if (msg.sessionId && msg.cols && msg.rows) {
              const session = sessionManager.get(msg.sessionId)
              session?.pty.resize(msg.cols, msg.rows)
            }
            break
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' } as ServerMessage))
            break
          }

          case 'close': {
            if (msg.sessionId) {
              sessionManager.kill(msg.sessionId)
            }
            break
          }

          case 'list': {
            const sessions = sessionManager.list()
            const response: ServerMessage = {
              type: 'sessions',
              sessions: sessions.map((s) => ({
                sessionId: s.id,
                shell: s.shell,
                pid: s.pid,
                title: s.title,
                createdAt: s.createdAt,
              })),
            }
            ws.send(JSON.stringify(response))
            break
          }

          case 'attach': {
            if (msg.sessionId) {
              const ok = sessionManager.attach(msg.sessionId, ws)
              if (ok) {
                const session = sessionManager.get(msg.sessionId)!
                const attachedMsg: ServerMessage = {
                  type: 'attached',
                  sessionId: session.id,
                  shell: session.pty.process,
                  pid: session.pty.pid,
                }
                ws.send(JSON.stringify(attachedMsg))
              }
            }
            break
          }

          case 'rename': {
            if (msg.sessionId && msg.title) {
              const ok = sessionManager.rename(msg.sessionId, msg.title)
              if (ok) {
                const response: ServerMessage = {
                  type: 'renamed',
                  sessionId: msg.sessionId,
                  title: msg.title,
                }
                ws.send(JSON.stringify(response))
              }
            }
            break
          }
        }
      } catch (err) {
        console.error('WS handler error:', err)
        console.error('Raw message:', raw.toString())
      }
    })

    ws.on('close', () => {
      console.log('WS disconnected')
      sessionManager.detachByWs(ws)
    })
  })

  return wss
}
