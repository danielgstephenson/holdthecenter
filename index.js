import server from './server.js'
import { Circle, Edge, Vec2, World } from 'planck'

const dt = 1 / 60
const fighters = {}
const arena = {
  width: 50,
  height: 100
}

const io = server.start(() => {
  console.log('Server started')
  setInterval(update, dt * 1000)
})

io.on('connection', socket => {
  console.log('connection:', socket.id)
  fighters[socket.id] = createFighter()
  socket.emit('connected')
  socket.on('clientUpdateServer', msg => {
    const reply = { arena, fighters: getSeralizedFighters(), position: vec2object(Vec2.zero()) }
    if (fighters[socket.id]) {
      const fighter = fighters[socket.id]
      fighter.force = Vec2(msg.force)
      fighter.force.normalize()
      reply.position = vec2object(fighter.torso.getPosition())
    }
    socket.emit('serverUpdateClient', reply)
  })
  socket.on('disconnect', msg => {
    console.log('disconnect:', socket.id)
    if (fighters[socket.id]) {
      const fighter = fighters[socket.id]
      world.destroyBody(fighter.torso)
      delete fighters[socket.id]
    }
  })
})

function getSeralizedFighters () {
  return Object.values(fighters).map(fighter => ({
    torso: vec2object(fighter.torso.getPosition()),
    blade: vec2object(fighter.blade.getPosition()),
    team: fighter.team
  }))
}

const world = new World({
  gravity: new Vec2(0, 0)
})
const bounds = world.createBody({
  type: 'static',
  position: new Vec2(0.0, 0.0),
  angle: 0
})
bounds.createFixture({
  shape: new Edge(
    new Vec2(-0.5 * arena.width, -0.5 * arena.height),
    new Vec2(+0.5 * arena.width, -0.5 * arena.height)
  )
})
bounds.createFixture({
  shape: new Edge(
    new Vec2(-0.5 * arena.width, +0.5 * arena.height),
    new Vec2(+0.5 * arena.width, +0.5 * arena.height)
  )
})
bounds.createFixture({
  shape: new Edge(
    new Vec2(-0.5 * arena.width, +0.5 * arena.height),
    new Vec2(-0.5 * arena.width, -0.5 * arena.height)
  )
})
bounds.createFixture({
  shape: new Edge(
    new Vec2(+0.5 * arena.width, +0.5 * arena.height),
    new Vec2(+0.5 * arena.width, -0.5 * arena.height)
  )
})

function createFighter () {
  const torso = world.createBody({
    type: 'dynamic',
    position: new Vec2(0, 0.45 * arena.height),
    linearDamping: 1
  })
  torso.createFixture({
    shape: new Circle(Vec2(0, 0), 1),
    density: 1,
    fixedRotation: true,
    friction: 0,
    restitution: 0
  })
  const blade = world.createBody({
    type: 'dynamic',
    position: new Vec2(0, 0.45 * arena.height),
    linearDamping: 1
  })
  blade.createFixture({
    shape: new Circle(Vec2(0, 0), 0.5),
    density: 1,
    fixedRotation: true,
    friction: 0,
    restitution: 0
  })
  const fighterArray = Object.values(fighters)
  const teamCount1 = fighterArray.filter(fighter => fighter.team === 1).length
  const teamCount2 = fighterArray.filter(fighter => fighter.team === 2).length
  return {
    torso,
    blade,
    force: Vec2(0, 0),
    team: teamCount1 > teamCount2 ? 2 : 1
  }
}

function update () {
  Object.values(fighters).forEach(fighter => {
    try {
      const force = Vec2.mul(fighter.force, 50)
      const position = fighter.torso.getPosition()
      fighter.torso.applyForce(force, position)
    } catch {
      console.log(fighter)
    }
  })
  world.step(dt)
}

function vec2object (vec2) {
  return {
    x: vec2.x,
    y: vec2.y
  }
}
