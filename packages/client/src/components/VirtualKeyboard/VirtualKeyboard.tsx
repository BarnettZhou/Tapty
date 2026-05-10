import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { KEY_SEQUENCES } from '../../utils/keymap'

interface VirtualKeyboardProps {
  onSend: (sessionId: string, data: string) => void
}

const ARROW_BTN_STYLE: React.CSSProperties = {
  width: 56,
  height: 40,
  background: '#3c3c3c',
  border: '1px solid #555',
  borderRadius: 6,
  color: '#ddd',
  fontSize: 16,
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const ACTION_BTN_STYLE: React.CSSProperties = {
  minWidth: 72,
  padding: '10px 8px',
  background: '#3c3c3c',
  border: '1px solid #555',
  borderRadius: 6,
  color: '#ddd',
  fontSize: 13,
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'manipulation',
  whiteSpace: 'nowrap',
}

export function VirtualKeyboard({ onSend }: VirtualKeyboardProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const activeId = useSessionStore((s) => s.activeId)
  const sessions = useSessionStore((s) => s.sessions)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sendSequence = (seq: string) => {
    const session = sessions.find((s) => s.id === activeId)
    if (!session) return
    onSend(session.id, seq)
    session.terminal?.focus()
  }

  const arrowBtn = (label: string, seq: string) => (
    <button
      key={label}
      style={ARROW_BTN_STYLE}
      onTouchStart={(e) => {
        e.preventDefault()
        sendSequence(seq)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        sendSequence(seq)
      }}
    >
      {label}
    </button>
  )

  const actionBtn = (label: string, seq: string) => (
    <button
      key={label}
      style={ACTION_BTN_STYLE}
      onTouchStart={(e) => {
        e.preventDefault()
        sendSequence(seq)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        sendSequence(seq)
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        id="tapty-kb-trigger"
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: isMobile ? 8 : 16,
          right: isMobile ? 8 : 16,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#3c3c3c',
          border: '1px solid #555',
          color: '#ddd',
          fontSize: 20,
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⌨
      </button>

      {/* Popup */}
      {open && (
        <div
          id="tapty-kb-popup"
          style={{
            position: 'absolute',
            bottom: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            background: '#2d2d2d',
            border: '1px solid #555',
            borderRadius: 8,
            padding: isMobile ? '24px 8px 8px' : '28px 12px 12px',
            zIndex: 20,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 8 : 12,
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            maxWidth: isMobile ? 'calc(100vw - 16px)' : undefined,
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 24,
              height: 24,
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          {/* 左侧：方向键（电脑键盘样式） */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {arrowBtn('▲', KEY_SEQUENCES.ARROW_UP)}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {arrowBtn('◀', KEY_SEQUENCES.ARROW_LEFT)}
              {arrowBtn('▼', KEY_SEQUENCES.ARROW_DOWN)}
              {arrowBtn('▶', KEY_SEQUENCES.ARROW_RIGHT)}
            </div>
          </div>

          {/* 右侧：功能按键 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              justifyContent: 'center',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {actionBtn('Tab', KEY_SEQUENCES.TAB)}
              {actionBtn('Esc', KEY_SEQUENCES.ESC)}
              {actionBtn('Ctrl+C', KEY_SEQUENCES.CTRL_C)}
              {actionBtn('Ctrl+D', KEY_SEQUENCES.CTRL_D)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {actionBtn('Ctrl+L', KEY_SEQUENCES.CTRL_L)}
              {actionBtn('Ctrl+U', KEY_SEQUENCES.CTRL_U)}
              {actionBtn('Ctrl+A', KEY_SEQUENCES.CTRL_A)}
              {actionBtn('Ctrl+E', KEY_SEQUENCES.CTRL_E)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
