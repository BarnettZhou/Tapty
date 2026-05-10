import * as pty from 'node-pty'
import { execSync } from 'child_process'
import fs from 'node:fs'
import path from 'path'

export function getDefaultShell(): string {
  if (process.platform === 'win32') {
    try {
      const pwshPath = execSync('where pwsh', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 3000,
      }).trim().split('\r\n')[0]

      if (pwshPath && fs.existsSync(pwshPath)) {
        return pwshPath
      }
    } catch {
      // where pwsh not available
    }

    const candidates = [
      path.join(process.env['ProgramW6432'] || '', 'PowerShell', '7', 'pwsh.exe'),
      path.join(process.env.ProgramFiles || '', 'PowerShell', '7', 'pwsh.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'PowerShell', '7', 'pwsh.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'pwsh.exe'),
    ]

    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        return c
      }
    }

    return 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

export function spawnShell(
  shell: string = getDefaultShell(),
  cols: number = 80,
  rows: number = 24,
  cwd: string = process.cwd(),
): pty.IPty {
  const args = process.platform === 'win32'
    ? ['-NoExit', '-Command', '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8']
    : []

  return pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env as { [key: string]: string },
  })
}
