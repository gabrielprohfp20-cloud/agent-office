// Mobília do escritório de trading: preto, elegante, com luz indireta discreta.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import { Box, RBox, Cyl, Neon, Screen, seeded } from './primitives'
import {
  chartTexture, holoTexture, quoteTexture,
  roundClockTexture, skylineDayTexture, skylineTexture, watchlistTexture,
} from './screens'
import { getDaylight } from '../sim/daylight'

const BLACK = '#121418'
const METAL = '#1c1f25'
const LED = '#9cc4ff' // luz indireta branca-azulada
const WARM = '#ffcf8a' // luz quente

// ---------- Monitor ----------
function Monitor({ position, rotation = 0, texture, width = 0.56, height = 0.35 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <Box args={[0.2, 0.015, 0.12]} position={[0, 0.008, 0]} color={METAL} metalness={0.7} roughness={0.3} />
      <Box args={[0.03, 0.22, 0.03]} position={[0, 0.12, -0.02]} color={METAL} metalness={0.7} roughness={0.3} />
      <RBox args={[width + 0.03, height + 0.03, 0.03]} radius={0.01} position={[0, 0.38, 0]} color="#08090c" roughness={0.3} />
      <Screen args={[width, height]} texture={texture} brightness={0.85} position={[0, 0.38, 0.016]} />
    </group>
  )
}

// ---------- Mesa de trading com 3 monitores ----------
const SIDE = { BTC: 'ETH', ETH: 'BTC', SPX: 'NDX', NDX: 'SPX', EUR: 'XAU', XAU: 'EUR', AAPL: 'TSLA', TSLA: 'AAPL' }

export function Desk({ position, rotation = 0, symbol = 'BTC' }) {
  const main = useMemo(() => chartTexture(symbol), [symbol])
  const side = useMemo(() => chartTexture(SIDE[symbol] || 'SPX'), [symbol])
  const watch = useMemo(() => watchlistTexture(), [])
  return (
    <group position={position} rotation-y={rotation}>
      <RBox shadow args={[1.75, 0.05, 0.82]} radius={0.012} position={[0, 0.75, 0]} color={BLACK} roughness={0.35} metalness={0.3} />
      {/* luz indireta por baixo do tampo */}
      <Neon args={[1.6, 0.008, 0.008]} position={[0, 0.72, 0.38]} color={LED} intensity={1.3} />
      {[-0.82, 0.82].map((x) => (
        <Box shadow key={x} args={[0.05, 0.73, 0.74]} position={[x, 0.365, 0]} color={BLACK} roughness={0.4} metalness={0.3} />
      ))}
      <RBox args={[0.42, 0.55, 0.62]} radius={0.015} position={[0.5, 0.3, -0.04]} color="#17191e" roughness={0.5} />
      <Monitor position={[-0.6, 0.775, -0.12]} rotation={0.4} texture={side} />
      <Monitor position={[0, 0.775, -0.24]} texture={main} width={0.64} height={0.38} />
      <Monitor position={[0.6, 0.775, -0.12]} rotation={-0.4} texture={watch} />
      <RBox args={[0.46, 0.02, 0.15]} radius={0.006} position={[0, 0.785, 0.2]} color="#0b0c0f" />
      <RBox args={[0.06, 0.02, 0.1]} radius={0.01} position={[0.36, 0.785, 0.2]} color="#0b0c0f" />
      <Cyl args={[0.04, 0.035, 0.1, 16]} position={[-0.68, 0.825, 0.18]} color="#e5e7eb" roughness={0.3} />
    </group>
  )
}

