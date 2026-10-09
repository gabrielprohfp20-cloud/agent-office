// O edifício: chão, paredes, salas e decoração — escritório de trading elegante e noturno.
// O escritório tem 24 x 16 metros e está dividido em 3 zonas:
//   - Esquerda: sala de operações (mesas de trading)
//   - Direita em cima: sala de reuniões (vidro)
//   - Direita em baixo: zona de descanso (sofás e cozinha)
// Nota: as posições dos móveis batem certo com os obstáculos em sim/navigation.js
import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import { Box, Neon, RBox } from './primitives'
import {
  Bookshelf, FloorLamp, HoloPanel, Kitchen, MeetingScreen, MeetingTable,
  Plant, QuotePanel, RoundClock, Sofa, WaterCooler, Window,
} from './Furniture'
import { concreteTexture, tileTexture } from './screens'

const STRIP = '#d6e6ff' // fita de LED no topo das paredes
const DOOR_LED = '#60a5fa'

// Chão de pedra polida que reflete os agentes e os móveis como um espelho baço.
// O reflexo usa uma resolução baixa (256) para ser leve; o desfoque disfarça.
function Floor() {
  const tiles = useMemo(() => tileTexture(24 / 4.8, 16 / 4.8), [])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} receiveShadow>
      <planeGeometry args={[24, 16]} />
      <MeshReflectorMaterial
        map={tiles}
        color="#f2f3f6"
        roughness={0.45}
        metalness={0.05}
        blur={[300, 90]}
        resolution={256}
        mixBlur={0.8}
        mixStrength={3}
        mixContrast={1.1}
        mirror={0.7}
        depthScale={0}
      />
    </mesh>
  )
}

function Wall({ args, position }) {
  const tex = useMemo(() => concreteTexture(), [])
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial map={tex} color="#9aa0a8" roughness={0.85} />
    </mesh>
  )
}

function GlassWall({ args, position }) {
  const [w, h, d] = args
  const horizontal = w > d
  const rail = horizontal ? [w, 0.04, 0.05] : [0.05, 0.04, d]
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#cfe3f0" transparent opacity={0.1} roughness={0.05} metalness={0.3} depthWrite={false} />
      </mesh>
      <Box args={rail} position={[0, h / 2, 0]} color="#0b0c0f" metalness={0.5} />
      <Box args={rail} position={[0, -h / 2 + 0.02, 0]} color="#0b0c0f" metalness={0.5} />
      <Neon args={horizontal ? [w, 0.02, 0.02] : [0.02, 0.02, d]} position={[0, -h / 2 + 0.06, 0]} color={STRIP} intensity={1.1} />
    </group>
  )
}

