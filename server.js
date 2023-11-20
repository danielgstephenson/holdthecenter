import express from 'express'
import http from 'http'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const staticPath = path.join(__dirname, 'public')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)
const clientHtmlPath = path.join(__dirname, 'public', 'client.html')
app.get('/', function (req, res) { res.sendFile(clientHtmlPath) })
const socketIoPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')
app.get('/socketIo/:fileName', function (req, res) {
  const filePath = path.join(socketIoPath, req.params.fileName)
  res.sendFile(filePath)
})

function start (onStart) {
  const server = new http.Server(app)
  const io = new Server(server)
  io.path(staticPath)
  const port = 3000
  server.listen(port, () => {
    console.log(`Listening on :${port}`)
    if (onStart) onStart()
  })
  return io
}

export default { start }
