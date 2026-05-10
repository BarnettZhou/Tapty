import { useSessionStore } from '../../stores/sessionStore'

interface TabBarProps {
  onNewTab: () => void
  onCloseTab: (id: string) => void
  onSettings: () => void
}

export function TabBar({ onNewTab, onCloseTab, onSettings }: TabBarProps) {
  const sessions = useSessionStore((s) => s.sessions)
  const activeId = useSessionStore((s) => s.activeId)
  const setActive = useSessionStore((s) => s.setActive)

  return (
    <div
      id="tapty-tabbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#2d2d2d',
        borderBottom: '1px solid #1e1e1e',
        overflowX: 'auto',
      }}
    >
      {sessions.map((session) => (
        <div
          id={`tapty-tab-${session.id}`}
          key={session.id}
          onClick={() => setActive(session.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            cursor: 'pointer',
            background: session.id === activeId ? '#1e1e1e' : '#2d2d2d',
            borderRight: '1px solid #1e1e1e',
            whiteSpace: 'nowrap',
            fontSize: 13,
            color: session.id === activeId ? '#fff' : '#aaa',
          }}
        >
          <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.title || session.shell}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseTab(session.id)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        id="tapty-tab-new"
        onClick={onNewTab}
        style={{
          padding: '8px 14px',
          background: 'none',
          border: 'none',
          color: '#aaa',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        +
      </button>
      <button
        id="tapty-settings-btn"
        onClick={onSettings}
        style={{
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          color: '#aaa',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          marginLeft: 'auto',
        }}
      >
        ⚙
      </button>
    </div>
  )
}
