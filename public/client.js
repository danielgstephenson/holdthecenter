import { io } from './socketIo/socket.io.esm.min.js'

const canvas = document.getElementById('canvas')
const context = canvas.getContext('2d')

const socket = io()
const updateInterval = 0.01
const keys = {}
const camera = {
  position: { x: 0, y: 0 },
  zoom: 0
}
const torsoColors = {
  1: 'hsla(225,100%,50%,1',
  2: 'hsla(100,100%,27%,1'
}
const bladeColors = {
  1: 'hsla(190,100%,50%,1',
  2: 'hsla(140,100%,60%,1'
}

let arena = {
  width: 0,
  height: 0
}
let fighters = []

window.onmousedown = event => {
  console.log(fighters)
}
window.onwheel = event => {
  camera.zoom -= 0.001 * event.deltaY
}
window.onkeydown = event => {
  keys[event.key] = true
}
window.onkeyup = event => {
  keys[event.key] = false
}

socket.on('connected', msg => {
  console.log('connected')
  setInterval(update, updateInterval * 1000)
  render()
})
socket.on('serverUpdateClient', msg => {
  arena = msg.arena
  fighters = msg.fighters
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
  const msg = { force }
  socket.emit('clientUpdateServer', msg)
}

function render () {
  console.log('render')
  setupCanvas()
  drawArena()
  drawTorsos()
  drawBlades()
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
  context.moveTo(+0.5 * arena.width, +0.4 * arena.height)
  context.lineTo(-0.5 * arena.width, +0.4 * arena.height)
  context.stroke()
  context.beginPath()
  context.moveTo(+0.5 * arena.width, -0.4 * arena.height)
  context.lineTo(-0.5 * arena.width, -0.4 * arena.height)
  context.stroke()
}

function drawTorsos () {
  fighters.forEach(fighter => {
    context.beginPath()
    context.fillStyle = torsoColors[fighter.team]
    context.arc(fighter.torso.x, fighter.torso.y, 1, 0, 2 * Math.PI)
    context.fill()
  })
}

function drawBlades () {
  fighters.forEach(fighter => {
    context.beginPath()
    context.fillStyle = bladeColors[fighter.team]
    context.arc(fighter.blade.x, fighter.blade.y, 0.5, 0, 2 * Math.PI)
    context.fill()
  })
}
