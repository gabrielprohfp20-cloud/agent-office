// Testes do planeador: os planos são válidos (funções certas, dependências corretas).
import { describe, expect, it } from 'vitest'
import { planObjective, PRESETS } from '../src/sim/planner'

const ROLES = ['LEAD', 'TRADER', 'ANALYST', 'RISK', 'JUNIOR']

describe('planObjective', () => {
  for (const title of [...PRESETS.map((p) => p.title), 'Objetivo inventado pelo utilizador']) {
    it(`cria um plano válido para "${title}"`, () => {
      const { objective, tasks } = planObjective(title)
      expect(objective.title).toBe(title)
      expect(objective.status).toBe('active')
      expect(tasks.length).toBeGreaterThan(0)

      const ids = new Set(tasks.map((t) => t.id))
      expect(ids.size).toBe(tasks.length) // ids únicos
      tasks.forEach((t, i) => {
        expect(ROLES).toContain(t.role)
        expect(t.status).toBe('todo')
        expect(t.work).toBeGreaterThan(0)
        // cada dependência existe e vem antes (assim nunca há ciclos)
        for (const d of t.deps) {
          expect(ids.has(d)).toBe(true)
          expect(tasks.findIndex((x) => x.id === d)).toBeLessThan(i)
        }
      })
      // há pelo menos uma tarefa sem dependências, para o trabalho poder começar
      expect(tasks.some((t) => t.deps.length === 0)).toBe(true)
    })
  }

  it('ordens passam pelo Gestor de Risco e análises pelo Gestor da Mesa', () => {
    const { tasks } = planObjective(PRESETS[0].title)
    for (const t of tasks) {
      if (t.kind === 'trade') {
        expect(t.reviewerRole).toBe('RISK')
        expect(t.symbol).toBeTruthy()
      }
      if (t.kind === 'analysis') expect(t.reviewerRole).toBe('LEAD')
    }
  })

  it('objetivo escrito pelo utilizador opera os ativos mencionados', () => {
    const { tasks } = planObjective('Operar bitcoin e ouro hoje')
    const symbols = tasks.filter((t) => t.kind === 'trade').map((t) => t.symbol).sort()
    expect(symbols).toEqual(['BTC', 'XAU'])
  })
})
