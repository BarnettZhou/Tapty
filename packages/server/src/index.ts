import { createServer } from './server.js'
import { createWebSocketRouter } from './websocket-router.js'

const PORT = Number(process.env.PORT) || 3456

const httpServer = createServer()
const wss = createWebSocketRouter(httpServer)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Tapty server listening on http://0.0.0.0:${PORT}`)
})
