// Dados do escritório: onde ficam as mesas e quem são os agentes.

// Cada mesa tem uma posição [x, y, z] e uma rotação (em radianos).
// Math.PI = meia volta -> o agente fica virado para a câmara.
export const DESKS = [
  { id: 0, position: [-9, 0, -4.5], rotation: Math.PI },
  { id: 1, position: [-5.5, 0, -4.5], rotation: Math.PI },
  { id: 2, position: [-2, 0, -4.5], rotation: Math.PI },
  { id: 3, position: [-9, 0, 1.5], rotation: Math.PI },
  { id: 4, position: [-5.5, 0, 1.5], rotation: Math.PI },
  { id: 5, position: [-2, 0, 1.5], rotation: Math.PI },
]

// Fase 4: lugares livres para novas contratações (a mesa só aparece quando alguém a ocupa)
export const EXTRA_DESKS = [
  { id: 6, position: [1.5, 0, -4.5], rotation: Math.PI },
  { id: 7, position: [1.5, 0, 1.5], rotation: Math.PI },
  { id: 8, position: [-9, 0, 4.6], rotation: Math.PI },
  { id: 9, position: [-2, 0, 4.6], rotation: Math.PI },
]

export const ALL_DESKS = [...DESKS, ...EXTRA_DESKS]

// Ponto de entrada no escritório (junto à porta da parede esquerda)
export const DOOR = { x: -11.3, z: 6, rot: -Math.PI / 2 }

// Fase 5: funções da mesa de trading (o código interno -> o que aparece no ecrã)
export const ROLE_LABEL = {
  LEAD: 'GESTOR',
  TRADER: 'TRADER',
  ANALYST: 'ANALISTA',
  RISK: 'RISCO',
  JUNIOR: 'JÚNIOR',
}

// Estratégias de trading (ver sim/trading.js)
export const STRATEGIES = {
  trend: 'Seguir a tendência',
  meanrev: 'Reversão à média',
  breakout: 'Rompimento',
}

// activity: 'typing' (a escrever), 'thinking' (a pensar) ou 'idle' (parado)
export const AGENTS = [
  {
    id: 'pm', name: 'Atlas', role: 'LEAD', title: 'Gestor da Mesa',
    color: '#7c5cff', skin: '#f1c7a5', hair: '#3b2a20',
    desk: 0, symbol: 'SPX', activity: 'thinking', emoji: '📋', status: 'A definir a estratégia do dia',
  },
  {
    id: 'dev1', name: 'Nova', role: 'TRADER', title: 'Trader', strategy: 'trend',
    color: '#22c55e', skin: '#8d5a3b', hair: '#15110e',
    desk: 1, symbol: 'BTC', activity: 'thinking', emoji: '💹', status: 'A observar o BTC',
  },
  {
    id: 'dev2', name: 'Byte', role: 'TRADER', title: 'Trader', strategy: 'meanrev',
    color: '#0ea5e9', skin: '#e0ac69', hair: '#5a3825',
    desk: 2, symbol: 'ETH', activity: 'thinking', emoji: '💹', status: 'A observar o ETH',
  },
  {
    id: 'design', name: 'Iris', role: 'ANALYST', title: 'Analista de Mercado',
    color: '#f472b6', skin: '#f6d2b8', hair: '#c2410c',
    desk: 3, symbol: 'EUR', activity: 'typing', emoji: '📊', status: 'A estudar os gráficos',
  },
  {
    id: 'qa', name: 'Sentinel', role: 'RISK', title: 'Gestor de Risco',
    color: '#f59e0b', skin: '#c68642', hair: '#1f2937',
    desk: 4, symbol: 'XAU', activity: 'thinking', emoji: '🛡️', status: 'A vigiar o risco',
  },
  {
    id: 'intern', name: 'Echo', role: 'JUNIOR', title: 'Analista Júnior',
    color: '#94a3b8', skin: '#ffdbac', hair: '#d4a373',
    desk: 5, symbol: 'TSLA', activity: 'typing', emoji: '📰', status: 'A ler as notícias',
  },
]

// Calcula onde fica a cadeira (e o agente) de uma mesa.
export function seatFor(desk) {
  const [x, y, z] = desk.position
  const d = 0.75
  return {
    position: [x + Math.sin(desk.rotation) * d, y, z + Math.cos(desk.rotation) * d],
    rotation: desk.rotation,
  }
}
