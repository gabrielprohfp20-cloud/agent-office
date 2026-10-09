// O CÉREBRO do escritório (simulado). A cada segundo decide:
//   1. Se não há objetivo -> o PM escolhe um, planeia-o e faz a reunião de arranque
//   2. Tarefas prontas a começar -> o PM entrega-as a quem tem a função certa
//   3. Quem tem tarefa trabalha nela (a barra de progresso sobe)
//   4. Trabalho acabado -> vai para revisão (QA revê código, PM revê design)
//   5. A revisão pode encontrar bugs -> a tarefa volta para trás
//   6. Tudo concluído -> festa 🎉 e passa-se ao objetivo seguinte
//   7. Quem está sem trabalho faz pausas (café, sofá, painel)
// Na Fase 5 as decisões "inteligentes" (planear, rever) passam a ser feitas por uma IA.
import { getAgent, getTask, log, say, useOffice } from './store'
import { runtime } from './movement'
import { every, simNow } from './clock'
import { deskSeat } from './places'
import { planObjective, PRESETS } from './planner'
import {
  busyCount, coffeeBreak, freeAgents, isBusy, kickoffMeeting, lookAtPanel,
  pick, planAtPanel, setAfterRoutine, sofaBreak, visitDesk,
} from './routines'

const TICK_MS = 1000
const REVIEW_SECONDS = 9

const state = () => useOffice.getState()
const patchTask = (id, patch) => state().updateTask(id, patch)
const agentsWithRole = (role) => state().agents.filter((a) => a.role === role)

// O que os agentes fazem quando estão sem tarefas
const IDLE = {
  PM: [['📋', 'A acompanhar a equipa', 'thinking'], ['✉️', 'A responder a emails', 'typing']],
  DEV: [['📚', 'A estudar uma biblioteca nova', 'typing'], ['🧹', 'A arrumar o código', 'typing']],
  DESIGN: [['🖌️', 'A procurar inspiração', 'thinking'], ['📐', 'A organizar os ícones', 'typing']],
  QA: [['🧪', 'A preparar testes', 'typing'], ['📝', 'A rever relatórios antigos', 'thinking']],
  INTERN: [['📚', 'A estudar o mercado', 'typing'], ['🤔', 'A ler sobre trading', 'thinking']],
}

// ---------- Estado interno ----------
let planning = false
let nextObjectiveAt = 0
let celebrateUntil = 0

// O agente está sentado na sua secretária (pode trabalhar)?
function atDesk(id) {
  const rt = runtime[id]
  const home = deskSeat(getAgent(id).desk)
  return rt && rt.seat && rt.seat.x === home.x && rt.seat.z === home.z && rt.sit > 0.9
}

const myTask = (id) => state().tasks.find((t) => t.assignee === id && t.status === 'doing')
const myReview = (id) => state().tasks.find((t) => t.reviewer === id && t.status === 'review' && t.reviewReady)
const hasWork = (id) => !!(myTask(id) || myReview(id) || state().tasks.some((t) => t.assignee === id && t.status === 'todo'))

// ---------- 1. Novo objetivo ----------
function startNextObjective() {
  const pm = agentsWithRole('PM')[0]
  if (!pm || isBusy(pm.id) || freeAgents().length < 3) return
  const s = state()
  let title
  if (s.queue.length) {
    title = s.queue[0]
    useOffice.setState({ queue: s.queue.slice(1) })
  } else {
    title = PRESETS[s.presetIndex % PRESETS.length].title
    useOffice.setState({ presetIndex: s.presetIndex + 1 })
  }
  planning = true
  useOffice.setState({ objective: { id: 'planning', title, status: 'planning' }, tasks: [] })
  log(`🎯 Novo objetivo: ${title}`, pm.color)

  let plan
  planAtPanel(pm.id, title, () => {
    plan = planObjective(title)
    useOffice.setState({ objective: plan.objective, tasks: plan.tasks })
    log(`${pm.name} dividiu o objetivo em ${plan.tasks.length} tarefas`, pm.color)
  }).then(async () => {
    const others = freeAgents().filter((a) => a.id !== pm.id).map((a) => a.id)
    if (plan && others.length >= 2) {
      await kickoffMeeting(pm.id, others.slice(0, 5), title, plan.tasks.length)
    }
    if (!plan) {
      // o planeamento foi interrompido: volta a tentar daqui a pouco
      useOffice.setState({ objective: null })
      if (!PRESETS.some((p) => p.title === title)) useOffice.setState((s) => ({ queue: [title, ...s.queue] }))
      else useOffice.setState((s) => ({ presetIndex: s.presetIndex - 1 }))
      nextObjectiveAt = simNow() + 3000
    }
    planning = false
  })
}

