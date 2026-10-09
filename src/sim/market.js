// Mercado SIMULADO: preços inventados que se mexem de forma realista (passeio aleatório).
// Serve para dar vida aos ecrãs agora e, mais tarde, para os agentes treinarem trading
// sem arriscar dinheiro a sério.
import { every, simNow } from './clock'

export const SYMBOLS = [
  { id: 'BTC', name: 'BTC/USD', price: 67250, vol: 0.0016, decimals: 0 },
  { id: 'ETH', name: 'ETH/USD', price: 3480, vol: 0.0019, decimals: 1 },
  { id: 'SPX', name: 'S&P 500', price: 5720, vol: 0.0006, decimals: 1 },
  { id: 'NDX', name: 'NASDAQ', price: 20150, vol: 0.0008, decimals: 0 },
  { id: 'EUR', name: 'EUR/USD', price: 1.0925, vol: 0.0003, decimals: 4 },
  { id: 'XAU', name: 'GOLD', price: 2655, vol: 0.0005, decimals: 1 },
  { id: 'AAPL', name: 'AAPL', price: 228.4, vol: 0.0009, decimals: 2 },
  { id: 'TSLA', name: 'TSLA', price: 251.7, vol: 0.0015, decimals: 2 },
]

const TICK_MS = 250 // o preço muda 4 vezes por segundo
const CANDLE_MS = 3000 // cada vela representa 3 segundos
const HISTORY = 48 // quantas velas guardar

// Número aleatório com distribuição normal (em forma de sino)
function gauss() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function nextPrice(s, p) {
  const revert = ((s.price - p) / s.price) * 0.01 // puxa suavemente de volta ao preço base
  return p * (1 + gauss() * s.vol + revert)
}

function makeSeries(s) {
  let p = s.price
  const candles = []
  for (let i = 0; i < HISTORY; i++) {
    const o = p
    let h = o, l = o
    for (let k = 0; k < CANDLE_MS / TICK_MS; k++) {
      p = nextPrice(s, p)
      h = Math.max(h, p)
      l = Math.min(l, p)
    }
    candles.push({ o, h, l, c: p })
  }
  return { ...s, candles, last: p, open: candles[0].o }
}

// market.BTC, market.ETH, ...
export const market = Object.fromEntries(SYMBOLS.map((s) => [s.id, makeSeries(s)]))

// Recomeça o mercado a partir dos últimos preços gravados (para as posições abertas
// não "saltarem" quando a página é recarregada)
export function restorePrices(prices = {}) {
  for (const s of SYMBOLS) {
    const p = prices[s.id]
    if (typeof p === 'number' && p > 0) Object.assign(market[s.id], makeSeries({ ...s, price: p }))
  }
}

export const lastPrices = () => Object.fromEntries(Object.values(market).map((s) => [s.id, s.last]))
export const symbolName = (id) => market[id]?.name || id

const listeners = new Set()
export function onMarket(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

let started = false
let lastCandle = simNow()
export function startMarket() {
  if (started) return
  started = true
  every(TICK_MS, () => {
    const now = simNow()
    const newCandle = now - lastCandle >= CANDLE_MS
    if (newCandle) lastCandle = now
    for (const s of Object.values(market)) {
      s.last = nextPrice(s, s.last)
      if (newCandle) {
        const prev = s.candles[s.candles.length - 1]
        s.candles.push({ o: prev.c, h: prev.c, l: prev.c, c: prev.c })
        if (s.candles.length > HISTORY) s.candles.shift()
      }
      const cur = s.candles[s.candles.length - 1]
      cur.c = s.last
      cur.h = Math.max(cur.h, s.last)
      cur.l = Math.min(cur.l, s.last)
    }
    listeners.forEach((fn) => fn())
  })
}

export const changePct = (s) => ((s.last - s.open) / s.open) * 100
export const fmtPrice = (s, v = s.last) =>
  v.toLocaleString('en-US', { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals })
