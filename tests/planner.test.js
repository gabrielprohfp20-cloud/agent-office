// Testes do planeador: os planos são válidos (funções certas, dependências corretas).
import { describe, expect, it } from 'vitest'
import { planObjective, PRESETS } from '../src/sim/planner'

const ROLES = ['PM', 'DEV', 'DESIGN', 'QA', 'INTERN']

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

  it('código é revisto pelo QA e design pelo PM', () => {
    const { tasks } = planObjective(PRESETS[0].title)
    for (const t of tasks) {
      if (t.kind === 'dev') expect(t.reviewerRole).toBe('QA')
      if (t.kind === 'design') expect(t.reviewerRole).toBe('PM')
    }
  })
})
