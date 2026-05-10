import http from 'http'
import fs from 'fs'
import path from 'path'

const PUBLIC_DIR = process.env.NODE_ENV === 'production'
  ? path.resolve(import.meta.dirname, '../dist/public')
  : path.resolve(import.meta.dirname, '../../client/dist')

export function createServer(): http.Server {
  return http.createServer((req, res) => {
    // In dev, let Vite handle HMR; in prod, serve static files
    if (process.env.NODE_ENV === 'production') {
      const filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url!)
      const ext = path.extname(filePath)
      const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
      }[ext] || 'application/octet-stream'

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
        } else {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(data)
        }
      })
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Dev mode: use Vite dev server for frontend')
    }
  })
}
