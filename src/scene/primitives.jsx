// Peças básicas reutilizáveis (caixas, caixas arredondadas, cilindros).
// Por defeito NÃO projetam sombra (cada sombra obriga a desenhar o objeto 2 vezes);
// use shadow={true} só nos objetos grandes, onde a sombra se nota.
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

// Tira de neon: brilha com o efeito "bloom" (intensidade > 1 = brilho)
export function Neon({ args = [1, 0.02, 0.02], color = '#22d3ee', intensity = 3, geometry = 'box', ...props }) {
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(intensity), [color, intensity])
  return (
    <mesh {...props}>
      {geometry === 'box' ? <boxGeometry args={args} /> : <cylinderGeometry args={args} />}
      <meshBasicMaterial color={c} toneMapped={false} />
    </mesh>
  )
}

// Ecrã: mostra uma textura sem ser afetado pela luz da cena
export function Screen({ args, texture, brightness = 0.9, ...props }) {
  const c = useMemo(() => new THREE.Color(brightness, brightness, brightness), [brightness])
  return (
    <mesh {...props}>
      <planeGeometry args={args} />
      <meshBasicMaterial map={texture} color={c} toneMapped={false} />
    </mesh>
  )
}

export function Box({ args = [1, 1, 1], color = '#ffffff', roughness = 0.8, metalness = 0, emissive, emissiveIntensity = 0, transparent, opacity = 1, shadow = false, ...props }) {
  return (
    <mesh castShadow={shadow} receiveShadow {...props}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color} roughness={roughness} metalness={metalness}
        emissive={emissive || '#000000'} emissiveIntensity={emissiveIntensity}
        transparent={transparent} opacity={opacity}
      />
    </mesh>
  )
}

export function RBox({ args = [1, 1, 1], radius = 0.04, color = '#ffffff', roughness = 0.7, metalness = 0, shadow = false, ...props }) {
  return (
    <RoundedBox args={args} radius={radius} smoothness={2} castShadow={shadow} receiveShadow {...props}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </RoundedBox>
  )
}

export function Cyl({ args = [0.5, 0.5, 1, 24], color = '#ffffff', roughness = 0.6, metalness = 0, shadow = false, ...props }) {
  return (
    <mesh castShadow={shadow} receiveShadow {...props}>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

// Gerador de números pseudo-aleatórios com "semente":
// dá sempre o mesmo resultado, para os livros e ecrãs não mudarem a cada recarga.
export function seeded(seed) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
