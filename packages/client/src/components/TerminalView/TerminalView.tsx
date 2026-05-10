import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSessionStore } from '../../stores/sessionStore'

interface TerminalViewProps {
  sessionId: string
  active: boolean
  onInput: (sessionId: string, data: string) => void
  onResize: (sessionId: string, cols: number, rows: number) => void
}

export function TerminalView({ sessionId, active, onInput, onResize }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const bindTerminal = useSessionStore((s) => s.bindTerminal)

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    let disposed = false

    const init = async () => {
      // 等待 Nerd Font 加载完成，避免字符宽度计算错误
      await document.fonts.ready
      if (disposed) return

      const fontSize = useSessionStore.getState().fontSize
      const term = new Terminal({
        cursorBlink: true,
        fontSize,
        fontFamily: '"JetBrainsMono Nerd Font", "Consolas", "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
        scrollback: 1000,
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(containerRef.current!)
      fit.fit()

      termRef.current = term
      fitRef.current = fit
      bindTerminal(sessionId, term)

      term.onData((data) => onInput(sessionId, data))

      const ro = new ResizeObserver(() => {
        fit.fit()
        const dims = fit.proposeDimensions()
        if (dims) onResize(sessionId, dims.cols, dims.rows)
      })
      ro.observe(containerRef.current!)

      return () => {
        ro.disconnect()
      }
    }

    const cleanupPromise = init()

    return () => {
      disposed = true
      cleanupPromise.then((cleanup) => cleanup?.())
      if (termRef.current) {
        termRef.current.dispose()
        termRef.current = null
        fitRef.current = null
      }
    }
  }, [sessionId])

  const fontSize = useSessionStore((s) => s.fontSize)

  useEffect(() => {
    if (active && termRef.current) {
      termRef.current.focus()
      fitRef.current?.fit()
      const dims = fitRef.current?.proposeDimensions()
      if (dims) onResize(sessionId, dims.cols, dims.rows)
    }
  }, [active])

  useEffect(() => {
    if (termRef.current && fitRef.current) {
      termRef.current.options.fontSize = fontSize
      fitRef.current.fit()
      const dims = fitRef.current.proposeDimensions()
      if (dims) onResize(sessionId, dims.cols, dims.rows)
    }
  }, [fontSize])

  return (
    <div
      id={`tapty-terminal-${sessionId}`}
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        paddingLeft: 8,
      }}
    />
  )
}
