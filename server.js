import express from 'express'
import http from 'http'
import https from 'https'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'

const config = {
  secure: false,
  port: 3000
}
try {
  Object.assign(config, fs.readJSONSync('config.json'))
} catch (error) {
  console.log('config.json: no such file')
}
console.log(config)

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

function getServer () {
  if (config.secure) {
    const key = fs.readFileSync('./sis-key.pem')
    const cert = fs.readFileSync('./sis-cert.pem')
    const credentials = { key, cert }
    console.log('secure')
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

function start (onStart) {
  const server = getServer()
  const io = new Server(server)
  io.path(staticPath)
  server.listen(config.port, () => {
    console.log(`Listening on :${config.port}`)
    if (onStart) onStart()
  })
  return io
}

export default { start }