export default function Office() {
  return (
    <group>
      {/* Chão exterior */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#1a1c21" roughness={1} />
      </mesh>

      {/* Laje do escritório + chão de pedra */}
      <Box args={[24.4, 0.4, 16.4]} position={[0, -0.201, 0]} color="#101215" roughness={0.8} />
      <Floor />

      {/* Paredes de betão com fita de LED no topo */}
      <Wall args={[24.6, 3.2, 0.25]} position={[0, 1.6, -8.12]} />
      <Wall args={[0.25, 3.2, 16.5]} position={[-12.12, 1.6, 0]} />
      <Neon args={[24.4, 0.02, 0.02]} position={[0, 3.19, -7.99]} color={STRIP} intensity={2} />
      <Neon args={[0.02, 0.02, 16.2]} position={[-11.99, 3.19, 0]} color={STRIP} intensity={2} />

      {/* Parede do fundo: frase, janelas, relógio, estante */}
      <QuotePanel position={[-9.6, 1.75, -7.97]} lines={['TRADING', 'FOCUS', 'PROGRESS', 'FREEDOM']} size={110} weight={700} />
      <Window position={[-6.4, 1.65, -7.96]} />
      <Window position={[-3.4, 1.65, -7.96]} />
      <RoundClock position={[-1.45, 2.05, -7.97]} />
      <Window position={[0.75, 1.65, -7.96]} width={2.2} />
      <Bookshelf position={[3.2, 0, -7.78]} seed={5} />

      {/* Parede da esquerda: janelas, frases, estante e porta */}
      <Window position={[-11.96, 1.65, -5.5]} rotation={Math.PI / 2} />
      <Window position={[-11.96, 1.65, -2.3]} rotation={Math.PI / 2} />
      <QuotePanel position={[-11.97, 1.7, 0.1]} rotation={Math.PI / 2} width={1.3} height={0.975} lines={['Disciplina', 'é liberdade.']} size={104} />
      <Bookshelf position={[-11.78, 0, 2.25]} rotation={Math.PI / 2} width={2.1} seed={3} />
      <QuotePanel position={[-11.97, 1.75, 4.45]} rotation={Math.PI / 2} width={1.2} height={0.9} lines={['Grandes objetivos', 'exigem', 'disciplina.']} size={96} />

      {/* Porta de entrada (por aqui vão chegar as novas contratações!) */}
      <group position={[-11.96, 0, 6]} rotation-y={Math.PI / 2}>
        <Box args={[1.3, 2.35, 0.06]} position={[0, 1.18, 0]} color="#0b0c0f" />
        <RBox args={[1.1, 2.2, 0.05]} radius={0.01} position={[0, 1.1, 0.03]} color="#3a2416" roughness={0.6} />
        <Box args={[0.03, 0.03, 0.14]} position={[0.42, 1.05, 0.08]} color="#c0c4cc" metalness={0.9} roughness={0.2} />
        <Neon args={[1.3, 0.015, 0.015]} position={[0, 2.36, 0.04]} color={DOOR_LED} intensity={2} />
        <Neon args={[0.015, 2.35, 0.015]} position={[-0.65, 1.18, 0.04]} color={DOOR_LED} intensity={1.6} />
        <Neon args={[0.015, 2.35, 0.015]} position={[0.65, 1.18, 0.04]} color={DOOR_LED} intensity={1.6} />
      </group>
      <RBox args={[1.6, 0.02, 1]} radius={0.01} position={[-11.3, 0.012, 6]} color="#1f2125" roughness={1} />

      {/* Sala de reuniões */}
      <GlassWall args={[6.6, 2.6, 0.04]} position={[8.7, 1.3, -1]} />
      <GlassWall args={[0.04, 2.6, 7]} position={[4.1, 1.3, -4.5]} />
      <MeetingTable position={[8, 0, -4.5]} />
      <MeetingScreen position={[8, 1.65, -7.95]} />
      <Window position={[5.4, 1.65, -7.96]} width={1.8} />
      <Window position={[10.6, 1.65, -7.96]} width={1.8} />
      <Plant position={[11.3, 0, -7.3]} seed={2} />

      {/* Zona de descanso */}
      <RBox args={[5, 0.02, 3.4]} radius={0.01} position={[8, 0.012, 5.2]} color="#4a4744" roughness={1} />
      <Sofa position={[8, 0, 6.9]} />
      <Sofa position={[5.3, 0, 5.2]} rotation={-Math.PI / 2} width={1.6} />
      <Sofa position={[10.75, 0, 5.2]} rotation={Math.PI / 2} width={1.05} />
      <RBox args={[1.4, 0.06, 0.8]} radius={0.015} position={[8, 0.4, 5.2]} color="#0f1013" roughness={0.25} metalness={0.4} />
      <Box args={[1.2, 0.36, 0.6]} position={[8, 0.19, 5.2]} color="#17191d" />
      <Plant position={[8.25, 0.43, 5.15]} scale={0.35} seed={21} />
      <FloorLamp position={[10.9, 0, 6.7]} />
      <Kitchen position={[10.3, 0, 1.25]} />
      <WaterCooler position={[8.2, 0, 1.25]} />
      <Plant position={[11.3, 0, 7.3]} scale={1.3} seed={4} />
      <Plant position={[4.8, 0, 7.3]} seed={8} />

      {/* Sala de operações: painel holográfico e plantas */}
      <HoloPanel position={[-6, 0, 5.6]} />
      <Plant position={[-11.3, 0, -7.3]} scale={1.2} seed={1} />
      <Plant position={[0.6, 0, -7.4]} seed={6} />
      <Plant position={[-11.3, 0, 7.4]} seed={11} />
      <Plant position={[1.5, 0, 3.5]} scale={1.1} seed={13} />
    </group>
  )
}
