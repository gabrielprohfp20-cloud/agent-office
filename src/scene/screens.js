// Texturas desenhadas num <canvas> 2D: ecrãs com gráficos, quadros com frases,
// relógio, piso de pedra, parede de betão, vista da cidade e manchas de luz.
// As texturas "vivas" são redesenhadas sempre que o mercado simulado muda.
import * as THREE from 'three'
import { SYMBOLS, changePct, fmtPrice, market, onMarket } from '../sim/market'
import { seeded } from './primitives'

const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace'
const SANS = '"Space Grotesk", "Inter", system-ui, sans-serif'
const UP = '#22c55e'
const DOWN = '#ef4444'
const CYAN = '#38bdf8'
const BG = '#060a12'

function makeCanvasTexture(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { g: canvas.getContext('2d'), tex }
}

// ---------- Texturas vivas (redesenhadas a cada mudança do mercado) ----------
const live = new Map()
function liveTexture(key, w, h, draw) {
  if (!live.has(key)) {
    const t = makeCanvasTexture(w, h)
    t.redraw = () => {
      draw(t.g, w, h)
      t.tex.needsUpdate = true
    }
    t.redraw()
    live.set(key, t)
  }
  return live.get(key).tex
}
// O mercado muda 4x por segundo, mas redesenhar os ecrãs 1x por segundo chega
// (cada redesenho tem de enviar a imagem para a placa gráfica, o que custa desempenho)
let lastRedraw = 0
onMarket(() => {
  const now = performance.now()
  if (now - lastRedraw < 1000) return
  lastRedraw = now
  live.forEach((t) => t.redraw())
})

// ---------- Texturas fixas (desenhadas uma vez) ----------
const fixed = new Map()
function fixedTexture(key, w, h, draw, setup) {
  if (!fixed.has(key)) {
    const { g, tex } = makeCanvasTexture(w, h)
    draw(g, w, h)
    setup?.(tex)
    fixed.set(key, tex)
  }
  return fixed.get(key)
}

// ---------- Gráficos ----------
function drawCandles(g, x, y, w, h, s) {
  const cs = s.candles
  let min = Infinity, max = -Infinity
  for (const c of cs) {
    min = Math.min(min, c.l)
    max = Math.max(max, c.h)
  }
  const pad = (max - min) * 0.1 || 1
  min -= pad
  max += pad
  const py = (v) => y + h - ((v - min) / (max - min)) * h
  const cw = w / cs.length

  g.strokeStyle = 'rgba(148, 163, 184, 0.08)'
  g.lineWidth = 1
  for (let i = 1; i < 5; i++) {
    g.beginPath()
    g.moveTo(x, y + (h * i) / 5)
    g.lineTo(x + w, y + (h * i) / 5)
    g.stroke()
  }

  cs.forEach((c, i) => {
    const cx = x + i * cw + cw / 2
    const color = c.c >= c.o ? UP : DOWN
    g.strokeStyle = color
    g.fillStyle = color
    g.lineWidth = Math.max(1, cw * 0.12)
    g.beginPath()
    g.moveTo(cx, py(c.h))
    g.lineTo(cx, py(c.l))
    g.stroke()
    const top = py(Math.max(c.o, c.c))
    const bh = Math.max(1.5, Math.abs(py(c.o) - py(c.c)))
    g.fillRect(cx - cw * 0.32, top, cw * 0.64, bh)
  })

  const ly = py(s.last)
  g.setLineDash([6, 5])
  g.strokeStyle = 'rgba(255,255,255,0.4)'
  g.beginPath()
  g.moveTo(x, ly)
  g.lineTo(x + w, ly)
  g.stroke()
  g.setLineDash([])
}

function drawHeader(g, x, y, w, s, size = 22) {
  const ch = changePct(s)
  g.font = `600 ${size}px ${MONO}`
  g.textBaseline = 'top'
  g.fillStyle = '#e2e8f0'
  g.textAlign = 'left'
  g.fillText(s.name, x, y)
  g.textAlign = 'right'
  g.fillStyle = ch >= 0 ? UP : DOWN
  g.fillText(`${fmtPrice(s)}  ${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(2)}%`, x + w, y)
  g.textAlign = 'left'
}

