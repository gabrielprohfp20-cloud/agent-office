// Mesa de trading SIMULADA: sinais das estratégias, regras de risco, posições e lucro/prejuízo.
// Todo o dinheiro é virtual e os preços vêm do mercado simulado (sim/market.js).
//
// Fluxo de uma operação:
//   1. O trader acaba a tarefa "Operar X" e consulta a sua estratégia -> sinal LONG, SHORT ou nenhum
//   2. Com sinal, prepara a ordem e leva-a ao Gestor de Risco
//   3. O Gestor de Risco aplica as regras -> aprova (a posição abre) ou bloqueia
//   4. A posição fecha sozinha ao atingir o alvo, o stop, ou o tempo máximo
import { market, symbolName } from './market'
import { getAgent, log, say, useOffice } from './store'
import { isBusy } from './routines'

export { START_CAPITAL } from './store'
import { START_CAPITAL } from './store'
const POSITION_SIZE = 0.08 // cada operação usa 8% do património
const MAX_EXPOSURE = 0.5 // no máximo 50% do património investido ao mesmo tempo
const MAX_OPEN = 6 // no máximo 6 posições abertas
const DAILY_LOSS_LIMIT = 0.03 // perder 3% na sessão bloqueia novas operações
const MAX_HOLD_MS = 120_000 // uma posição fecha ao fim de 2 minutos (tempo de simulação)
const STOP_K = 10 // stop = 10 × a volatilidade do ativo
const TARGET_K = 18 // alvo = 18 × a volatilidade do ativo

const pf = () => useOffice.getState().portfolio
const setPf = (patch) => useOffice.setState((s) => ({ portfolio: { ...s.portfolio, ...patch } }))

// ---------- Contas ----------
export function unrealized(pos) {
  const p = market[pos.symbol].last
  return (pos.side === 'long' ? p - pos.entry : pos.entry - p) * pos.qty
}
export const openPnl = (portfolio = pf()) => portfolio.positions.reduce((sum, p) => sum + unrealized(p), 0)
export const equity = (portfolio = pf()) => START_CAPITAL + portfolio.realized + openPnl(portfolio)
export const exposure = (portfolio = pf()) =>
  portfolio.positions.reduce((sum, p) => sum + p.qty * market[p.symbol].last, 0)

