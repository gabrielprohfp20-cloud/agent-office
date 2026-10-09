// Liga a simulação ao 3D: enquanto o 3D está visível, o movimento avança a cada frame.
// (O motor em si arranca em App.jsx, para continuar a funcionar com a aba escondida.)
import { useFrame } from '@react-three/fiber'
import { frameStep } from '../sim/engine'

export default function SimRunner() {
  useFrame(({ gl }) => {
    frameStep()
    if (import.meta.env.DEV) window.__gl = gl // para medir desempenho na consola
  })
  return null
}
