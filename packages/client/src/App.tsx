import { useWebSocket } from './hooks/useWebSocket'
import { useSessionStore } from './stores/sessionStore'
import { TabBar } from './components/TabBar/TabBar'
import { TerminalView } from './components/TerminalView/TerminalView'
import { VirtualKeyboard } from './components/VirtualKeyboard/VirtualKeyboard'
import { StatusBar } from './components/StatusBar/StatusBar'
import { SettingsModal } from './components/SettingsModal/SettingsModal'
import { useState } from 'react'

function App() {
  const { sendInput, sendResize, createSession, closeSession, wsRef } = useWebSocket()
  const sessions = useSessionStore((s) => s.sessions)
  const activeId = useSessionStore((s) => s.activeId)
  const connected = wsRef.current?.readyState === WebSocket.OPEN
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div
      id="tapty-root"
      style={{
        width: '100%',
        height: '100%',
        background: '#1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <TabBar onNewTab={createSession} onCloseTab={closeSession} onSettings={() => setSettingsOpen(true)} />
      <div id="tapty-terminal-area" style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {sessions.map((session) => (
          <div
            id={`tapty-session-${session.id}`}
            key={session.id}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: session.id === activeId ? 'visible' : 'hidden',
              pointerEvents: session.id === activeId ? 'auto' : 'none',
              overflow: 'hidden',
            }}
          >
            <TerminalView
              sessionId={session.id}
              active={session.id === activeId}
              onInput={sendInput}
              onResize={sendResize}
            />
          </div>
        ))}
        <VirtualKeyboard onSend={sendInput} />
      </div>
      <StatusBar id="tapty-statusbar" connected={connected} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App
