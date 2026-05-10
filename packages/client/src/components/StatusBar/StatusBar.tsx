interface StatusBarProps {
  connected: boolean
  id?: string
}

export function StatusBar({ connected, id }: StatusBarProps) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        background: '#2d2d2d',
        borderTop: '1px solid #1e1e1e',
        fontSize: 11,
        color: '#888',
      }}
    >
      <span>Tapty</span>
      <span style={{ color: connected ? '#4ec9b0' : '#f44747' }}>
        {connected ? '● connected' : '● disconnected'}
      </span>
    </div>
  )
}