function drawChartPanel(g, x, y, w, h, s, headerSize = 22) {
  g.fillStyle = BG
  g.fillRect(x, y, w, h)
  drawHeader(g, x + 14, y + 12, w - 28, s, headerSize)
  drawCandles(g, x + 10, y + headerSize + 28, w - 20, h - headerSize - 40, s)
}

function drawWatchlist(g, x, y, w, h, rowSize = 24) {
  g.fillStyle = BG
  g.fillRect(x, y, w, h)
  g.font = `600 ${rowSize * 0.8}px ${MONO}`
  g.fillStyle = CYAN
  g.textBaseline = 'top'
  g.fillText('WATCHLIST', x + 14, y + 12)
  const rowH = (h - rowSize * 2) / SYMBOLS.length
  SYMBOLS.forEach((sym, i) => {
    const s = market[sym.id]
    const ch = changePct(s)
    const ry = y + rowSize * 1.6 + i * rowH
    g.font = `500 ${rowSize * 0.75}px ${MONO}`
    g.fillStyle = '#cbd5e1'
    g.textAlign = 'left'
    g.fillText(s.name, x + 14, ry)
    g.textAlign = 'right'
    g.fillStyle = '#f1f5f9'
    g.fillText(fmtPrice(s), x + w * 0.68, ry)
    g.fillStyle = ch >= 0 ? UP : DOWN
    g.fillText(`${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`, x + w - 14, ry)
    g.textAlign = 'left'
  })
}

export const chartTexture = (id) =>
  liveTexture(`chart-${id}`, 512, 320, (g, w, h) => drawChartPanel(g, 0, 0, w, h, market[id]))

export const watchlistTexture = () =>
  liveTexture('watch', 512, 320, (g, w, h) => drawWatchlist(g, 0, 0, w, h))

// Ecrã holográfico: fundo transparente + gráfico de linha, volume e anel de desempenho
export const holoTexture = () =>
  liveTexture('holo', 1024, 640, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = 'rgba(8, 20, 36, 0.55)'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(56, 189, 248, 0.5)'
    g.lineWidth = 3
    g.strokeRect(6, 6, w - 12, h - 12)
    // gráfico de linha (BTC) com área por baixo
    const s = market.BTC
    const cs = s.candles
    const min = Math.min(...cs.map((c) => c.l)), max = Math.max(...cs.map((c) => c.h))
    const px = (i) => 40 + (i / (cs.length - 1)) * 560
    const py = (v) => 560 - ((v - min) / (max - min || 1)) * 380
    g.beginPath()
    cs.forEach((c, i) => (i ? g.lineTo(px(i), py(c.c)) : g.moveTo(px(i), py(c.c))))
    g.strokeStyle = CYAN
    g.lineWidth = 4
    g.stroke()
    g.lineTo(px(cs.length - 1), 580)
    g.lineTo(px(0), 580)
    g.fillStyle = 'rgba(56, 189, 248, 0.15)'
    g.fill()
    drawHeader(g, 40, 40, 560, s, 34)
    // barras de volume
    for (let i = 0; i < 12; i++) {
      const bh = 40 + Math.abs(Math.sin(i * 1.7 + cs.length)) * 120
      g.fillStyle = 'rgba(56, 189, 248, 0.45)'
      g.fillRect(660 + i * 26, 360 - bh, 16, bh)
    }
    // anel de "performance"
    g.beginPath()
    g.arc(820, 490, 80, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.45)
    g.strokeStyle = CYAN
    g.lineWidth = 14
    g.stroke()
    g.font = `600 40px ${MONO}`
    g.fillStyle = '#e0f2fe'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('72%', 820, 490)
    g.textAlign = 'left'
  })

