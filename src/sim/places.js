// Lugares do escritório para onde os agentes podem ir.
import { DESKS, seatFor } from '../data/office'

// Ângulo para um agente em "from" ficar virado para "to"
export function faceTowards(from, to) {
  return Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]))
}

// Um lugar sentado: a posição do assento e o "ponto de aproximação" atrás da cadeira
export function makeSeat(x, z, rot, back = 0.55) {
  const fx = -Math.sin(rot), fz = -Math.cos(rot) // para onde o agente olha
  return { x, z, rot, approach: [x - fx * back, z - fz * back] }
}

export function deskSeat(deskId) {
  const s = seatFor(DESKS.find((d) => d.id === deskId))
  return makeSeat(s.position[0], s.position[2], s.rotation)
}

// Sítio ao lado da mesa de um colega, para lhe entregar trabalho
export function deskVisitSpot(deskId) {
  const s = deskSeat(deskId)
  const spot = [s.x + 1.1, s.z - 0.15]
  return { x: spot[0], z: spot[1], rot: faceTowards(spot, [s.x, s.z]) }
}

export const MEETING_SEATS = [-1, 0, 1].flatMap((dx) => [
  { key: `meet-a${dx}`, ...makeSeat(8 + dx, -5.55, Math.PI) },
  { key: `meet-b${dx}`, ...makeSeat(8 + dx, -3.45, 0) },
])

export const SOFA_SEATS = [
  { key: 'sofa-1', ...makeSeat(7.45, 6.9, 0) },
  { key: 'sofa-2', ...makeSeat(8.55, 6.9, 0) },
]

export const COFFEE_SPOTS = [
  { key: 'coffee-1', x: 9.75, z: 2.35, rot: -Math.PI / 2 - 0.5 },
  { key: 'coffee-2', x: 10.75, z: 2.35, rot: Math.PI / 2 + 0.5 },
]

export const KANBAN_SPOTS = [
  { key: 'kanban-1', x: -6.4, z: 6.4, rot: 0.15 },
  { key: 'kanban-2', x: -5.5, z: 6.5, rot: -0.2 },
]

// Reservas: evita que dois agentes vão para o mesmo lugar
const taken = new Set()
export function takeSpot(list) {
  const free = list.filter((s) => !taken.has(s.key))
  if (!free.length) return null
  const spot = free[Math.floor(Math.random() * free.length)]
  taken.add(spot.key)
  return spot
}
export function releaseSpot(spot) {
  if (spot) taken.delete(spot.key)
}
export function freeCount(list) {
  return list.filter((s) => !taken.has(s.key)).length
}
