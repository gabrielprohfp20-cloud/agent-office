// Testes da gravação: o estado gravado é recuperado e corrigido de forma segura.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SAVE_KEY = 'agent-office-save-v1'

// Carrega o store "do zero", como se a página tivesse acabado de abrir
async function freshStore() {
  vi.resetModules()
  return (await import('../src/sim/store')).useOffice
}

describe('gravação e recuperação', () => {
  beforeEach(() => localStorage.clear())

  it('sem gravação, começa vazio', async () => {
    const s = (await freshStore()).getState()
    expect(s.objective).toBeNull()
    expect(s.tasks).toEqual([])
    expect(s.agents.length).toBeGreaterThan(0)
  })

  it('recupera estatísticas, histórico e tarefas', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      agents: [{ id: 'dev1', doneCount: 3, reviews: 1, bugsCaused: 2, history: [{ title: 'X', seconds: 10 }] }],
      objective: { id: 'o1', title: 'Teste', status: 'active' },
      tasks: [{ id: 't1', status: 'doing', progress: 0.4, assignee: 'dev1', deps: [] }],
      queue: ['Outro'],
      objectivesDone: 5,
      stats: { tasksDone: 9 },
      speed: 2,
    }))
    const s = (await freshStore()).getState()
    const dev = s.agents.find((a) => a.id === 'dev1')
    expect(dev.doneCount).toBe(3)
    expect(dev.history).toHaveLength(1)
    expect(s.tasks[0].progress).toBe(0.4)
    expect(s.queue).toEqual(['Outro'])
    expect(s.objectivesDone).toBe(5)
    expect(s.stats.tasksDone).toBe(9)
    expect(s.stats.reviews).toBe(0) // campos em falta ficam a zero
    expect(s.speed).toBe(2)
  })

  it('objetivo a meio do planeamento volta para a fila', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      objective: { id: 'planning', title: 'Meio planeado', status: 'planning' },
      tasks: [],
      queue: ['Depois'],
    }))
    const s = (await freshStore()).getState()
    expect(s.objective).toBeNull()
    expect(s.queue).toEqual(['Meio planeado', 'Depois'])
  })

  it('tarefas por entregar e revisões pendentes ficam prontas a retomar', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      objective: { id: 'o1', title: 'T', status: 'active' },
      tasks: [
        { id: 'a', status: 'todo', assignee: 'dev1', deps: [] },
        { id: 'b', status: 'review', reviewer: 'qa', reviewReady: false, deps: [] },
      ],
    }))
    const s = (await freshStore()).getState()
    expect(s.tasks[0].assignee).toBeNull() // o PM volta a entregar
    expect(s.tasks[1].reviewReady).toBe(true) // o revisor pode começar
  })

  it('gravação estragada não impede o escritório de abrir', async () => {
    localStorage.setItem(SAVE_KEY, '{isto não é json')
    const s = (await freshStore()).getState()
    expect(s.objective).toBeNull()
  })

  it('guarda a personalização dos agentes', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      agents: [{ id: 'pm', name: 'Zeus', color: '#ff0000', hair: '#000000', doneCount: 0, reviews: 0, bugsCaused: 0, history: [] }],
    }))
    const pm = (await freshStore()).getState().agents.find((a) => a.id === 'pm')
    expect(pm.name).toBe('Zeus')
    expect(pm.color).toBe('#ff0000')
  })
})
