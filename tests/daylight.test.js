// Testes do ciclo dia/noite
import { describe, expect, it } from 'vitest'
import { daylightAt } from '../src/sim/daylight'

describe('daylightAt', () => {
  it('é noite de madrugada e à noite', () => {
    expect(daylightAt(2)).toBe(0)
    expect(daylightAt(23)).toBe(0)
  })
  it('é dia a meio do dia', () => {
    expect(daylightAt(12)).toBe(1)
  })
  it('muda aos poucos ao amanhecer e ao anoitecer', () => {
    const dawn = daylightAt(7)
    const dusk = daylightAt(19)
    expect(dawn).toBeGreaterThan(0)
    expect(dawn).toBeLessThan(1)
    expect(dusk).toBeGreaterThan(0)
    expect(dusk).toBeLessThan(1)
  })
  it('nunca salta: valores vizinhos são próximos', () => {
    for (let h = 0; h < 24; h += 0.05) {
      expect(Math.abs(daylightAt(h + 0.05) - daylightAt(h))).toBeLessThan(0.06)
    }
  })
})
