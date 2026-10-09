// (As pausas não aparecem no feed de atividade, para o feed mostrar só o trabalho.)
// Rotinas: pequenas "histórias" que os agentes representam no escritório
// (ir à mesa de um colega, tomar café, reunião, planear no painel...).
// Cada rotina é escrita passo a passo com "await": espera que o agente
// chegue / termine antes de passar ao passo seguinte.
// Quem decide QUANDO cada rotina acontece é o cérebro (sim/brain.js).
import { getAgent, log, say, useOffice } from './store'
import { setCarry, sitAt, standUp, wait, walkTo } from './movement'
import {
  COFFEE_SPOTS, KANBAN_SPOTS, MEETING_SEATS, SOFA_SEATS,
  deskSeat, deskVisitSpot, freeCount, releaseSpot, takeSpot,
} from './places'

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

// Agentes que estão a meio de uma rotina (não podem ser interrompidos)
const busy = new Set()
export const isBusy = (id) => busy.has(id)
export const busyCount = () => busy.size
export const freeAgents = () => useOffice.getState().agents.filter((a) => !busy.has(a.id))

// O cérebro regista aqui o que fazer quando um agente acaba uma rotina
let afterRoutine = () => {}
export function setAfterRoutine(fn) {
  afterRoutine = fn
}

// Corre uma rotina marcando os agentes como ocupados até ela acabar
export async function run(ids, fn) {
  ids.forEach((id) => busy.add(id))
  try {
    await fn()
  } catch (e) {
    console.error(e)
  } finally {
    ids.forEach((id) => {
      busy.delete(id)
      afterRoutine(id)
    })
  }
}

// Volta à secretária e senta-se
export function goBack(id) {
  say(id, '🚶', 'A voltar à mesa')
  return sitAt(id, deskSeat(getAgent(id).desk))
}

// ---------- Ir à mesa de um colega (entregar tarefa, pedir revisão, levar bugs...) ----------
export function visitDesk(fromId, toId, { going, arrive, reply, onArrive }) {
  const to = getAgent(toId)
  return run([fromId, toId], async () => {
    say(fromId, '🚶', going)
    await standUp(fromId)
    await walkTo(fromId, deskVisitSpot(to.desk))
    onArrive?.()
    say(fromId, ...arrive)
    say(toId, '👀', 'Um momento…', 'thinking')
    await wait(1600)
    say(toId, ...reply)
    await wait(1600)
    await goBack(fromId)
  })
}

// ---------- PM vai planear o objetivo no painel holográfico ----------
export function planAtPanel(pmId, title, onPlanned) {
  return run([pmId], async () => {
    // se os dois lugares estiverem ocupados, usa o primeiro mas não o reserva
    const reserved = takeSpot(KANBAN_SPOTS)
    const spot = reserved || KANBAN_SPOTS[0]
    say(pmId, '🧠', `Novo objetivo: ${title}`)
    await standUp(pmId)
    await walkTo(pmId, spot)
    say(pmId, '🧠', 'A dividir o objetivo em tarefas', 'thinking')
    await wait(4500)
    onPlanned()
    releaseSpot(reserved)
    await goBack(pmId)
  })
}

// ---------- Reunião de arranque na sala de vidro ----------
export function kickoffMeeting(pmId, otherIds, title, taskCount) {
  const team = [pmId, ...otherIds]
  const seats = team.map(() => takeSpot(MEETING_SEATS))
  const lines = [
    [pmId, `Novo objetivo: ${title}`],
    [pmId, `Dividi o trabalho em ${taskCount} tarefas`],
    [pick(otherIds), 'Quem começa?'],
    [pmId, 'Primeiro a pesquisa, depois o resto'],
    [pick(otherIds), 'Vamos a isso! 💪'],
  ]
  return run(team, async () => {
    log(`${getAgent(pmId).name} convocou a reunião de arranque`, getAgent(pmId).color)
    say(pmId, '📣', 'Reunião de arranque!')
    await wait(1000)
    await Promise.all(team.map(async (id, i) => {
      if (id !== pmId) say(id, '🗓️', 'A caminho da reunião')
      await standUp(id)
      await sitAt(id, seats[i])
    }))
    for (const [speaker, text] of lines) {
      team.forEach((id) => id !== speaker && say(id, '👂', 'A ouvir', 'thinking'))
      say(speaker, '💬', text)
      await wait(2400)
    }
    seats.forEach(releaseSpot)
    await Promise.all(team.map(async (id) => {
      await standUp(id)
      await goBack(id)
    }))
  })
}

// ---------- Pausas ----------
const COFFEE_CHAT = ['Como vai a tua tarefa?', 'Este café está ótimo', 'Viste o BTC hoje?', 'Já almoçaste?', 'Tenho uma ideia…']

export function coffeeBreak(ids) {
  if (freeCount(COFFEE_SPOTS) < ids.length) return false
  const spots = ids.map(() => takeSpot(COFFEE_SPOTS))
  run(ids, async () => {
    await Promise.all(ids.map(async (id, i) => {
      say(id, '☕', 'Pausa para café')
      await standUp(id)
      await walkTo(id, spots[i])
      setCarry(id, 'mug')
    }))
    if (ids.length > 1) {
      for (let i = 0; i < 4; i++) {
        say(ids[i % 2], '💬', pick(COFFEE_CHAT))
        say(ids[(i + 1) % 2], '☕', 'A ouvir…', 'thinking')
        await wait(2200)
      }
    } else {
      say(ids[0], '☕', 'Hmm, café…')
      await wait(5000)
    }
    spots.forEach(releaseSpot)
    await Promise.all(ids.map(async (id) => {
      await goBack(id)
      setCarry(id, null)
    }))
  })
  return true
}

export function sofaBreak(id) {
  const seat = takeSpot(SOFA_SEATS)
  if (!seat) return false
  run([id], async () => {
    say(id, '🛋️', 'Pausa de 5 minutos')
    await standUp(id)
    await sitAt(id, seat)
    say(id, '😌', 'A descansar…')
    await wait(7000)
    releaseSpot(seat)
    await standUp(id)
    await goBack(id)
  })
  return true
}

export function lookAtPanel(id) {
  const spot = takeSpot(KANBAN_SPOTS)
  if (!spot) return false
  run([id], async () => {
    say(id, '📊', 'Vou ver o painel de análise')
    await standUp(id)
    await walkTo(id, spot)
    say(id, '📈', 'A analisar os gráficos', 'thinking')
    await wait(3500)
    releaseSpot(spot)
    await goBack(id)
  })
  return true
}