// ---------- 2. Distribuir tarefas ----------
function assignTasks() {
  const s = state()
  const ready = s.tasks.filter((t) =>
    t.status === 'todo' && !t.assignee && t.deps.every((d) => getTask(d)?.status === 'done'))
  const pm = agentsWithRole('PM')[0]

  for (const task of ready) {
    // candidatos: função certa e sem outra tarefa por fazer
    const candidates = agentsWithRole(task.role).filter((a) => !hasWork(a.id))
    if (!candidates.length) continue
    const agent = candidates.find((a) => !isBusy(a.id)) || candidates[0]
    patchTask(task.id, { assignee: agent.id })

    const start = () => {
      patchTask(task.id, { status: 'doing' })
      log(`${task.emoji} ${agent.name} começou: ${task.title}`, agent.color)
    }

    // O PM vai à mesa entregar a tarefa (se estiver livre); senão, atribui à distância
    if (pm && pm.id !== agent.id && !isBusy(pm.id) && !isBusy(agent.id)) {
      visitDesk(pm.id, agent.id, {
        going: `A levar uma tarefa a ${agent.name}`,
        arrive: ['📋', `Nova tarefa: ${task.title}`],
        reply: ['👍', 'Combinado!'],
        onArrive: start,
      }).then(() => {
        // segurança: se a visita foi interrompida antes de chegar, a tarefa começa na mesma
        if (getTask(task.id)?.status === 'todo') start()
      })
    } else {
      start()
    }
  }
}

// ---------- 3/4/5. Trabalhar, pedir revisão, rever ----------
function bugChance(task) {
  if (task.kind === 'dev') return [0.4, 0.2, 0][Math.min(task.bugs, 2)]
  if (task.kind === 'design') return [0.25, 0][Math.min(task.bugs, 1)]
  return 0
}

function finishTask(task, agent) {
  const t = getTask(task.id)
  const seconds = Math.round(t.worked || 0)
  patchTask(task.id, { status: 'done', progress: 1 })
  state().setStatus(agent.id, { doneCount: getAgent(agent.id).doneCount + 1 })
  state().addHistory(agent.id, { title: t.title, emoji: t.emoji, kind: t.kind, bugs: t.bugs, seconds, at: Date.now() })
  state().bumpStats({ tasksDone: 1, workSeconds: seconds })
  log(`✅ ${task.title} — concluída`, agent.color)
}

function sendToReview(task, agent) {
  // quem revê: o colega com a função de revisor que tiver menos revisões pendentes
  const reviewers = agentsWithRole(task.reviewerRole)
  const load = (id) => state().tasks.filter((t) => t.reviewer === id && t.status === 'review').length
  const reviewer = reviewers.sort((a, b) => load(a.id) - load(b.id))[0]
  patchTask(task.id, { status: 'review', progress: 1, reviewer: reviewer.id, reviewProgress: 0, reviewReady: false })
  log(`📦 ${agent.name} enviou "${task.title}" para revisão de ${reviewer.name}`, agent.color)

  if (!isBusy(agent.id) && !isBusy(reviewer.id)) {
    visitDesk(agent.id, reviewer.id, {
      going: `A levar trabalho a ${reviewer.name}`,
      arrive: ['📦', 'Pronto para rever!'],
      reply: ['👀', 'Vou ver isso'],
      onArrive: () => patchTask(task.id, { reviewReady: true }),
    }).then(() => {
      // segurança: a revisão fica disponível mesmo que a entrega tenha sido interrompida
      if (getTask(task.id)?.status === 'review') patchTask(task.id, { reviewReady: true })
    })
  } else {
    patchTask(task.id, { reviewReady: true })
  }
}

function finishReview(task, reviewer) {
  const assignee = getAgent(task.assignee)
  state().setStatus(reviewer.id, { reviews: getAgent(reviewer.id).reviews + 1 })
  state().bumpStats({ reviews: 1 })
  if (Math.random() < bugChance(task)) {
    const n = 1 + Math.floor(Math.random() * 3)
    state().setStatus(assignee.id, { bugsCaused: assignee.bugsCaused + 1 })
    state().bumpStats({ bugsFound: 1 })
    patchTask(task.id, { status: 'doing', progress: 0.55, bugs: task.bugs + 1, reviewer: null, reviewReady: false })
    log(`🐛 ${reviewer.name} encontrou ${n} bug${n > 1 ? 's' : ''} em "${task.title}"`, reviewer.color)
    if (!isBusy(reviewer.id) && !isBusy(assignee.id)) {
      visitDesk(reviewer.id, assignee.id, {
        going: `A levar a lista de bugs a ${assignee.name}`,
        arrive: ['🐛', `Encontrei ${n} bug${n > 1 ? 's' : ''}!`],
        reply: ['😅', 'Vou corrigir já'],
      })
    }
  } else {
    say(reviewer.id, '👍', 'Aprovado!')
    finishTask(task, assignee)
  }
}

