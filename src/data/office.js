// Dados do escritório: onde ficam as mesas e quem são os agentes.
// Mais tarde (Fase 3) estes dados vão ser controlados pelo "cérebro" dos agentes.

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

// activity: 'typing' (a escrever), 'thinking' (a pensar) ou 'idle' (parado)
export const AGENTS = [
  {
    id: 'pm', name: 'Atlas', role: 'PM', title: 'Gestor de Projeto',
    color: '#7c5cff', skin: '#f1c7a5', hair: '#3b2a20',
    desk: 0, symbol: 'SPX', activity: 'thinking', emoji: '📋', status: 'A planear o sprint',
  },
  {
    id: 'dev1', name: 'Nova', role: 'DEV', title: 'Programadora',
    color: '#22c55e', skin: '#8d5a3b', hair: '#15110e',
    desk: 1, symbol: 'BTC', activity: 'typing', emoji: '💻', status: 'A escrever código',
  },
  {
    id: 'dev2', name: 'Byte', role: 'DEV', title: 'Programador',
    color: '#0ea5e9', skin: '#e0ac69', hair: '#5a3825',
    desk: 2, symbol: 'ETH', activity: 'typing', emoji: '⚙️', status: 'A executar testes',
  },
  {
    id: 'design', name: 'Iris', role: 'DESIGN', title: 'Designer',
    color: '#f472b6', skin: '#f6d2b8', hair: '#c2410c',
    desk: 3, symbol: 'EUR', activity: 'typing', emoji: '🎨', status: 'A desenhar a interface',
  },
  {
    id: 'qa', name: 'Sentinel', role: 'QA', title: 'Controlo de Qualidade',
    color: '#f59e0b', skin: '#c68642', hair: '#1f2937',
    desk: 4, symbol: 'XAU', activity: 'thinking', emoji: '🔍', status: 'A rever bugs',
  },
  {
    id: 'intern', name: 'Echo', role: 'INTERN', title: 'Estagiário',
    color: '#94a3b8', skin: '#ffdbac', hair: '#d4a373',
    desk: 5, symbol: 'TSLA', activity: 'typing', emoji: '📚', status: 'A estudar a documentação',
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