// ---------- Cadeira gamer preta ----------
export function Chair({ position, rotation = 0, color = '#16181d' }) {
  return (
    <group position={position} rotation-y={rotation}>
      <Cyl args={[0.28, 0.3, 0.05, 5]} position={[0, 0.05, 0]} color={METAL} metalness={0.7} roughness={0.3} />
      <Cyl args={[0.03, 0.03, 0.4, 8]} position={[0, 0.27, 0]} color={METAL} metalness={0.8} roughness={0.25} />
      <RBox shadow args={[0.5, 0.08, 0.5]} radius={0.035} position={[0, 0.47, 0]} color={color} roughness={0.55} />
      <RBox shadow args={[0.48, 0.68, 0.08]} radius={0.04} position={[0, 0.88, 0.25]} color={color} roughness={0.55} />
      <RBox args={[0.3, 0.14, 0.06]} radius={0.03} position={[0, 1.15, 0.22]} color="#22252c" roughness={0.55} />
    </group>
  )
}

// ---------- Planta em vaso quadrado ----------
export function Plant({ position, scale = 1, seed = 1 }) {
  // Folhas compridas a sair do centro, umas mais em pé e outras mais abertas
  const leaves = useMemo(() => {
    const r = seeded(seed)
    return Array.from({ length: 15 }, (_, i) => ({
      ang: (i / 15) * Math.PI * 2 * 2 + r() * 0.6, // 2 voltas em espiral
      elev: 0.25 + r() * 1.05, // inclinação para cima
      len: 0.32 + r() * 0.3,
      h: 0.48 + r() * 0.45,
      c: ['#2f7a3e', '#3c8f4a', '#25632f', '#4aa35a', '#367f44'][Math.floor(r() * 5)],
    }))
  }, [seed])
  return (
    <group position={position} scale={scale}>
      <RBox shadow args={[0.42, 0.45, 0.42]} radius={0.03} position={[0, 0.225, 0]} color="#1a1c21" roughness={0.6} />
      <Box args={[0.36, 0.02, 0.36]} position={[0, 0.445, 0]} color="#2b2118" shadow={false} />
      <Cyl args={[0.015, 0.025, 0.55, 6]} position={[0, 0.7, 0]} color="#3b5a2a" />
      {/* "Instancing": todas as folhas são desenhadas de uma só vez (muito mais leve) */}
      <Instances limit={leaves.length}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshStandardMaterial roughness={0.6} />
        {leaves.map((l, i) => (
          <group key={i} position={[0, l.h, 0]} rotation-y={l.ang}>
            <group rotation-x={-l.elev}>
              <Instance position={[0, 0, l.len / 2]} scale={[0.07, 0.012, l.len / 2]} color={l.c} />
            </group>
          </group>
        ))}
      </Instances>
    </group>
  )
}

// ---------- Estante com livros e luz quente em cada prateleira ----------
export function Bookshelf({ position, rotation = 0, seed = 1, width = 1.4 }) {
  const items = useMemo(() => {
    const r = seeded(seed)
    const colors = ['#d6cbb5', '#8a7f6e', '#2a2d33', '#4b5563', '#e5e1d8', '#6b4f3a', '#1f3a5f']
    const out = []
    for (let shelf = 0; shelf < 4; shelf++) {
      let x = -width / 2 + 0.08
      while (x < width / 2 - 0.12) {
        if (r() > 0.82) {
          // objeto decorativo (vaso/esfera)
          out.push({ kind: 'deco', x: x + 0.07, y: 0.14 + shelf * 0.5, c: r() > 0.5 ? '#e5e7eb' : '#3c8f4a' })
          x += 0.2
          continue
        }
        const w = 0.04 + r() * 0.05
        const h = 0.22 + r() * 0.12
        out.push({ kind: 'book', x: x + w / 2, y: 0.08 + shelf * 0.5 + h / 2, w, h, c: colors[Math.floor(r() * colors.length)] })
        x += w + 0.008
      }
    }
    return out
  }, [seed, width])
  return (
    <group position={position} rotation-y={rotation}>
      <Box args={[width, 2.1, 0.04]} position={[0, 1.05, -0.18]} color="#0f1114" />
      {[-width / 2, width / 2].map((x) => (
        <Box shadow key={x} args={[0.04, 2.1, 0.4]} position={[x, 1.05, 0]} color="#16181c" />
      ))}
      {[0.06, 0.56, 1.06, 1.56, 2.08].map((y, i) => (
        <group key={i}>
          <Box args={[width, 0.04, 0.4]} position={[0, y, 0]} color="#16181c" />
          {i > 0 && <Neon args={[width - 0.08, 0.006, 0.01]} position={[0, y - 0.025, 0.12]} color={WARM} intensity={1.6} />}
        </group>
      ))}
      {/* "Instancing": todos os livros de uma vez, e todos os enfeites de uma vez */}
      <Instances limit={items.length}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
        {items.filter((b) => b.kind === 'book').map((b, i) => (
          <Instance key={i} position={[b.x, b.y, 0]} scale={[b.w, b.h, 0.26]} color={b.c} />
        ))}
      </Instances>
      <Instances limit={items.length}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshStandardMaterial roughness={0.4} />
        {items.filter((b) => b.kind === 'deco').map((b, i) => (
          <Instance key={i} position={[b.x, b.y, 0]} color={b.c} />
        ))}
      </Instances>
    </group>
  )
}

