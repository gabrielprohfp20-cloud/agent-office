// Fase 4: a equipa que cresce.
// Contratar = criar um agente novo, dar-lhe uma mesa livre, fazê-lo entrar pela porta
// e ir sentar-se. As mesas extra só aparecem no escritório quando alguém as ocupa.
import { DESKS, DOOR, EXTRA_DESKS } from '../data/office'
import { SYMBOLS } from './market'
import { buildGrid } from './navigation'
import { placeStanding, sitAt, wait } from './movement'
import { deskSeat } from './places'
import { getAgent, log, say, useOffice } from './store'
import { isBusy, run, visitDesk } from './routines'

export const HIRABLE_ROLES = ['DEV', 'DESIGN', 'QA', 'INTERN']

const ROLE_INFO = {
  DEV: { title: 'Programador(a)', emoji: '💻' },
  DESIGN: { title: 'Designer', emoji: '🎨' },
  QA: { title: 'Controlo de Qualidade', emoji: '🔍' },
  INTERN: { title: 'Estagiário(a)', emoji: '📚' },
}
const NAMES = ['Kai', 'Luna', 'Orion', 'Vega', 'Zara', 'Milo', 'Nia', 'Theo', 'Ravi', 'Mira', 'Juno', 'Leo']
const COLORS = ['#14b8a6', '#ef4444', '#eab308', '#a855f7', '#06b6d4', '#84cc16', '#fb7185', '#6366f1']
const SKINS = ['#ffdbac', '#f6d2b8', '#f1c7a5', '#e0ac69', '#c68642', '#8d5a3b']
const HAIRS = ['#15110e', '#3b2a20', '#5a3825', '#c2410c', '#d4a373', '#1f2937']

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const agents = () => useOffice.getState().agents

// Mesas em uso: as 6 iniciais + as extra que já têm dono
export function activeDesks() {
  const used = new Set(agents().map((a) => a.desk))
  return [...DESKS, ...EXTRA_DESKS.filter((d) => used.has(d.id))]
}

export const freeDeskCount = () => {
  const used = new Set(agents().map((a) => a.desk))
  return EXTRA_DESKS.filter((d) => !used.has(d.id)).length
}

// A grelha de navegação tem de conhecer as mesas novas (para os agentes as contornarem)
export const rebuildNavigation = () => buildGrid(activeDesks())

// Contrata um agente com a função pedida. Devolve o agente, ou null se não houver mesa livre.
export function hireAgent(role, reason = 'manual') {
  if (!HIRABLE_ROLES.includes(role)) return null
  const used = new Set(agents().map((a) => a.desk))
  const desk = EXTRA_DESKS.find((d) => !used.has(d.id))
  if (!desk) return null

  const taken = new Set(agents().map((a) => a.name))
  const name = NAMES.find((n) => !taken.has(n)) || `Agente ${agents().length + 1}`
  const usedColors = new Set(agents().map((a) => a.color))
  const agent = {
    id: `hire-${Date.now().toString(36)}-${agents().length}`,
    name,
    role,
    title: ROLE_INFO[role].title,
    color: COLORS.find((c) => !usedColors.has(c)) || pick(COLORS),
    skin: pick(SKINS),
    hair: pick(HAIRS),
    desk: desk.id,
    symbol: pick(SYMBOLS).id,
    hired: true,
    activity: 'idle',
    emoji: '👋',
    status: 'Olá, equipa!',
    progress: null,
    doneCount: 0,
    reviews: 0,
    bugsCaused: 0,
    history: [],
  }

  useOffice.setState((s) => ({ agents: [...s.agents, agent] }))
  rebuildNavigation()
  placeStanding(agent.id, DOOR)

  const pm = agents().find((a) => a.role === 'PM')
  const why = reason === 'auto' ? ' (havia trabalho à espera)' : ''
  log(`🤝 ${pm ? pm.name : 'A equipa'} contratou ${name} (${role})${why}`, agent.color)

  // Entra pela porta, cumprimenta, vai para a mesa; depois o PM dá as boas-vindas
  run([agent.id], async () => {
    await wait(1200)
    say(agent.id, '🚶', 'À procura da minha mesa')
    await sitAt(agent.id, deskSeat(desk.id))
    say(agent.id, ROLE_INFO[role].emoji, 'A instalar o computador', 'typing')
  }).then(() => {
    if (pm && !isBusy(pm.id) && !isBusy(agent.id)) {
      visitDesk(pm.id, agent.id, {
        going: `A dar as boas-vindas a ${name}`,
        arrive: ['🎉', `Bem-vindo(a), ${name}!`],
        reply: ['😊', 'Obrigado(a)!'],
      })
    }
  })
  return getAgent(agent.id)
}
