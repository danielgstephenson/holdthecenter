import server from './server.js'
import { Box, Circle, Edge, Vec2, World } from 'planck'

const dt = 1 / 60
const fighters = {}
const scores = {
  1: 0,
  2: 0
}
const arena = {
  width: 50,
  height: 100,
  safeLine: 35,
  blockWidth: 20,
  blockHeight: 3,
  torsoRadius: 1,
  bladeRadius: 0.7,
  winScore: 120,
  breakTime: 15,
  countDown: 0
}

const io = server.start(() => {
  setInterval(update, dt * 1000)
})

io.on('connection', socket => {
  console.log('connection:', socket.id)
  createFighter(socket.id)
  socket.emit('connected')
  socket.on('clientUpdateServer', msg => {
    const reply = {
      arena,
      scores,
      fighters: getSeralizedFighters(),
      position: vec2object(Vec2.zero()),
      alive: false
    }
    if (fighters[socket.id]) {
      const fighter = fighters[socket.id]
      fighter.force = Vec2(msg.force)
      fighter.force.normalize()
      reply.position = vec2object(fighter.torso.getPosition())
      reply.alive = fighter.alive
    }
    if (arena.gameOver) reply.position = Vec2(0, 0)
    socket.emit('serverUpdateClient', reply)
  })
  socket.on('spawn', () => {
    if (fighters[socket.id]) {
      const fighter = fighters[socket.id]
      if (!fighter.alive) {
        fighter.spawn()
      }
    }
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
    alive: fighter.alive,
    central: fighter.central,
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
bounds.createFixture({
  shape: new Box(0.5 * arena.blockWidth, 0.5 * arena.blockHeight, Vec2(0, +arena.safeLine))
})
bounds.createFixture({
  shape: new Box(0.5 * arena.blockWidth, 0.5 * arena.blockHeight, Vec2(0, -arena.safeLine))
})

function createFighter (id) {
  const livingFighters = Object.values(fighters).filter(fighter => fighter.alive)
  const teamCount1 = livingFighters.filter(fighter => fighter.team === 1).length
  const teamCount2 = livingFighters.filter(fighter => fighter.team === 2).length
  const team = teamCount1 > teamCount2 ? 2 : 1
  const sign = team === 1 ? 1 : -1
  const y = sign * (0.5 * arena.safeLine + 0.25 * arena.height)
  const torso = world.createBody({
    type: 'dynamic',
    position: new Vec2(0, y),
    linearDamping: 0.5
  })
  const torsoFixture = torso.createFixture({
    shape: new Circle(Vec2(0, 0), arena.torsoRadius),
    density: 1,
    fixedRotation: true,
    friction: 0,
    restitution: 0
  })
  const blade = world.createBody({
    type: 'dynamic',
    position: new Vec2(0, y),
    linearDamping: 0.5
  })
  const bladeFixture = blade.createFixture({
    shape: new Circle(Vec2(0, 0), arena.bladeRadius),
    density: 1,
    fixedRotation: true,
    friction: 0,
    restitution: 0
  })
  const fighter = {
    torso,
    blade,
    force: Vec2(0, 0),
    alive: true,
    central: false,
    team: teamCount1 > teamCount2 ? 2 : 1
  }
  fighter.die = function () {
    fighter.alive = false
    fighter.central = false
    fighter.torso.setType('static')
    fighter.blade.setType('static')
  }
  fighter.spawn = function () {
    fighter.alive = true
    fighter.torso.setType('dynamic')
    fighter.torso.setPosition(Vec2(0, y))
    fighter.torso.setLinearVelocity(Vec2(0, 0))
    fighter.blade.setType('dynamic')
    fighter.blade.setPosition(Vec2(0, y))
    fighter.blade.setLinearVelocity(Vec2(0, 0))
  }
  fighter.inDanger = function () {
    const y = fighter.torso.getPosition().y
    return y * sign < arena.safeLine
  }
  torsoFixture.setUserData({ fighter, role: 'torso' })
  bladeFixture.setUserData({ fighter, role: 'blade' })
  fighters[id] = fighter
}

function update () {
  const livingFighters = Object.values(fighters).filter(fighter => fighter.alive)
  livingFighters.forEach(fighter => {
    const force = Vec2.mul(fighter.force, 20)
    const position = fighter.torso.getPosition()
    fighter.torso.applyForce(force, position)
  })
  livingFighters.forEach(fighter => {
    const vector = Vec2.sub(fighter.torso.getPosition(), fighter.blade.getPosition())
    const force = Vec2.mul(vector, 2)
    const position = fighter.blade.getPosition()
    fighter.blade.applyForce(force, position)
  })
  Object.values(fighters).forEach(fighter => { fighter.central = false })
  const winning = {
    1: false,
    2: false
  }
  const distances = livingFighters.map(fighter => {
    return Vec2.lengthOf(fighter.torso.getPosition())
  })
  const minDistance = Math.min(0.5 * arena.width, ...distances)
  livingFighters.forEach(fighter => {
    const distance = Vec2.lengthOf(fighter.torso.getPosition())
    if (distance === minDistance) {
      fighter.central = true
      winning[fighter.team] = true
    }
  })
  if (Math.max(scores[1], scores[2]) > arena.winScore) {
    arena.gameOver = true
    arena.countDown -= dt
    if (arena.countDown <= 0) {
      scores[1] = 0
      scores[2] = 0
      world.step(dt)
      livingFighters.forEach(fighter => { fighter.spawn() })
    }
  } else {
    arena.gameOver = false
    arena.countDown = arena.breakTime
    if (winning[1]) scores[1] += 4 * dt
    if (winning[2]) scores[2] += 4 * dt
    world.step(dt)
  }
}

world.on('pre-solve', (contact, oldManifold) => {
  const userDataA = contact.getFixtureA().getUserData()
  const userDataB = contact.getFixtureB().getUserData()
  if (userDataA && userDataB) {
    const sameTeam = userDataA.fighter.team === userDataB.fighter.team
    const oneDead = !userDataA.fighter.alive || !userDataB.fighter.alive
    if (sameTeam || oneDead) {
      contact.setEnabled(false)
    } else {
      if (userDataA.role === 'blade' && userDataB.role === 'torso') {
        if (userDataB.fighter.inDanger()) userDataB.fighter.die()
        contact.setEnabled(false)
      }
      if (userDataA.role === 'torso' && userDataB.role === 'blade') {
        if (userDataA.fighter.inDanger()) userDataA.fighter.die()
        contact.setEnabled(false)
      }
    }
  }
})

function vec2object (vec2) {
  return {
    x: vec2.x,
    y: vec2.y
  }
}
