// Estado partilhado entre o 3D e a interface:
// agentes, feed de atividade, objetivo atual, tarefas, fila, estatísticas, velocidade e carteira.
// O estado é gravado no navegador (localStorage) e recuperado ao recarregar a página.
import { create } from 'zustand'
import { AGENTS, ALL_DESKS } from '../data/office'
import { setSpeed as setClockSpeed } from './clock'
import { lastPrices, restorePrices } from './market'

const SAVE_KEY = 'agent-office-save-v1'
const SAVE_VERSION = 2 // 2 = Fase 5 (funções de trading)
const HISTORY_MAX = 20
const LOOK_FIELDS = ['name', 'color', 'hair', 'skin'] // o que o utilizador pode personalizar

export const START_CAPITAL = 100_000 // capital virtual inicial da mesa de trading

// Funções antigas (Fases 1-4) -> funções da mesa de trading
const OLD_ROLES = { PM: 'LEAD', DEV: 'TRADER', DESIGN: 'ANALYST', QA: 'RISK', INTERN: 'JUNIOR' }
const OLD_TITLES = { TRADER: 'Trader', ANALYST: 'Analista de Mercado', RISK: 'Gestor de Risco', JUNIOR: 'Analista Júnior' }

const COUNTERS = ['doneCount', 'reviews', 'bugsCaused', 'pnl', 'trades', 'wins']

const freshAgent = (a) => ({
  ...a,
  progress: null,
  doneCount: 0, // tarefas concluídas
  reviews: 0, // revisões feitas a colegas
  bugsCaused: 0, // correções pedidas ao seu trabalho
  pnl: 0, // lucro/prejuízo realizado nas operações (traders)
  trades: 0, // operações fechadas
  wins: 0, // operações fechadas com lucro
  history: [], // últimas tarefas: { title, emoji, kind, bugs, seconds, at }
})

const freshStats = () => ({ tasksDone: 0, reviews: 0, bugsFound: 0, workSeconds: 0, trades: 0, wins: 0 })

export const freshPortfolio = () => ({ realized: 0, positions: [], closed: [], sessionStart: START_CAPITAL, nextId: 1 })

// ---------- Carregar o que foi gravado ----------
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const counters = (s) => Object.fromEntries(COUNTERS.map((k) => [k, s[k] || 0]))

// Ajusta o estado gravado para recomeçar de forma segura (os agentes começam todos na mesa)
function restore(save) {
  const migrating = save && save.version !== SAVE_VERSION // gravação de antes da Fase 5

  const agents = AGENTS.map((a) => {
    const s = save?.agents?.find((x) => x.id === a.id)
    if (!s) return freshAgent(a)
    // aparência personalizada pelo utilizador (só os campos que existirem)
    const look = Object.fromEntries(LOOK_FIELDS.filter((k) => s[k]).map((k) => [k, s[k]]))
    return { ...freshAgent(a), ...look, ...counters(s), history: s.history || [] }
  })
  // Fase 4: agentes contratados (não existem na lista inicial)
  const deskIds = new Set(ALL_DESKS.map((d) => d.id))
  for (const s of save?.agents || []) {
    if (!s.hired || agents.some((a) => a.id === s.id) || !deskIds.has(s.desk)) continue
    const role = OLD_ROLES[s.role] || s.role
    agents.push({
      ...freshAgent({
        id: s.id, name: s.name, role, title: migrating ? OLD_TITLES[role] || s.title : s.title,
        color: s.color, skin: s.skin, hair: s.hair, desk: s.desk, symbol: s.symbol,
        strategy: role === 'TRADER' ? s.strategy || 'trend' : undefined,
        hired: true, activity: 'idle', emoji: '💼', status: 'De volta ao trabalho',
      }),
      ...counters(s),
      history: s.history || [],
    })
  }
  if (!save) return { agents }

  restorePrices(save.prices)

  let { objective, tasks = [], queue = [] } = save
  if (migrating) {
    // as tarefas antigas eram de programação: a mesa de trading começa com objetivos novos
    objective = null
    tasks = []
  }
  if (objective?.status === 'planning') {
    // estava a meio do planeamento: volta para a fila e planeia de novo
    queue = [objective.title, ...queue]
    objective = null
    tasks = []
  }
  tasks = tasks.map((t) => {
    // tarefa atribuída mas ainda não entregue: o gestor volta a entregá-la
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
    presetIndex: migrating ? 0 : save.presetIndex || 0,
    stats: { ...freshStats(), ...save.stats },
    speed: save.speed ?? 1,
    portfolio: { ...freshPortfolio(), ...save.portfolio },
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

  // ---------- Fase 5: carteira de trading (ver sim/trading.js) ----------
  portfolio: freshPortfolio(),

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

  // Personalização feita pelo utilizador: nome, cor da camisola, cabelo, pele
  customizeAgent: (id, patch) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => LOOK_FIELDS.includes(k)))
    if (clean.name !== undefined) clean.name = clean.name.trim().slice(0, 16) || undefined
    if (clean.name === undefined) delete clean.name
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...clean } : a)) }))
  },

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
    version: SAVE_VERSION,
    agents: s.agents.map((a) => ({
      id: a.id, name: a.name, color: a.color, hair: a.hair, skin: a.skin, history: a.history,
      ...counters(a),
      ...(a.hired && { hired: true, role: a.role, title: a.title, desk: a.desk, symbol: a.symbol, strategy: a.strategy }),
    })),
    objective: s.objective,
    tasks: s.tasks,
    queue: s.queue,
    log: s.log,
    objectivesDone: s.objectivesDone,
    presetIndex: s.presetIndex,
    stats: s.stats,
    speed: s.speed,
    portfolio: s.portfolio,
    prices: lastPrices(),
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
