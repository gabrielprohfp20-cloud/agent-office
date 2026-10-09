// Testes da Fase 4: contratar agentes
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function fresh() {
  vi.resetModules()
  localStorage.clear()
  const { useOffice } = await import('../src/sim/store')
  const team = await import('../src/sim/team')
  const { findPath } = await import('../src/sim/navigation')
  const { deskSeat } = await import('../src/sim/places')
  const { DOOR, EXTRA_DESKS } = await import('../src/data/office')
  const { runtime } = await import('../src/sim/movement')
  return { useOffice, ...team, findPath, deskSeat, DOOR, EXTRA_DESKS, runtime }
}

describe('contratar agentes', () => {
  beforeEach(() => localStorage.clear())

  it('um contratado recebe uma mesa extra e entra pela porta', async () => {
    const t = await fresh()
    const before = t.useOffice.getState().agents.length
    const agent = t.hireAgent('DEV')
    expect(agent).not.toBeNull()
    expect(t.useOffice.getState().agents).toHaveLength(before + 1)
    expect(agent.role).toBe('DEV')
    expect(t.EXTRA_DESKS.map((d) => d.id)).toContain(agent.desk)
    // começa junto à porta, de pé
    expect(t.runtime[agent.id].x).toBeCloseTo(t.DOOR.x)
    expect(t.runtime[agent.id].sit).toBe(0)
    // há caminho da porta até à mesa
    const seat = t.deskSeat(agent.desk)
    expect(t.findPath([t.DOOR.x, t.DOOR.z], seat.approach).at(-1)).toEqual(seat.approach)
  })

  it('não contrata mais do que as mesas livres', async () => {
    const t = await fresh()
    const hired = []
    for (let i = 0; i < 10; i++) hired.push(t.hireAgent('QA'))
    expect(hired.filter(Boolean)).toHaveLength(t.EXTRA_DESKS.length)
    expect(t.freeDeskCount()).toBe(0)
    // nomes e mesas sem repetições
    const agents = t.useOffice.getState().agents
    expect(new Set(agents.map((a) => a.name)).size).toBe(agents.length)
    expect(new Set(agents.map((a) => a.desk)).size).toBe(agents.length)
  })

  it('não contrata funções inválidas (ex.: outro PM)', async () => {
    const t = await fresh()
    expect(t.hireAgent('PM')).toBeNull()
  })

  it('os contratados ficam gravados e voltam depois de recarregar', async () => {
    const t = await fresh()
    const agent = t.hireAgent('DESIGN')
    // força a gravação imediata (normalmente acontece 2 s depois de cada mudança)
    window.dispatchEvent(new Event('beforeunload'))
    vi.resetModules()
    const { useOffice } = await import('../src/sim/store')
    const back = useOffice.getState().agents.find((a) => a.id === agent.id)
    expect(back).toBeTruthy()
    expect(back.name).toBe(agent.name)
    expect(back.role).toBe('DESIGN')
    expect(back.desk).toBe(agent.desk)
  })
})
