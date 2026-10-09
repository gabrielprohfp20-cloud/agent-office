// Junta tudo: luzes, câmara, escritório, mesas e agentes.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import Office from './Office'
import Agent from './Agent'
import SimRunner from './SimRunner'
import { Chair, Desk } from './Furniture'
import { DESKS, seatFor } from '../data/office'
import { useOffice } from '../sim/store'
import { runtime } from '../sim/movement'
import { REFLECT_LAYER } from './layers'
import { getDaylight } from '../sim/daylight'
import { cameraBus } from './cameraBus'

const UP = new THREE.Vector3(0, 1, 0)
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// Quando um agente é selecionado, a câmara aproxima-se e segue-o
function CameraFollow({ selected }) {
  const controls = useThree((s) => s.controls)
  const delta = useMemo(() => new THREE.Vector3(), [])
  const zoomUntil = useRef(0)

  useEffect(() => {
    zoomUntil.current = performance.now() + 1500
  }, [selected])

  useFrame(({ camera }, dt) => {
    const rt = selected && runtime[selected]
    if (!controls || !rt) return
    delta.set(rt.x, 0.8, rt.z).sub(controls.target).multiplyScalar(Math.min(1, dt * 3))
    controls.target.add(delta)
    camera.position.add(delta)
    // aproximar só durante o primeiro segundo e meio (depois o utilizador controla o zoom)
    const dist = camera.position.distanceTo(controls.target)
    if (performance.now() < zoomUntil.current && dist > 11) {
      const k = 1 - Math.min(1, dt * 2.5) * (1 - 11 / dist)
      camera.position.sub(controls.target).multiplyScalar(k).add(controls.target)
    }
  })
  return null
}

// Minimapa: informa para onde a câmara olha e leva a câmara ao ponto clicado
function CameraMinimap() {
  const controls = useThree((s) => s.controls)
  const delta = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    if (!controls) return
    cameraBus.target[0] = controls.target.x
    cameraBus.target[1] = controls.target.z
    const f = cameraBus.focus
    if (!f) return
    delta.set(f[0], 0, f[1]).sub(controls.target).setY(0)
    if (delta.length() < 0.05) {
      cameraBus.focus = null // chegou
      return
    }
    delta.multiplyScalar(Math.min(1, dt * 5))
    controls.target.add(delta)
    camera.position.add(delta)
  })
  return null
}

// Teclado: WASD / setas movem a câmara, Q/E rodam, Shift acelera
function CameraKeys({ onManualMove }) {
  const controls = useThree((s) => s.controls)
  const keys = useRef({})
  const v = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), move: new THREE.Vector3(), off: new THREE.Vector3() }), [])

  useEffect(() => {
    const down = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      keys.current[e.code] = true
      if (MOVE_KEYS.includes(e.code)) {
        e.preventDefault()
        onManualMove()
      }
    }
    const up = (e) => { keys.current[e.code] = false }
    const clear = () => { keys.current = {} }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [onManualMove])

  useFrame(({ camera }, dt) => {
    if (!controls) return
    const k = keys.current
    const forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    const turn = (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0)

    if (forward || strafe) {
      const speed = (k.ShiftLeft || k.ShiftRight ? 18 : 9) * dt
      camera.getWorldDirection(v.fwd)
      v.fwd.y = 0
      v.fwd.normalize()
      v.right.crossVectors(v.fwd, UP).normalize()
      v.move.copy(v.fwd).multiplyScalar(forward * speed).addScaledVector(v.right, strafe * speed)
      // não deixar a câmara fugir para longe do escritório
      const t = controls.target
      v.move.x = THREE.MathUtils.clamp(t.x + v.move.x, -13, 13) - t.x
      v.move.z = THREE.MathUtils.clamp(t.z + v.move.z, -9, 9) - t.z
      t.add(v.move)
      camera.position.add(v.move)
    }
    if (turn) {
      v.off.copy(camera.position).sub(controls.target).applyAxisAngle(UP, turn * dt * 1.8)
      camera.position.copy(controls.target).add(v.off)
    }
  })
  return null
}

// Objetos que nunca se mexem: calcula a posição uma vez e "congela"
// (sem isto, o motor recalcula a posição de centenas de móveis a cada frame)
function Static({ children }) {
  const ref = useRef()
  useLayoutEffect(() => {
    ref.current.traverse((o) => {
      o.updateMatrix()
      o.matrixAutoUpdate = false
    })
    ref.current.updateMatrixWorld(true)
  }, [])
  return <group ref={ref}>{children}</group>
}

