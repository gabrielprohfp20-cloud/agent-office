// Teste de integração: o escritório inteiro (cérebro + movimento + rotinas) a correr
// a alta velocidade tem de completar um objetivo sozinho, sem erros e sem ficar preso.
import { describe, expect, it, vi } from 'vitest'

describe('cérebro do escritório', () => {
  it('completa um objetivo do início ao fim', async () => {
    localStorage.clear()
    const { useOffice } = await import('../src/sim/store')
    const { startEngine } = await import('../src/sim/engine')
    const errors = []
    const origError = console.error
    console.error = (...args) => { errors.push(String(args[0])); origError(...args) }

    useOffice.getState().setSpeed(40)
    const stop = startEngine()
    const t0 = Date.now()
    while (useOffice.getState().objectivesDone < 1 && Date.now() - t0 < 100_000) {
      await new Promise((r) => setTimeout(r, 200))
    }
    stop()
    console.error = origError

    const s = useOffice.getState()
    expect(errors).toEqual([])
    expect(s.objectivesDone).toBeGreaterThanOrEqual(1)
    expect(s.stats.tasksDone).toBeGreaterThanOrEqual(5)
    expect(s.stats.reviews).toBeGreaterThan(0) // houve revisões
    // as tarefas concluídas aparecem no histórico de quem as fez
    const historyTotal = s.agents.reduce((n, a) => n + a.history.length, 0)
    expect(historyTotal).toBe(s.stats.tasksDone)
  }, 120_000)

  it('contrata sozinho quando há trabalho à espera (sessão de ações)', async () => {
    vi.resetModules()
    localStorage.clear()
    // começar pela sessão de ações (3 operações em paralelo, só 2 traders)
    localStorage.setItem('agent-office-save-v1', JSON.stringify({ version: 2, presetIndex: 1 }))
    const { useOffice } = await import('../src/sim/store')
    const { startEngine } = await import('../src/sim/engine')
    useOffice.getState().setSpeed(40)
    const stop = startEngine()
    const before = useOffice.getState().agents.length
    const t0 = Date.now()
    while (useOffice.getState().agents.length === before && Date.now() - t0 < 100_000) {
      await new Promise((r) => setTimeout(r, 200))
    }
    stop()
    const s = useOffice.getState()
    expect(s.objective?.title).toBe('Sessão de ações')
    expect(s.agents.length).toBeGreaterThan(before)
    expect(s.log.some((l) => l.text.includes('contratou'))).toBe(true)
  }, 120_000)
})
