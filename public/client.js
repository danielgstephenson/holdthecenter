import { io } from './socketIo/socket.io.esm.min.js'

const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

const socket = io()
const updateInterval = 1 / 60
const keys = {}
const mouse = {
  x: 0,
  y: 0,
  0: false,
  1: false,
  2: false
}
const camera = {
  position: { x: 0, y: 0 },
  zoom: 0
}
const torsoColors = {
  1: 'hsla(225,100%,50%,1)',
  2: 'hsla(100,100%,27%,1)'
}
const springColors = {
  1: 'hsla(200,100%,90%,0.5)',
  2: 'hsla(100,100%,90%,0.5)'
}
const bladeColors = {
  1: 'hsla(190,100%,50%,1)',
  2: 'hsla(140,100%,60%,1)'
}
const scoreColors = {
  1: 'hsla(225,100%,50%,0.1)',
  2: 'hsla(120,100%,27%,0.1)'
}
const centralColor = 'hsla(50,100%,50%,0.5)'

let scores = {
  1: 0,
  2: 0
}
let arena = {}
let fighters = []
let alive = false

window.onmousedown = event => {
  if (!alive) socket.emit('spawn')
  mouse[event.button] = true
  console.log(fighters)
}
window.onmouseup = event => {
  if (!alive) socket.emit('spawn')
  mouse[event.button] = false
}
window.onmousemove = event => {
  if (!alive) socket.emit('spawn')
  mouse.x = event.clientX - 0.5 * window.innerWidth
  mouse.y = 0.5 * window.innerHeight - event.clientY
}
window.onwheel = event => {
  if (!alive) socket.emit('spawn')
  camera.zoom -= 0.001 * event.deltaY
}
window.onkeydown = event => {
  if (!alive) socket.emit('spawn')
  keys[event.key] = true
}
window.onkeyup = event => {
  if (!alive) socket.emit('spawn')
  keys[event.key] = false
}

socket.on('connected', msg => {
  console.log('connected')
  setInterval(update, updateInterval * 1000)
  render()
})
socket.on('serverUpdateClient', msg => {
  arena = msg.arena
  scores = msg.scores
  fighters = msg.fighters
  alive = msg.alive
  camera.position = msg.position
})

function update () {
  updateServer()
}

function updateServer () {
  const force = {
    x: 0,
    y: 0
  }
  if (keys.w) force.y += 1
  if (keys.s) force.y -= 1
  if (keys.a) force.x -= 1
  if (keys.d) force.x += 1
  if (keys.ArrowUp) force.y += 1
  if (keys.ArrowDown) force.y -= 1
  if (keys.ArrowLeft) force.x -= 1
  if (keys.ArrowRight) force.x += 1
  if (mouse[0]) {
    force.x = mouse.x
    force.y = mouse.y
  }
  const msg = { force }
  socket.emit('clientUpdateServer', msg)
}

function render () {
  console.log(scores)
  setupCanvas()
  drawArena()
  drawScores()
  if (!arena.gameOver) {
    drawSprings()
    drawCentral()
    drawTorsos()
    drawBlades()
  }
  window.requestAnimationFrame(render)
}

function setupCanvas () {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  context.resetTransform()
  context.translate(0.5 * canvas.width, 0.5 * canvas.height)
  const vmin = Math.min(canvas.width, canvas.height)
  const scale = Math.exp(camera.zoom)
  context.scale(0.02 * vmin * scale, -0.02 * vmin * scale)
  context.translate(-camera.position.x, -camera.position.y)
}

function drawArena () {
  context.beginPath()
  context.strokeStyle = 'hsla(0,0%,40%,1)'
  context.lineWidth = 0.2
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.rect(-0.5 * arena.width, -0.5 * arena.height, arena.width, arena.height)
  context.stroke()
  context.strokeStyle = 'hsla(0,0%,40%,0.5)'
  context.lineWidth = 0.1
  context.beginPath()
  context.arc(0, 0, 0.5 * arena.width, 0, 2 * Math.PI)
  context.stroke()
  context.beginPath()
  context.arc(0, 0, 0.2 * arena.width, 0, 2 * Math.PI)
  context.stroke()
  context.beginPath()
  context.moveTo(0, +0.5 * arena.height)
  context.lineTo(0, -0.5 * arena.height)
  context.stroke()
  context.stroke()
  context.beginPath()
  context.moveTo(+0.5 * arena.width, 0)
  context.lineTo(-0.5 * arena.width, 0)
  context.stroke()
  context.beginPath()
  context.moveTo(+0.5 * arena.width, +arena.safeLine)
  context.lineTo(-0.5 * arena.width, +arena.safeLine)
  context.stroke()
  context.beginPath()
  context.moveTo(+0.5 * arena.width, -arena.safeLine)
  context.lineTo(-0.5 * arena.width, -arena.safeLine)
  context.stroke()
  context.fillStyle = 'hsla(0,0%,30%,1)'
  context.beginPath()
  context.rect(-0.5 * arena.blockWidth, +arena.safeLine - 0.5 * arena.blockHeight, arena.blockWidth, arena.blockHeight)
  context.fill()
  context.beginPath()
  context.rect(-0.5 * arena.blockWidth, -arena.safeLine - 0.5 * arena.blockHeight, arena.blockWidth, arena.blockHeight)
  context.fill()
}

function drawScores () {
  context.beginPath()
  context.fillStyle = scoreColors[1]
  context.arc(0, 0, 0.5 * arena.width, 0, +scores[1] * Math.PI / arena.winScore)
  context.lineTo(0, 0)
  context.fill()
  context.beginPath()
  context.fillStyle = scoreColors[2]
  context.arc(0, 0, 0.5 * arena.width, -scores[2] * Math.PI / arena.winScore, 0)
  context.lineTo(0, 0)
  context.fill()
  if (arena.gameOver) {
    context.strokeStyle = scores[1] > scores[2] ? bladeColors[1] : bladeColors[2]
    context.lineWidth = 0.3
    context.beginPath()
    context.arc(0, 0, 0.5 * arena.width * (1 - arena.countDown / arena.breakTime), 0, 2 * Math.PI)
    context.stroke()
  }
}

function drawCentral () {
  context.lineWidth = 0.2
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.strokeStyle = centralColor
  fighters.forEach(fighter => {
    if (fighter.central) {
      console.log('central')
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(fighter.torso.x, fighter.torso.y)
      context.stroke()
    }
  })
}

function drawSprings () {
  context.lineWidth = 0.2
  context.lineJoin = 'round'
  context.lineCap = 'round'
  fighters.forEach(fighter => {
    if (fighter.alive) {
      context.strokeStyle = springColors[fighter.team]
      context.beginPath()
      context.moveTo(fighter.torso.x, fighter.torso.y)
      context.lineTo(fighter.blade.x, fighter.blade.y)
      context.stroke()
    }
  })
}

function drawTorsos () {
  fighters.forEach(fighter => {
    if (fighter.alive) {
      context.beginPath()
      context.fillStyle = torsoColors[fighter.team]
      context.arc(fighter.torso.x, fighter.torso.y, arena.torsoRadius, 0, 2 * Math.PI)
      context.fill()
    }
  })
}

function drawBlades () {
  fighters.forEach(fighter => {
    if (fighter.alive) {
      context.beginPath()
      context.fillStyle = bladeColors[fighter.team]
      context.arc(fighter.blade.x, fighter.blade.y, arena.bladeRadius, 0, 2 * Math.PI)
      context.fill()
    }
  })
}