// ---------- Sofá de couro preto com luz por baixo ----------
export function Sofa({ position, rotation = 0, width = 2.2, glow = '#3b82f6' }) {
  const leather = '#15171b'
  return (
    <group position={position} rotation-y={rotation}>
      <RBox shadow args={[width, 0.36, 0.9]} radius={0.06} position={[0, 0.3, 0]} color={leather} roughness={0.45} metalness={0.1} />
      <RBox shadow args={[width, 0.55, 0.24]} radius={0.08} position={[0, 0.66, 0.33]} color={leather} roughness={0.45} metalness={0.1} />
      <RBox args={[0.2, 0.42, 0.9]} radius={0.06} position={[-width / 2 + 0.1, 0.5, 0]} color={leather} roughness={0.45} />
      <RBox args={[0.2, 0.42, 0.9]} radius={0.06} position={[width / 2 - 0.1, 0.5, 0]} color={leather} roughness={0.45} />
      {[-0.45, 0.45].map((x, i) => (
        <RBox key={i} args={[width / 2 - 0.26, 0.11, 0.62]} radius={0.05} position={[x * (width / 2.2), 0.53, -0.05]} color="#1c1f24" roughness={0.4} />
      ))}
      <Neon args={[width - 0.1, 0.01, 0.01]} position={[0, 0.1, -0.46]} color={glow} intensity={1.8} />
    </group>
  )
}

// ---------- Luminária de chão ----------
export function FloorLamp({ position }) {
  return (
    <group position={position}>
      <Cyl args={[0.16, 0.16, 0.03, 20]} position={[0, 0.015, 0]} color={METAL} metalness={0.7} />
      <Cyl args={[0.012, 0.012, 1.55, 8]} position={[0, 0.8, 0]} color={METAL} metalness={0.7} />
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.18, 0.16, 24, 1, true]} />
        <meshStandardMaterial color="#e5e7eb" side={THREE.DoubleSide} roughness={0.5} />
      </mesh>
      <Neon geometry="cyl" args={[0.1, 0.1, 0.01, 16]} position={[0, 1.53, 0]} color={WARM} intensity={2.5} />    </group>
  )
}

