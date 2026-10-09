// Motor da simulação: arranca o mercado, o cérebro e o movimento dos agentes.
// O movimento avança a cada frame quando o 3D está visível; quando não está
// (aba escondida, janela minimizada), o relógio em segundo plano faz avançar.
import { useOffice } from './store'
import { placeAtDesk, runtime, stepMovement } from './movement'
import { startBrain } from './brain'
import { startMarket } from './market'
import { onTick, simNow } from './clock'
import { rebuildNavigation } from './team'
import { startSession } from './trading'

// A navegação tem de conhecer as mesas dos contratados (recuperados da gravação)
rebuildNavigation()

// Toda a gente começa sentada na sua secretária
useOffice.getState().agents.forEach((a) => {
  if (!runtime[a.id]) placeAtDesk(a)
})

let last = simNow()
let lastFrame = 0 // tempo real do último frame desenhado

// Avança o movimento pelo tempo de simulação que passou, em passos pequenos (máx. 0,05 s cada)
function advance(now) {
  let dt = Math.min((now - last) / 1000, 2)
  last = now
  while (dt > 0) {
    const step = Math.min(dt, 0.05)
    stepMovement(step)
    dt -= step
  }
}

// Chamado pelo 3D a cada frame
export function frameStep() {
  lastFrame = performance.now()
  advance(simNow())
}

export function startEngine() {
  startMarket()
  startSession() // o limite de perda da sessão conta a partir de agora
  // se o 3D não desenhou nada há mais de 0,25 s, o relógio de fundo faz o movimento avançar
  const stopTick = onTick((now) => {
    if (performance.now() - lastFrame > 250) advance(now)
  })
  const stopBrain = startBrain()
  return () => {
    stopTick()
    stopBrain()
  }
}

// Em modo de desenvolvimento, permite inspecionar o estado na consola do navegador
if (import.meta.env.DEV) {
  window.__runtime = runtime
  window.__store = useOffice
}
