// Um agente: o personagem 3D, a etiqueta com o nome e o balão de estado.
// A posição vem de sim/movement.js; aqui só desenhamos e animamos o corpo.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { runtime, isWalking } from '../sim/movement'
import { REFLECT_LAYER } from './layers'

const PANTS = '#2d3446'
const SHOES = '#1b1e25'
const THIGH = 0.38
const SHIN = 0.44
const STAND_HIP = THIGH + SHIN + 0.08 // 0.90
const SEAT_HIP = 0.58

const lerp = (a, b, t) => a + (b - a) * t

function Part({ geometry, color, roughness = 0.7, ...props }) {
  return (
    <mesh castShadow receiveShadow {...props}>
      {geometry}
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

// Perna com anca e joelho que dobram
function Leg({ x, hipRef, kneeRef }) {
  return (
    <group ref={hipRef} position={[x, 0, 0]}>
      <Part geometry={<boxGeometry args={[0.13, THIGH, 0.14]} />} color={PANTS} position={[0, -THIGH / 2, 0]} />
      <group ref={kneeRef} position={[0, -THIGH, 0]}>
        <Part geometry={<boxGeometry args={[0.12, SHIN, 0.13]} />} color={PANTS} position={[0, -SHIN / 2, 0]} />
        <Part geometry={<boxGeometry args={[0.13, 0.08, 0.22]} />} color={SHOES} position={[0, -SHIN - 0.04, -0.04]} />
      </group>
    </group>
  )
}

export default function Agent({ agent, selected, onSelect }) {
  const root = useRef()
  const body = useRef() // tudo o que está acima da anca (sobe/desce ao sentar)
  const legs = useRef()
  const torso = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const mug = useRef()
  const hipL = useRef(), kneeL = useRef(), hipR = useRef(), kneeR = useRef()
  const walkBlend = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const phase = useMemo(() => Math.random() * 10, [])

  // Os agentes são das poucas coisas que aparecem refletidas no chão
  useLayoutEffect(() => {
    root.current.traverse((o) => o.layers.enable(REFLECT_LAYER))
  }, [])

  useFrame(({ clock }, dt) => {
    const rt = runtime[agent.id]
    if (!rt) return
    const t = clock.elapsedTime + phase

    // Posição e rotação no escritório
    root.current.position.set(rt.x, 0, rt.z)
    root.current.rotation.y = rt.rot

    // Quanto está a andar (0 a 1) e quanto está sentado (0 a 1)
    walkBlend.current = lerp(walkBlend.current, isWalking(rt) ? 1 : 0, Math.min(1, dt * 8))
    const w = walkBlend.current
    const s = rt.sit
    const ph = rt.walkPhase

    // Altura da anca: baixa ao sentar, sobe e desce um pouco ao andar
    const hip = lerp(STAND_HIP, SEAT_HIP, s) + Math.abs(Math.sin(ph)) * 0.035 * w
    body.current.position.y = hip
    legs.current.position.y = hip

    // Pernas: ao sentar a coxa fica na horizontal e o joelho dobra 90°
    const swingL = Math.sin(ph) * 0.55 * w
    const swingR = Math.sin(ph + Math.PI) * 0.55 * w
    hipL.current.rotation.x = s * (Math.PI / 2) + swingL
    hipR.current.rotation.x = s * (Math.PI / 2) + swingR
    kneeL.current.rotation.x = -s * (Math.PI / 2) - Math.max(0, -Math.sin(ph)) * 0.7 * w
    kneeR.current.rotation.x = -s * (Math.PI / 2) - Math.max(0, Math.sin(ph)) * 0.7 * w

    // Respirar e mexer a cabeça
    torso.current.scale.y = 1 + Math.sin(t * 2) * 0.02
    torso.current.rotation.x = -0.06 * w // inclina-se um pouco para a frente ao andar
    if (agent.activity === 'thinking') {
      head.current.rotation.x = -0.18 + Math.sin(t * 0.8) * 0.05
      head.current.rotation.y = Math.sin(t * 0.5) * 0.35
    } else {
      head.current.rotation.x = Math.sin(t * 1.3) * 0.03
      head.current.rotation.y = Math.sin(t * 0.4) * 0.15 * (1 - w)
    }

    // Braços: pose de base conforme o que está a fazer, misturada com o balanço de andar
    const carrying = rt.carry === 'mug'
    let baseL, baseR
    if (s > 0.5 && agent.activity === 'typing') {
      baseL = 1.2 + Math.sin(t * 16) * 0.08
      baseR = 1.2 + Math.cos(t * 15) * 0.08
    } else if (s > 0.5) {
      baseL = 1.1
      baseR = agent.activity === 'thinking' ? 2.3 + Math.sin(t) * 0.05 : 1.1 // mão no queixo
    } else {
      baseL = 0.08 + Math.sin(t * 1.5) * 0.04
      baseR = agent.activity === 'thinking' ? 2.3 : 0.08 + Math.cos(t * 1.4) * 0.04
    }
    if (carrying) baseR = 1.3
    armL.current.rotation.x = lerp(baseL, -swingL * 0.9, w)
    armR.current.rotation.x = carrying ? 1.3 : lerp(baseR, -swingR * 0.9, w)
    mug.current.visible = carrying
  })

  return (
    <group
      ref={root}
      onClick={(e) => { e.stopPropagation(); onSelect(agent.id) }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Anel de seleção no chão */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.5, 0.6, 48]} />
        <meshBasicMaterial color={agent.color} transparent opacity={selected ? 0.95 : hovered ? 0.5 : 0} />
      </mesh>

      {/* Pernas (presas à anca) */}
      <group ref={legs}>
        <Leg x={-0.09} hipRef={hipL} kneeRef={kneeL} />
        <Leg x={0.09} hipRef={hipR} kneeRef={kneeR} />
      </group>

      {/* Corpo acima da anca */}
      <group ref={body}>
        <Part geometry={<boxGeometry args={[0.34, 0.14, 0.26]} />} color={PANTS} position={[0, 0, 0.02]} />

        <group ref={torso} position={[0, 0.06, 0.03]}>
          <Part geometry={<capsuleGeometry args={[0.16, 0.24, 8, 16]} />} color={agent.color} position={[0, 0.22, 0]} />
        </group>

        {/* Braços: rodam a partir do ombro */}
        {[[-0.215, armL], [0.215, armR]].map(([x, ref]) => (
          <group key={x} ref={ref} position={[x, 0.45, 0.03]}>
            <Part geometry={<capsuleGeometry args={[0.055, 0.32, 6, 12]} />} color={agent.color} position={[0, -0.2, 0]} />
            <Part geometry={<sphereGeometry args={[0.06, 16, 16]} />} color={agent.skin} position={[0, -0.43, 0]} />
            {ref === armR && (
              <group ref={mug} position={[0, -0.47, -0.04]} rotation-x={-1.3} visible={false}>
                <mesh castShadow position={[0, 0.03, 0]}>
                  <cylinderGeometry args={[0.045, 0.04, 0.1, 16]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>
              </group>
            )}
          </group>
        ))}

        {/* Cabeça */}
        <group ref={head} position={[0, 0.66, 0.02]}>
          <Part geometry={<cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />} color={agent.skin} position={[0, -0.12, 0]} />
          <Part geometry={<sphereGeometry args={[0.165, 20, 16]} />} color={agent.skin} position={[0, 0.04, 0]} roughness={0.6} />
          <Part geometry={<sphereGeometry args={[0.175, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />} color={agent.hair} position={[0, 0.06, 0.02]} rotation-x={0.35} />
          {[-0.06, 0.06].map((x) => (
            <mesh key={x} position={[x, 0.05, -0.155]}>
              <sphereGeometry args={[0.022, 12, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* Etiqueta e balão de estado (HTML a flutuar no 3D) */}
        <Html position={[0, 1.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`agent-label${selected ? ' is-selected' : ''}`}>
            <div className="bubble" key={agent.status}>
              <div className="bubble-row">
                <span>{agent.emoji}</span> {agent.status}
                {agent.activity === 'thinking' && agent.progress === null && <span className="dots"><i /><i /><i /></span>}
              </div>
              {agent.progress !== null && (
                <div className="bubble-bar"><i style={{ width: `${Math.round(agent.progress * 100)}%`, background: agent.color }} /></div>
              )}
            </div>
            <div className="tag" style={{ '--c': agent.color }}>
              <span className="dot" />
              {agent.name}
              <small>{agent.role}</small>
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}