// Relógio redondo com a hora atual
export const roundClockTexture = () =>
  liveTexture('round-clock', 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#0b0d11'
    g.beginPath()
    g.arc(128, 128, 126, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#e5e7eb'
    g.lineWidth = 5
    g.beginPath()
    g.arc(128, 128, 112, 0, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#f8fafc'
    g.font = `600 56px ${SANS}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), 128, 132)
  })

// Quadro com uma frase motivacional
export function quoteTexture(lines, { size = 92, weight = 600, upper = false } = {}) {
  return fixedTexture(`quote-${lines.join('|')}`, 1024, 768, (g, w, h) => {
    g.fillStyle = '#0c0e12'
    g.fillRect(0, 0, w, h)
    g.font = `${weight} ${size}px ${SANS}`
    g.textBaseline = 'middle'
    g.shadowColor = 'rgba(147, 197, 253, 0.9)'
    g.shadowBlur = 16
    g.fillStyle = '#e0f2fe'
    const lh = size * 1.18
    const startY = h / 2 - ((lines.length - 1) * lh) / 2
    lines.forEach((line, i) => g.fillText(upper ? line.toUpperCase() : line, 90, startY + i * lh))
    g.shadowBlur = 0
    g.fillStyle = 'rgba(56, 189, 248, 0.8)'
    g.fillRect(90, startY + lines.length * lh - lh / 2 + 20, 120, 5)
  })
}

// Piso de pedra polida: ladrilhos cinzentos com veios suaves
export function tileTexture(repeatX, repeatY) {
  return fixedTexture('tiles', 1024, 1024, (g, w, h) => {
    const r = seeded(17)
    const n = 4, t = w / n
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const base = 108 + r() * 18
        g.fillStyle = `rgb(${base}, ${base + 1}, ${base + 4})`
        g.fillRect(i * t, j * t, t, t)
        for (let k = 0; k < 260; k++) {
          const v = base + (r() - 0.5) * 34
          g.fillStyle = `rgba(${v}, ${v}, ${v + 3}, 0.35)`
          g.fillRect(i * t + r() * t, j * t + r() * t, 2 + r() * 18, 2 + r() * 6)
        }
      }
    }
    g.strokeStyle = '#4a4c51'
    g.lineWidth = 3
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, h); g.stroke()
      g.beginPath(); g.moveTo(0, i * t); g.lineTo(w, i * t); g.stroke()
    }
  }, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeatX, repeatY)
  })
}

// Parede de betão escuro
export function concreteTexture() {
  return fixedTexture('concrete', 512, 512, (g, w, h) => {
    const r = seeded(5)
    g.fillStyle = '#34373d'
    g.fillRect(0, 0, w, h)
    for (let k = 0; k < 1800; k++) {
      const v = 44 + r() * 22
      g.fillStyle = `rgba(${v}, ${v + 2}, ${v + 6}, 0.25)`
      g.beginPath()
      g.arc(r() * w, r() * h, 1 + r() * 10, 0, Math.PI * 2)
      g.fill()
    }
  }, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(6, 1)
  })
}

// Vista da cidade: de noite (luzes acesas) ou de dia (céu azul).
// Os prédios são os mesmos nas duas versões (mesma "semente"), para a transição ser suave.
function drawSkyline(g, w, h, day) {
  const grad = g.createLinearGradient(0, 0, 0, h)
  if (day) {
    grad.addColorStop(0, '#5ea7e6')
    grad.addColorStop(0.6, '#a9d3f2')
    grad.addColorStop(1, '#e8f1f8')
  } else {
    grad.addColorStop(0, '#141a3a')
    grad.addColorStop(0.55, '#3a2a6a')
    grad.addColorStop(1, '#7a4a8a')
  }
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  const r = seeded(42)
  for (let layer = 0; layer < 2; layer++) {
    let x = -10
    while (x < w + 10) {
      const bw = 36 + r() * 70
      const bh = (layer ? 180 : 110) + r() * (layer ? 260 : 170)
      g.fillStyle = day ? (layer ? '#5b6675' : '#8d99a8') : (layer ? '#0a0d1e' : '#20264a')
      g.fillRect(x, h - bh, bw, bh)
      if (layer) {
        for (let wy = h - bh + 10; wy < h - 8; wy += 12) {
          for (let wx = x + 6; wx < x + bw - 6; wx += 9) {
            if (r() > 0.6) {
              // tirar sempre os mesmos números aleatórios, de dia e de noite
              const warm = r() > 0.8
              const glow = r()
              g.fillStyle = day ? '#b9c7d6' : warm ? '#93c5fd' : '#fde68a'
              g.globalAlpha = day ? 0.35 : 0.45 + glow * 0.55
              g.fillRect(wx, wy, 3, 5)
            }
          }
        }
        g.globalAlpha = 1
      }
      x += bw + 3
    }
  }
}

export const skylineTexture = () => fixedTexture('skyline', 768, 512, (g, w, h) => drawSkyline(g, w, h, false))
export const skylineDayTexture = () => fixedTexture('skyline-day', 768, 512, (g, w, h) => drawSkyline(g, w, h, true))