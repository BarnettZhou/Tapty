import { useRef, useEffect } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current || termRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      scrollback: 1000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    return () => {
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [containerRef])

  return { termRef, fitRef }
}
