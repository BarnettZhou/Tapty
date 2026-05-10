import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const fontSize = useSessionStore((s) => s.fontSize)
  const setFontSize = useSessionStore((s) => s.setFontSize)
  const [draft, setDraft] = useState(fontSize)

  useEffect(() => {
    if (open) setDraft(fontSize)
  }, [open, fontSize])

  if (!open) return null

  const handleConfirm = () => {
    setFontSize(draft)
    onClose()
  }

  return (
    <div
      id="tapty-settings-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#2d2d2d',
          border: '1px solid #555',
          borderRadius: 8,
          padding: 20,
          width: 280,
          color: '#ddd',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>设置</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 18,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: '#aaa' }}>
            终端字体大小
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setDraft((v) => Math.max(8, v - 1))}
              style={{
                width: 32,
                height: 32,
                background: '#3c3c3c',
                border: '1px solid #555',
                borderRadius: 4,
                color: '#ddd',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              −
            </button>
            <span style={{ fontSize: 16, minWidth: 28, textAlign: 'center' }}>{draft}</span>
            <button
              onClick={() => setDraft((v) => Math.min(32, v + 1))}
              style={{
                width: 32,
                height: 32,
                background: '#3c3c3c',
                border: '1px solid #555',
                borderRadius: 4,
                color: '#ddd',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          style={{
            width: '100%',
            padding: '10px 0',
            background: '#0e639c',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          确认
        </button>
      </div>
    </div>
  )
}