function doWork(dt) {
  for (const agent of state().agents) {
    if (isBusy(agent.id) || !atDesk(agent.id) || simNow() < celebrateUntil) continue

    // As revisões têm prioridade sobre o trabalho próprio
    const review = myReview(agent.id)
    if (review) {
      const p = review.reviewProgress + dt / REVIEW_SECONDS
      if (p >= 1) finishReview(review, agent)
      else {
        patchTask(review.id, { reviewProgress: p })
        say(agent.id, '🔍', `A rever: ${review.title}`, 'thinking', p)
      }
      continue
    }

    const task = myTask(agent.id)
    if (task) {
      const p = task.progress + dt / task.work
      if (p >= 1) {
        if (task.reviewerRole) sendToReview(task, agent)
        else finishTask(task, agent)
      } else {
        patchTask(task.id, { progress: p, worked: (task.worked || 0) + dt })
        const fixing = task.bugs > 0 ? '🐛 A corrigir: ' : ''
        say(agent.id, task.bugs > 0 ? '🛠️' : task.emoji, `${fixing}${task.title}`, 'typing', p)
      }
      continue
    }

    // Sem trabalho: estado "livre" (muda de vez em quando)
    if (agent.progress !== null || !agent.status || Math.random() < 0.08) {
      const [emoji, text, activity] = pick(IDLE[agent.role] || IDLE.INTERN)
      say(agent.id, emoji, text, activity)
    }
  }
}

// ---------- 6. Objetivo concluído ----------
function checkObjectiveDone() {
  const s = state()
  if (!s.objective || s.objective.status !== 'active' || !s.tasks.length) return
  if (!s.tasks.every((t) => t.status === 'done')) return
  useOffice.setState({ objective: { ...s.objective, status: 'done' }, objectivesDone: s.objectivesDone + 1 })
  log(`🎉 Objetivo concluído: ${s.objective.title}`, '#22c55e')
  celebrateUntil = simNow() + 5000
  freeAgents().forEach((a) => say(a.id, '🎉', 'Objetivo concluído!'))
  nextObjectiveAt = simNow() + 9000
}

// ---------- 7. Pausas ----------
function maybeBreak() {
  if (busyCount() >= 3 || planning) return
  const idle = freeAgents().filter((a) => atDesk(a.id))
  for (const a of idle) {
    const chance = hasWork(a.id) ? 0.004 : 0.018 // quem tem trabalho quase não faz pausas
    if (Math.random() > chance) continue
    const r = Math.random()
    if (r < 0.5) {
      const friend = idle.find((b) => b.id !== a.id && !hasWork(b.id) && !isBusy(b.id))
      coffeeBreak(friend && Math.random() < 0.5 ? [a.id, friend.id] : [a.id])
    } else if (r < 0.8) sofaBreak(a.id)
    else lookAtPanel(a.id)
    return // no máximo uma pausa nova por segundo
  }
}

// ---------- Ciclo principal ----------
function tick() {
  const s = state()
  const now = simNow()
  const noObjective = !s.objective || s.objective.status === 'done'
  if (noObjective && !planning && now >= nextObjectiveAt) startNextObjective()
  if (s.objective?.status === 'active') {
    if (!planning) assignTasks() // só distribui depois da reunião de arranque
    doWork(TICK_MS / 1000)
    checkObjectiveDone()
  } else {
    doWork(TICK_MS / 1000) // atualiza os estados "livres"
  }
  maybeBreak()
}

// Quando um agente acaba uma rotina, atualiza logo o balão dele
setAfterRoutine((id) => {
  const a = getAgent(id)
  const task = myTask(id)
  const review = myReview(id)
  if (review) say(id, '🔍', `A rever: ${review.title}`, 'thinking', review.reviewProgress)
  else if (task) say(id, task.emoji, task.title, 'typing', task.progress)
  else {
    const [emoji, text, activity] = pick(IDLE[a.role] || IDLE.INTERN)
    say(id, emoji, text, activity)
  }
})

let opened = false

export function startBrain() {
  if (!opened) {
    // só na primeira vez de sempre (depois o feed é recuperado da gravação)
    if (!state().log.length) log('O escritório abriu. Bom dia, equipa! ☀️', '#8b7bff')
    nextObjectiveAt = simNow() + 3000
  }
  opened = true
  return every(TICK_MS, tick) // devolve a função que pára o cérebro
}
