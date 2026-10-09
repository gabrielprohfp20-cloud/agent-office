// Minimapa: planta do escritório vista de cima, com um ponto por agente.
// Clicar num sítio leva a câmara até lá.
import { useEffect, useRef } from 'react'
import { DESKS } from '../data/office'
import { runtime } from '../sim/movement'
import { useOffice } from '../sim/store'
import { cameraBus } from '../scene/cameraBus'

const W = 216
const H = 144
// escritório: x de -12 a 12, z de -8 a 8
const toMap = (x, z) => [((x + 12) / 24) * W, ((z + 8) / 16) * H]
const toWorld = (mx, my) => [(mx / W) * 24 - 12, (my / H) * 16 - 8]

function draw(g, agents, selected) {
  g.clearRect(0, 0, W, H)
  // chão
  g.fillStyle = 'rgba(148, 163, 184, 0.10)'
  g.fillRect(0, 0, W, H)
  // paredes (fundo e esquerda)
  g.fillStyle = 'rgba(214, 230, 255, 0.55)'
  g.fillRect(0, 0, W, 2)
  g.fillRect(0, 0, 2, H)
  // sala de reuniões (vidro)
  const [mx1, my1] = toMap(4.1, -8)
  const [mx2, my2] = toMap(12, -1)
  g.strokeStyle = 'rgba(103, 232, 249, 0.5)'
  g.strokeRect(mx1, my1, mx2 - mx1, my2 - my1)
  // mesa de reuniões
  rect(g, 6.4, -5.2, 9.6, -3.8, 'rgba(148, 163, 184, 0.45)')
  // zona de descanso: tapete, sofás, cozinha
  rect(g, 5.5, 3.5, 10.5, 6.9, 'rgba(168, 85, 247, 0.15)')
  rect(g, 6.9, 6.55, 9.1, 7.35, 'rgba(148, 163, 184, 0.45)')
  rect(g, 8.8, 0.9, 11.8, 1.6, 'rgba(148, 163, 184, 0.45)')
  // painel holográfico
  rect(g, -7.1, 5.45, -4.9, 5.75, 'rgba(56, 189, 248, 0.7)')
  // mesas de trabalho
  for (const d of DESKS) {
    const [x, , z] = d.position
    rect(g, x - 0.85, z - 0.4, x + 0.85, z + 0.4, 'rgba(148, 163, 184, 0.45)')
  }
  // porta
  rect(g, -12, 5.4, -11.7, 6.6, 'rgba(96, 165, 250, 0.9)')

  // zona para onde a câmara está a olhar
  const [cx, cy] = toMap(cameraBus.target[0], cameraBus.target[1])
  g.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  g.setLineDash([3, 3])
  g.strokeRect(cx - 26, cy - 17, 52, 34)
  g.setLineDash([])

  // agentes
  for (const a of agents) {
    const rt = runtime[a.id]
    if (!rt) continue
    const [x, y] = toMap(rt.x, rt.z)
    if (a.id === selected) {
      g.strokeStyle = '#fff'
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(x, y, 6, 0, Math.PI * 2)
      g.stroke()
      g.lineWidth = 1
    }
    g.fillStyle = a.color
    g.beginPath()
    g.arc(x, y, 3.5, 0, Math.PI * 2)
    g.fill()
  }
}

function rect(g, x1, z1, x2, z2, color) {
  const [a, b] = toMap(x1, z1)
  const [c, d] = toMap(x2, z2)
  g.fillStyle = color
  g.fillRect(a, b, c - a, d - b)
}

export default function Minimap({ selected, onSelect }) {
  const canvas = useRef()
  const agents = useOffice((s) => s.agents)

  // redesenha ~10 vezes por segundo (os agentes andam devagar, chega bem)
  useEffect(() => {
    const g = canvas.current.getContext('2d')
    const id = setInterval(() => draw(g, agents, selected), 100)
    draw(g, agents, selected)
    return () => clearInterval(id)
  }, [agents, selected])

  const onClick = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W
    const my = ((e.clientY - r.top) / r.height) * H
    const [x, z] = toWorld(mx, my)
    // clicou perto de um agente? seleciona-o; senão, leva a câmara até lá
    const hit = agents.find((a) => {
      const rt = runtime[a.id]
      return rt && Math.hypot(rt.x - x, rt.z - z) < 0.8
    })
    if (hit) onSelect(hit.id)
    else {
      onSelect(null)
      cameraBus.focus = [x, z]
    }
  }

  return (
    <div className="panel minimap">
      <canvas ref={canvas} width={W} height={H} onClick={onClick} title="Clique para levar a câmara até lá" />
    </div>
  )
}
