// Movimento dos agentes: posição, caminhar, sentar e levantar.
// Os dados de movimento ficam aqui (fora do React) porque mudam 60 vezes por segundo.
import { DESKS } from '../data/office'
import { buildGrid, findPath } from './navigation'
import { deskSeat } from './places'

buildGrid(DESKS)

// id -> { x, z, rot, targetRot, path, speed, sit, sitTarget, seat, walkPhase, carry }
export const runtime = {}

export function placeAtDesk(agent) {
  const seat = deskSeat(agent.desk)
  runtime[agent.id] = {
    x: seat.x, z: seat.z, rot: seat.rot, targetRot: seat.rot,
    path: [], speed: 1.6, onArrive: null,
    sit: 1, sitTarget: 1, seat,
    walkPhase: 0, carry: null,
  }
}

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

// Avança a simulação de movimento um bocadinho (dt = segundos desde o último frame)
export function stepMovement(dt) {
  for (const rt of Object.values(runtime)) {
    // sentar/levantar suavemente
    const ds = rt.sitTarget - rt.sit
    rt.sit += Math.sign(ds) * Math.min(Math.abs(ds), dt * 2.8)

    if (rt.path.length) {
      const [tx, tz] = rt.path[0]
      const dx = tx - rt.x, dz = tz - rt.z
      const dist = Math.hypot(dx, dz)
      const step = rt.speed * dt
      if (dist > 0.001) rt.targetRot = Math.atan2(-dx, -dz)
      // só anda depois de estar mais ou menos virado para o destino
      const facing = Math.abs(angleDiff(rt.rot, rt.targetRot)) < 0.9
      if (dist <= step) {
        rt.x = tx
        rt.z = tz
        rt.path.shift()
        if (!rt.path.length && rt.onArrive) {
          const done = rt.onArrive
          rt.onArrive = null
          done()
        }
      } else if (facing) {
        rt.x += (dx / dist) * step
        rt.z += (dz / dist) * step
      }
      rt.walkPhase += dt * rt.speed * 5.5
    }
    rt.rot += angleDiff(rt.rot, rt.targetRot) * Math.min(1, dt * 9)
  }
}

export const isWalking = (rt) => rt.path.length > 0 && rt.sit < 0.05

// ---------- Ações (usadas pelo "diretor") ----------
import { wait } from './clock'
export { wait }

function moveAlong(id, points, speed = 1.6) {
  const rt = runtime[id]
  return new Promise((resolve) => {
    if (!points.length) return resolve()
    rt.path = points.map((p) => [...p])
    rt.speed = speed
    rt.onArrive = resolve
  })
}

export async function walkTo(id, spot) {
  const rt = runtime[id]
  await moveAlong(id, findPath([rt.x, rt.z], [spot.x, spot.z]))
  if (spot.rot !== undefined) rt.targetRot = spot.rot
  await wait(250)
}

export async function sitAt(id, seat) {
  const rt = runtime[id]
  await walkTo(id, { x: seat.approach[0], z: seat.approach[1] })
  await moveAlong(id, [[seat.x, seat.z]], 0.7)
  rt.targetRot = seat.rot
  rt.seat = seat
  rt.sitTarget = 1
  await wait(450)
}

export async function standUp(id) {
  const rt = runtime[id]
  if (!rt.seat) return
  rt.sitTarget = 0
  await wait(400)
  await moveAlong(id, [rt.seat.approach], 0.7)
  rt.seat = null
}

export function setCarry(id, item) {
  runtime[id].carry = item
}