export const fmtMoney = (v, signed = false) =>
  `${signed && v > 0 ? '+' : v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// ---------- Estratégias: devolvem { side, why } ou null (sem sinal) ----------
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length

export function signal(strategy, symbolId) {
  const s = market[symbolId]
  const closes = s.candles.slice(-20).map((c) => c.c)
  const sma = mean(closes)
  const last = s.last

  if (strategy === 'meanrev') {
    // Reversão à média: preço muito longe da média tende a voltar
    const sd = Math.sqrt(mean(closes.map((c) => (c - sma) ** 2))) || 1e-9
    const z = (last - sma) / sd
    if (z < -0.8) return { side: 'long', why: `${Math.abs(z).toFixed(1)}σ abaixo da média` }
    if (z > 0.8) return { side: 'short', why: `${z.toFixed(1)}σ acima da média` }
    return null
  }
  if (strategy === 'breakout') {
    // Rompimento: o preço passa a máxima/mínima recente
    const prev = s.candles.slice(-21, -1)
    const hi = Math.max(...prev.map((c) => c.h))
    const lo = Math.min(...prev.map((c) => c.l))
    if (last > hi) return { side: 'long', why: 'rompeu a máxima recente' }
    if (last < lo) return { side: 'short', why: 'rompeu a mínima recente' }
    return null
  }
  // Seguir a tendência: preço acima da média -> sobe; abaixo -> desce
  const diff = (last - sma) / sma
  if (diff > s.vol) return { side: 'long', why: 'acima da média, tendência de alta' }
  if (diff < -s.vol) return { side: 'short', why: 'abaixo da média, tendência de baixa' }
  return null
}

// Leitura do analista sobre um ativo (texto curto para o feed)
export function marketView(symbolId) {
  const t = signal('trend', symbolId)
  const name = symbolName(symbolId)
  if (!t) return `${name} sem tendência clara`
  return `${name} em tendência de ${t.side === 'long' ? 'alta 📈' : 'baixa 📉'}`
}

// ---------- 1. O trader prepara a ordem ----------
export function prepareOrder(task, trader) {
  const sig = signal(trader.strategy || 'trend', task.symbol)
  if (!sig) return null
  return { symbol: task.symbol, side: sig.side, why: sig.why }
}

// ---------- 2. O Gestor de Risco verifica ----------
export function riskCheck(order) {
  const p = pf()
  const eq = equity(p)
  if (p.positions.some((x) => x.symbol === order.symbol)) return { ok: false, reason: `já temos posição em ${symbolName(order.symbol)}` }
  if (p.positions.length >= MAX_OPEN) return { ok: false, reason: `já há ${MAX_OPEN} posições abertas` }
  if (eq < p.sessionStart * (1 - DAILY_LOSS_LIMIT)) return { ok: false, reason: 'limite de perda da sessão atingido' }
  if (exposure(p) + eq * POSITION_SIZE > eq * MAX_EXPOSURE) return { ok: false, reason: 'exposição total demasiado alta' }
  return { ok: true }
}

// ---------- 3. Abrir a posição ----------
export function openPosition(order, traderId) {
  const p = pf()
  const s = market[order.symbol]
  const price = s.last
  const qty = (equity(p) * POSITION_SIZE) / price
  const dir = order.side === 'long' ? 1 : -1
  const pos = {
    id: p.nextId,
    symbol: order.symbol,
    side: order.side,
    qty,
    entry: price,
    stop: price * (1 - dir * STOP_K * s.vol),
    target: price * (1 + dir * TARGET_K * s.vol),
    trader: traderId,
    held: 0, // milissegundos (de simulação) com a posição aberta
    why: order.why,
  }
  setPf({ positions: [...p.positions, pos], nextId: p.nextId + 1 })
  const trader = getAgent(traderId)
  log(`${order.side === 'long' ? '📈' : '📉'} ${trader.name} abriu ${order.side.toUpperCase()} ${s.name} a ${price.toLocaleString('en-US', { maximumFractionDigits: s.decimals })} (${order.why})`, trader.color)
  return pos
}

// ---------- 4. Fechar posições (alvo, stop ou tempo) — chamado a cada segundo ----------
export function updatePositions(dtMs) {
  const p = pf()
  if (!p.positions.length) return
  const still = []
  const closed = []
  for (const pos of p.positions) {
    const price = market[pos.symbol].last
    const held = pos.held + dtMs
    const long = pos.side === 'long'
    let reason = null
    if (long ? price >= pos.target : price <= pos.target) reason = 'alvo'
    else if (long ? price <= pos.stop : price >= pos.stop) reason = 'stop'
    else if (held >= MAX_HOLD_MS) reason = 'tempo'
    if (!reason) {
      still.push({ ...pos, held })
      continue
    }
    const pnl = unrealized(pos)
    closed.push({ ...pos, held, exit: price, pnl, reason, closedAt: Date.now() })
  }
  if (!closed.length) {
    setPf({ positions: still })
    return
  }
  const realized = p.realized + closed.reduce((sum, c) => sum + c.pnl, 0)
  setPf({ positions: still, realized, closed: [...closed.reverse(), ...p.closed].slice(0, 40) })

  const st = useOffice.getState()
  for (const c of closed) {
    const trader = getAgent(c.trader)
    if (!trader) continue
    st.setStatus(trader.id, {
      pnl: (trader.pnl || 0) + c.pnl,
      trades: (trader.trades || 0) + 1,
      wins: (trader.wins || 0) + (c.pnl > 0 ? 1 : 0),
    })
    st.bumpStats({ trades: 1, wins: c.pnl > 0 ? 1 : 0 })
    const why = { alvo: 'alvo atingido', stop: 'stop', tempo: 'tempo máximo' }[c.reason]
    log(`${c.pnl >= 0 ? '💰' : '🔻'} ${trader.name} fechou ${c.side.toUpperCase()} ${symbolName(c.symbol)}: ${fmtMoney(c.pnl, true)} (${why})`, c.pnl >= 0 ? '#22c55e' : '#ef4444')
    if (!isBusy(trader.id)) say(trader.id, c.pnl >= 0 ? '💰' : '😬', `${symbolName(c.symbol)} ${fmtMoney(c.pnl, true)}`)
  }
}

// No início de cada sessão (abrir a página), o limite de perda conta a partir do património atual
export function startSession() {
  setPf({ sessionStart: equity() })
}

// Resumo para o relatório do analista júnior
export function sessionSummary() {
  const p = pf()
  const day = equity(p) - p.sessionStart
  return `${p.positions.length} posição(ões) aberta(s), resultado da sessão ${fmtMoney(day, true)}`
}