// O reflexo do chão só mostra o que está na REFLECT_LAYER (os agentes).
// Antes de cada desenho, se a câmara for a do "espelho", limitamos o que ela vê.
function ReflectOnlyAgents() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    // as luzes também precisam de estar na camada, senão os reflexos ficam pretos
    scene.traverse((o) => o.isLight && o.layers.enable(REFLECT_LAYER))
    scene.onBeforeRender = (_gl, _scene, cam) => {
      // a câmara do espelho é uma câmara solta (sem "pai") diferente da principal
      if (cam !== camera && cam.isPerspectiveCamera && !cam.parent) cam.layers.set(REFLECT_LAYER)
    }
    return () => { scene.onBeforeRender = () => {} }
  }, [scene, camera])
  return null
}

// Ciclo dia/noite: ajusta o fundo e as luzes conforme a hora real.
// De dia: mais luz geral e um sol mais forte; as lâmpadas ficam mais fracas.
const NIGHT = { bg: new THREE.Color('#1b1d22'), hemi: 1.0, sun: 1.3, lamp: 1 }
const DAY = { bg: new THREE.Color('#353b45'), hemi: 1.55, sun: 2.5, lamp: 0.45 }

function DayNight() {
  const scene = useThree((s) => s.scene)
  const last = useRef(-1)
  useFrame(() => {
    const d = getDaylight()
    if (Math.abs(d - last.current) < 0.002) return // só atualiza quando muda
    last.current = d
    const mix = (a, b) => a + (b - a) * d
    if (scene.background?.isColor) scene.background.copy(NIGHT.bg).lerp(DAY.bg, d)
    if (scene.fog) scene.fog.color.copy(NIGHT.bg).lerp(DAY.bg, d)
    scene.traverse((o) => {
      if (!o.isLight) return
      if (o.userData.base === undefined) o.userData.base = o.intensity
      if (o.name === 'hemi') o.intensity = o.userData.base * mix(NIGHT.hemi, DAY.hemi)
      else if (o.name === 'sun') o.intensity = o.userData.base * mix(NIGHT.sun, DAY.sun) / NIGHT.sun
      else if (o.name === 'lamp') o.intensity = o.userData.base * mix(NIGHT.lamp, DAY.lamp)
    })
  })
  return null
}

// As sombras só são redesenhadas a cada 2 frames (os agentes andam devagar: não se nota)
function ShadowThrottle() {
  const gl = useThree((s) => s.gl)
  const frame = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => { gl.shadowMap.autoUpdate = true }
  }, [gl])
  useFrame(() => {
    if (frame.current++ % 2 === 0) gl.shadowMap.needsUpdate = true
  })
  return null
}

export default function Scene({ selected, onSelect }) {
  const agents = useOffice((s) => s.agents)
  const stopFollowing = useCallback(() => onSelect(null), [onSelect])

  return (
    <>
      <color attach="background" args={['#1b1d22']} />
      <fog attach="fog" args={['#1b1d22', 45, 95]} />
      <SimRunner />

      {/* Luzes: luz geral + "sol" + luzes quentes por zona (a intensidade muda com a hora, ver DayNight) */}
      <DayNight />
      <hemisphereLight name="hemi" args={['#e3ecff', '#3a3a40', 1.0]} />
      <directionalLight
        name="sun"
        position={[12, 20, 10]}
        intensity={1.3}
        color="#fff1e0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      {/* Cada luz extra custa desempenho: usamos só 2 luzes quentes */}
      <pointLight name="lamp" position={[-5.5, 3.4, -1.5]} color="#ffe0bd" intensity={22} distance={16} decay={1.1} />
      <pointLight name="lamp" position={[8, 3.2, 0]} color="#ffdcb0" intensity={16} distance={14} decay={1.1} />
      <ShadowThrottle />
      <ReflectOnlyAgents />

      {/* Ambiente para reflexos suaves */}
      <Environment resolution={128}>
        <Lightformer intensity={0.8} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#fff4e6" />
        <Lightformer intensity={0.6} color="#bcd7ff" position={[0, 3, -10]} scale={[20, 2, 1]} />
        <Lightformer intensity={0.4} color="#ffd9a8" position={[10, 3, 10]} rotation-y={-Math.PI / 4} scale={[10, 2, 1]} />
      </Environment>

      <Static>
        <Office />

        {/* Mesas de trading e cadeiras */}
        {DESKS.map((desk) => {
          const owner = agents.find((a) => a.desk === desk.id)
          const seat = seatFor(desk)
          return (
            <group key={desk.id}>
              <Desk position={desk.position} rotation={desk.rotation} symbol={owner?.symbol} />
              <Chair position={seat.position} rotation={seat.rotation} />
            </group>
          )
        })}
      </Static>

      {agents.map((agent) => (
        <Agent key={agent.id} agent={agent} selected={selected === agent.id} onSelect={onSelect} />
      ))}

      <CameraFollow selected={selected} />
      <CameraKeys onManualMove={stopFollowing} />
      <CameraMinimap />
      {/* Rato: arrastar para rodar, scroll para zoom, botão direito para mover */}
      <OrbitControls
        makeDefault
        target={[0.5, 0, 0.5]}
        enableDamping
        zoomSpeed={1.6}
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={0.3}
      />
    </>
  )
}
