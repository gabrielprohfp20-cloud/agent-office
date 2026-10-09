// Testes da navegação: os caminhos chegam ao destino e não atravessam móveis.
import { describe, expect, it } from 'vitest'
import { DESKS } from '../src/data/office'
import { buildGrid, findPath } from '../src/sim/navigation'
import { COFFEE_SPOTS, deskSeat, MEETING_SEATS, SOFA_SEATS } from '../src/sim/places'

buildGrid(DESKS)

const MEETING_TABLE = [6.4, -5.2, 9.6, -3.8]
const inside = ([x, z], [x1, z1, x2, z2]) => x > x1 && x < x2 && z > z1 && z < z2

// Percorre o caminho em passos de 5 cm e devolve todos os pontos
function samples(from, path) {
  const out = []
  let prev = from
  for (const p of path) {
    const d = Math.hypot(p[0] - prev[0], p[1] - prev[1])
    const n = Math.max(1, Math.ceil(d / 0.05))
    for (let i = 0; i <= n; i++) out.push([prev[0] + ((p[0] - prev[0]) * i) / n, prev[1] + ((p[1] - prev[1]) * i) / n])
    prev = p
  }
  return out
}

describe('findPath', () => {
  const start = deskSeat(0).approach

  it('chega exatamente ao destino', () => {
    const target = [COFFEE_SPOTS[0].x, COFFEE_SPOTS[0].z]
    const path = findPath(start, target)
    expect(path.at(-1)).toEqual(target)
  })

  it('fica sempre dentro do escritório', () => {
    for (const spot of [...COFFEE_SPOTS, ...SOFA_SEATS]) {
      const pts = samples(start, findPath(start, [spot.x, spot.z]))
      for (const [x, z] of pts) {
        expect(Math.abs(x)).toBeLessThanOrEqual(12)
        expect(Math.abs(z)).toBeLessThanOrEqual(8)
      }
    }
  })

  it('contorna a mesa de reuniões em vez de a atravessar', () => {
    // de um lado ao outro da mesa: a linha reta passaria por cima dela
    const from = [8, -6.3]
    const to = [8, -2.6]
    const pts = samples(from, findPath(from, to))
    expect(pts.some((p) => inside(p, MEETING_TABLE))).toBe(false)
  })

  it('encontra caminho para todos os lugares da sala de reuniões', () => {
    for (const seat of MEETING_SEATS) {
      const path = findPath(start, seat.approach)
      expect(path.at(-1)).toEqual(seat.approach)
    }
  })
})