// ---------- Mesa de reuniões ----------
export function MeetingTable({ position }) {
  const chairs = [
    [-1.0, 1.05, Math.PI], [0, 1.05, Math.PI], [1.0, 1.05, Math.PI],
    [-1.0, -1.05, 0], [0, -1.05, 0], [1.0, -1.05, 0],
  ]
  return (
    <group position={position}>
      <RBox shadow args={[3.2, 0.06, 1.4]} radius={0.02} position={[0, 0.75, 0]} color="#1a1c20" roughness={0.25} metalness={0.4} />
      <Box args={[0.12, 0.72, 0.8]} position={[-1.1, 0.36, 0]} color={METAL} metalness={0.5} />
      <Box args={[0.12, 0.72, 0.8]} position={[1.1, 0.36, 0]} color={METAL} metalness={0.5} />
      {/* portátil aberto */}
      <group position={[-0.7, 0.78, 0.15]} rotation-y={0.25}>
        <RBox args={[0.34, 0.015, 0.24]} radius={0.006} color="#9ca3af" metalness={0.8} roughness={0.3} />
        <group position={[0, 0.01, -0.12]} rotation-x={-1.25}>
          <RBox args={[0.34, 0.012, 0.22]} radius={0.006} position={[0, 0, -0.11]} color="#9ca3af" metalness={0.8} roughness={0.3} />
        </group>
      </group>
      <Cyl args={[0.09, 0.09, 0.05, 20]} position={[0.4, 0.8, -0.1]} color="#0b0c0f" />
      {chairs.map(([x, z, r], i) => (
        <Chair key={i} position={[x, 0, -z]} rotation={r} color="#1a1c21" />
      ))}
    </group>
  )
}

// ---------- Ecrã de parede (gráfico) ----------
export function WallScreen({ position, rotation = 0, width = 2.4, height = 1.35, texture }) {
  return (
    <group position={position} rotation-y={rotation}>
      <RBox args={[width + 0.08, height + 0.08, 0.05]} radius={0.015} color="#050608" />
      <Screen args={[width, height]} texture={texture} brightness={0.9} position={[0, 0, 0.027]} />
    </group>
  )
}

export function MeetingScreen({ position }) {
  const tex = useMemo(() => chartTexture('NDX'), [])
  return <WallScreen position={position} texture={tex} />
}

// ---------- Ecrã holográfico de vidro sobre uma plataforma ----------
export function HoloPanel({ position, rotation = 0 }) {
  const tex = useMemo(() => holoTexture(), [])
  return (
    <group position={position} rotation-y={rotation}>
      <RBox args={[2.8, 0.05, 1.7]} radius={0.02} position={[0, 0.025, 0.1]} color="#0e1014" roughness={0.3} metalness={0.4} />
      <Neon args={[2.8, 0.01, 0.01]} position={[0, 0.05, 0.955]} color={LED} intensity={2} />
      <Neon args={[0.01, 0.01, 1.7]} position={[-1.4, 0.05, 0.1]} color={LED} intensity={2} />
      <Neon args={[0.01, 0.01, 1.7]} position={[1.4, 0.05, 0.1]} color={LED} intensity={2} />
      {/* suportes finos de metal */}
      {[-0.9, 0.9].map((x) => (
        <Box key={x} args={[0.04, 0.5, 0.06]} position={[x, 0.3, 0]} color="#2a2d33" metalness={0.8} roughness={0.25} />
      ))}
      {/* vidro escurecido (dá contraste ao gráfico, mesmo com o chão claro atrás) */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.1, 1.35, 0.02]} />
        <meshStandardMaterial color="#0b1a2b" transparent opacity={0.6} roughness={0.1} metalness={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.2, 0.012]}>
        <planeGeometry args={[2.0, 1.25]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* moldura de luz fina */}
      <Neon args={[2.12, 0.01, 0.025]} position={[0, 1.875, 0]} color={LED} intensity={1.6} />
      <Neon args={[2.12, 0.01, 0.025]} position={[0, 0.525, 0]} color={LED} intensity={1.6} />
    </group>
  )
}

