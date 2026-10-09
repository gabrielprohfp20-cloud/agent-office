// Estado partilhado entre o 3D e a interface:
// agentes, feed de atividade, objetivo atual, tarefas, fila, estatísticas e velocidade.
// O estado é gravado no navegador (localStorage) e recuperado ao recarregar a página.
import { create } from 'zustand'
import { AGENTS } from '../data/office'
import { setSpeed as setClockSpeed } from './clock'

const SAVE_KEY = 'agent-office-save-v1'
const HISTORY_MAX = 20

const freshAgent = (a) => ({
  ...a,
  progress: null,
  doneCount: 0, // tarefas concluídas
  reviews: 0, // revisões feitas a colegas
  bugsCaused: 0, // bugs encontrados no seu trabalho
  history: [], // últimas tarefas: { title, emoji, kind, bugs, seconds, at }
})

const freshStats = () => ({ tasksDone: 0, reviews: 0, bugsFound: 0, workSeconds: 0 })

// ---------- Carregar o que foi gravado ----------
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Ajusta o estado gravado para recomeçar de forma segura (os agentes começam todos na mesa)
function restore(save) {
  const agents = AGENTS.map((a) => {
    const s = save?.agents?.find((x) => x.id === a.id)
    return s ? { ...freshAgent(a), doneCount: s.doneCount, reviews: s.reviews, bugsCaused: s.bugsCaused, history: s.history || [] } : freshAgent(a)
  })
  if (!save) return { agents }

  let { objective, tasks = [], queue = [] } = save
  if (objective?.status === 'planning') {
    // estava a meio do planeamento: volta para a fila e planeia de novo
    queue = [objective.title, ...queue]
    objective = null
    tasks = []
  }
  tasks = tasks.map((t) => {
    // tarefa atribuída mas ainda não entregue: o PM volta a entregá-la
    if (t.status === 'todo') return { ...t, assignee: null }
    // revisão pendente: fica logo disponível para o revisor
    if (t.status === 'review') return { ...t, reviewReady: true }
    return t
  })
  return {
    agents,
    objective,
    tasks,
    queue,
    log: save.log || [],
    objectivesDone: save.objectivesDone || 0,
    presetIndex: save.presetIndex || 0,
    stats: { ...freshStats(), ...save.stats },
    speed: save.speed ?? 1,
  }
}

const restored = restore(loadSave())
setClockSpeed(restored.speed ?? 1)

export const useOffice = create((set) => ({
  agents: restored.agents,
  log: [],

  // ---------- Fase 3: objetivos e tarefas ----------
  objective: null, // { id, title, status: 'planning' | 'active' | 'done' }
  tasks: [], // tarefas do objetivo atual (ver sim/planner.js)
  queue: [], // objetivos escritos pelo utilizador, à espera da vez
  objectivesDone: 0,
  presetIndex: 0, // próximo objetivo de exemplo a usar quando a fila está vazia

  stats: freshStats(),
  speed: 1, // 0 = pausa, 1 = normal, 2 = 2x, 4 = 4x

  ...restored,

  setSpeed: (speed) => {
    setClockSpeed(speed)
    set({ speed })
  },

  // O utilizador pede um novo objetivo (entra na fila)
  addObjective: (title) => set((s) => ({ queue: [...s.queue, title.trim()] })),

  // Muda o que um agente está a fazer (aparece no balão e na lista)
  setStatus: (id, patch) =>
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  // Acrescenta uma tarefa ao histórico de um agente
  addHistory: (id, entry) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, history: [entry, ...a.history].slice(0, HISTORY_MAX) } : a)),
    })),

  // Soma valores às estatísticas gerais, ex.: bumpStats({ reviews: 1 })
  bumpStats: (delta) =>
    set((s) => ({
      stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, v + (delta[k] || 0)])),
    })),

  // Atualiza uma tarefa
  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  // Acrescenta uma linha ao feed de atividade
  addLog: (text, color) =>
    set((s) => ({
      log: [{ id: Math.random().toString(36).slice(2), time: Date.now(), text, color }, ...s.log].slice(0, 40),
    })),
}))

// ---------- Gravar automaticamente (no máximo a cada 2 segundos) ----------
let saveTimer = null
function save() {
  saveTimer = null
  const s = useOffice.getState()
  const data = {
    agents: s.agents.map(({ id, doneCount, reviews, bugsCaused, history }) => ({ id, doneCount, reviews, bugsCaused, history })),
    objective: s.objective,
    tasks: s.tasks,
    queue: s.queue,
    log: s.log,
    objectivesDone: s.objectivesDone,
    presetIndex: s.presetIndex,
    stats: s.stats,
    speed: s.speed,
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch { /* sem espaço ou bloqueado: continua sem gravar */ }
}
useOffice.subscribe(() => {
  if (!saveTimer) saveTimer = setTimeout(save, 2000)
})
window.addEventListener('beforeunload', save)

// Apaga tudo o que foi gravado e recomeça o escritório do zero
export function resetOffice() {
  window.removeEventListener('beforeunload', save)
  clearTimeout(saveTimer)
  saveTimer = 'off' // impede novas gravações até a página recarregar
  try { localStorage.removeItem(SAVE_KEY) } catch { /* ignorar */ }
  location.reload()
}

export const getAgent = (id) => useOffice.getState().agents.find((a) => a.id === id)
export const getTask = (id) => useOffice.getState().tasks.find((t) => t.id === id)

// Muda o balão de um agente. "progress" (0 a 1) mostra uma barra de progresso.
export function say(id, emoji, status, activity = 'idle', progress = null) {
  useOffice.getState().setStatus(id, { emoji, status, activity, progress })
}

export function log(text, color) {
  useOffice.getState().addLog(text, color)
}
