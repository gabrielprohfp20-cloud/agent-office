// Relógio da simulação.
// Os navegadores abrandam (ou quase param) os temporizadores normais quando a aba
// está escondida. Um "Web Worker" (mini-programa em segundo plano) não é abrandado,
// por isso usamo-lo para dar o ritmo à simulação: assim o escritório continua a
// trabalhar mesmo com a aba fechada atrás de outras.
//
// O relógio tem o seu próprio "tempo de simulação", que pode andar mais depressa
// (2x, 4x) ou parar (pausa). Todo o código da simulação usa este tempo (simNow).
const SOURCE = 'setInterval(() => postMessage(0), 50)'

const intervals = new Set() // { ms, fn, next }
let timeouts = [] // { at, fn }
const tickListeners = new Set()
let started = false

// Tempo de simulação = simBase + (tempo real desde realBase) × velocidade
let speed = 1
let simBase = 0
let realBase = performance.now()

export const simNow = () => simBase + (performance.now() - realBase) * speed
export const getSpeed = () => speed

export function setSpeed(s) {
  simBase = simNow()
  realBase = performance.now()
  speed = s
}

function tick() {
  const now = simNow()
  tickListeners.forEach((fn) => fn(now))
  for (const it of intervals) {
    if (now >= it.next) {
      it.next = Math.max(it.next + it.ms, now - it.ms) // não acumular atrasos
      it.fn()
    }
  }
  if (timeouts.length) {
    const due = timeouts.filter((t) => now >= t.at)
    if (due.length) {
      timeouts = timeouts.filter((t) => now < t.at)
      due.forEach((t) => t.fn())
    }
  }
}

function ensureStarted() {
  if (started) return
  started = true
  try {
    const worker = new Worker(URL.createObjectURL(new Blob([SOURCE], { type: 'text/javascript' })))
    worker.onmessage = tick
  } catch {
    setInterval(tick, 50) // plano B, se o navegador não permitir workers
  }
}

// Chama fn a cada "ms" milissegundos (de simulação). Devolve uma função para parar.
export function every(ms, fn) {
  ensureStarted()
  const it = { ms, fn, next: simNow() + ms }
  intervals.add(it)
  return () => intervals.delete(it)
}

// Chama fn uma vez daqui a "ms" milissegundos (de simulação)
export function after(ms, fn) {
  ensureStarted()
  const t = { at: simNow() + ms, fn }
  timeouts.push(t)
  return () => { timeouts = timeouts.filter((x) => x !== t) }
}

export const wait = (ms) => new Promise((resolve) => after(ms, resolve))

// Chama fn a cada batida do relógio (20 vezes por segundo, tempo real), com o tempo de simulação
export function onTick(fn) {
  ensureStarted()
  tickListeners.add(fn)
  return () => tickListeners.delete(fn)
}