// ---------- Cozinha preta com luz quente ----------
export function Kitchen({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <RBox shadow args={[3, 0.9, 0.65]} radius={0.02} position={[0, 0.45, 0]} color="#16181c" roughness={0.45} />
      <RBox args={[3.05, 0.05, 0.7]} radius={0.015} position={[0, 0.92, 0]} color="#0b0c0f" roughness={0.2} metalness={0.4} />
      {[-1, 0, 1].map((x, i) => (
        <Box key={i} args={[0.01, 0.7, 0.01]} position={[x * 0.75 + 0.37, 0.45, 0.33]} color="#2b2e35" shadow={false} />
      ))}
      <Neon args={[2.9, 0.008, 0.01]} position={[0, 0.06, 0.33]} color={WARM} intensity={1.6} />
      <group position={[-0.6, 0.95, -0.05]}>
        <RBox args={[0.4, 0.5, 0.35]} radius={0.03} position={[0, 0.25, 0]} color="#2a2d33" metalness={0.6} roughness={0.3} />
        <Box args={[0.22, 0.06, 0.01]} position={[0, 0.38, 0.18]} color="#111" />
        <Cyl args={[0.05, 0.045, 0.09, 16]} position={[0, 0.06, 0.1]} color="#f8fafc" />
      </group>
      <group position={[0.7, 0.95, 0]}>
        <Cyl args={[0.2, 0.12, 0.08, 20]} position={[0, 0.04, 0]} color="#d6d3d1" />
        {[[-0.07, 0.03, '#ef4444'], [0.06, -0.04, '#f97316'], [0.02, 0.07, '#84cc16']].map(([x, z, c], i) => (
          <mesh key={i} position={[x, 0.12, z]} castShadow>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color={c} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function WaterCooler({ position }) {
  return (
    <group position={position}>
      <RBox args={[0.38, 1.0, 0.38]} radius={0.03} position={[0, 0.5, 0]} color="#1f2228" metalness={0.4} />
      <mesh position={[0, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.42, 24]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.5} roughness={0.1} />
      </mesh>
    </group>
  )
}

// ---------- Janela grande com a cidade à noite ----------
export function Window({ position, rotation = 0, width = 2.6, height = 2.1 }) {
  const tex = useMemo(() => skylineTexture(), [])
  const dayTex = useMemo(() => skylineDayTexture(), [])
  const dayMat = useRef()
  // a vista de dia aparece por cima da de noite, mais ou menos transparente conforme a hora
  useFrame(() => {
    if (dayMat.current) dayMat.current.opacity = getDaylight()
  })
  return (
    <group position={position} rotation-y={rotation}>
      <Box args={[width + 0.1, height + 0.1, 0.06]} color="#0b0c0f" metalness={0.5} />
      <Screen args={[width, height]} texture={tex} brightness={0.75} position={[0, 0, 0.032]} />
      <mesh position={[0, 0, 0.034]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={dayMat} map={dayTex} transparent opacity={0} toneMapped={false} color={[0.95, 0.95, 0.95]} />
      </mesh>
      <Box args={[0.035, height, 0.03]} position={[0, 0, 0.045]} color="#0b0c0f" shadow={false} />
      <Box args={[width, 0.035, 0.03]} position={[0, height * 0.12, 0.045]} color="#0b0c0f" shadow={false} />
    </group>
  )
}

// ---------- Quadro com frase motivacional ----------
export function QuotePanel({ position, rotation = 0, lines, width = 2.4, height = 1.8, ...opts }) {
  const tex = useMemo(() => quoteTexture(lines, opts), [lines, opts])
  return (
    <group position={position} rotation-y={rotation}>
      <RBox args={[width + 0.06, height + 0.06, 0.05]} radius={0.015} color="#08090b" />
      <Screen args={[width, height]} texture={tex} brightness={1.05} position={[0, 0, 0.027]} />
    </group>
  )
}

// ---------- Relógio redondo ----------
export function RoundClock({ position, rotation = 0, radius = 0.38 }) {
  const tex = useMemo(() => roundClockTexture(), [])
  return (
    <mesh position={position} rotation-y={rotation}>
      <circleGeometry args={[radius, 48]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}
