import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import Scene from './scene/Scene'
import Hud from './ui/Hud'
import { startEngine } from './sim/engine'

export default function App() {
  const [selected, setSelected] = useState(null)
  // Resolução automática: baixa se o computador começar a engasgar, sobe quando há folga
  const [dpr, setDpr] = useState(1.25)

  // Simulação (mercado, cérebro, movimento): corre mesmo com a aba escondida
  useEffect(() => startEngine(), [])

  return (
    <div className="app">
      <Canvas
        shadows
        dpr={dpr}
        camera={{ position: [4, 17, 19], fov: 35 }}
        onPointerMissed={() => setSelected(null)}
      >
        <PerformanceMonitor
          onChange={({ factor }) => setDpr(Math.round((0.75 + 0.5 * factor) * 20) / 20)}
          flipflops={3}
          onFallback={() => setDpr(0.75)}
        />
        <Suspense fallback={null}>
          <Scene selected={selected} onSelect={setSelected} />
        </Suspense>
      </Canvas>
      <Hud selected={selected} onSelect={setSelected} />
    </div>
  )
}
