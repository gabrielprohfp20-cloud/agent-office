// Testes da mesa de trading: estratégias, regras de risco, abrir e fechar posições.
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function fresh() {
  vi.resetModules()
  localStorage.clear()
  const { useOffice } = await import('../src/sim/store')
  const trading = await import('../src/sim/trading')
  const { market } = await import('../src/sim/market')
  return { useOffice, market, ...trading }
}

// Põe um ativo com velas a um preço fixo e o último preço onde quisermos
function setCandles(market, id, base, last) {
  const s = market[id]
  s.candles = Array.from({ length: 48 }, () => ({ o: base, h: base, l: base, c: base }))
  s.last = last
}

describe('estratégias', () => {
  beforeEach(() => localStorage.clear())

  it('seguir a tendência: compra acima da média e vende abaixo', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 101)
    expect(t.signal('trend', 'BTC').side).toBe('long')
    setCandles(t.market, 'BTC', 100, 99)
    expect(t.signal('trend', 'BTC').side).toBe('short')
    setCandles(t.market, 'BTC', 100, 100)
    expect(t.signal('trend', 'BTC')).toBeNull()
  })

  it('rompimento: compra acima da máxima recente', async () => {
    const t = await fresh()
    setCandles(t.market, 'ETH', 100, 100.5)
    expect(t.signal('breakout', 'ETH').side).toBe('long')
  })
})

describe('posições e risco', () => {
  beforeEach(() => localStorage.clear())

  it('abre uma posição e o lucro acompanha o preço', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 100)
    const pos = t.openPosition({ symbol: 'BTC', side: 'long', why: 'teste' }, 'dev1')
    expect(pos.qty * 100).toBeCloseTo(t.START_CAPITAL * 0.08) // 8% do património
    t.market.BTC.last = 101
    expect(t.unrealized(pos)).toBeCloseTo(pos.qty * 1)
    expect(t.equity()).toBeCloseTo(t.START_CAPITAL + pos.qty)
  })

  it('short ganha quando o preço desce', async () => {
    const t = await fresh()
    setCandles(t.market, 'ETH', 100, 100)
    const pos = t.openPosition({ symbol: 'ETH', side: 'short', why: 'teste' }, 'dev2')
    t.market.ETH.last = 98
    expect(t.unrealized(pos)).toBeGreaterThan(0)
  })

  it('fecha no alvo, regista o lucro e atualiza o trader', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 100)
    const pos = t.openPosition({ symbol: 'BTC', side: 'long', why: 'teste' }, 'dev1')
    t.market.BTC.last = pos.target + 0.01
    t.updatePositions(1000)
    const s = t.useOffice.getState()
    expect(s.portfolio.positions).toHaveLength(0)
    expect(s.portfolio.closed[0].reason).toBe('alvo')
    expect(s.portfolio.realized).toBeGreaterThan(0)
    const nova = s.agents.find((a) => a.id === 'dev1')
    expect(nova.trades).toBe(1)
    expect(nova.wins).toBe(1)
  })

  it('fecha no stop com prejuízo', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 100)
    const pos = t.openPosition({ symbol: 'BTC', side: 'long', why: 'teste' }, 'dev1')
    t.market.BTC.last = pos.stop - 0.01
    t.updatePositions(1000)
    const s = t.useOffice.getState()
    expect(s.portfolio.closed[0].reason).toBe('stop')
    expect(s.portfolio.realized).toBeLessThan(0)
  })

  it('fecha por tempo máximo', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 100)
    t.openPosition({ symbol: 'BTC', side: 'long', why: 'teste' }, 'dev1')
    t.updatePositions(130_000)
    expect(t.useOffice.getState().portfolio.closed[0].reason).toBe('tempo')
  })

  it('o risco bloqueia uma segunda posição no mesmo ativo', async () => {
    const t = await fresh()
    setCandles(t.market, 'BTC', 100, 100)
    expect(t.riskCheck({ symbol: 'BTC', side: 'long' }).ok).toBe(true)
    t.openPosition({ symbol: 'BTC', side: 'long', why: 'teste' }, 'dev1')
    const check = t.riskCheck({ symbol: 'BTC', side: 'short' })
    expect(check.ok).toBe(false)
    expect(check.reason).toMatch(/já temos posição/)
  })

  it('o risco bloqueia quando a exposição fica alta demais', async () => {
    const t = await fresh()
    for (const id of ['BTC', 'ETH', 'SPX', 'NDX', 'EUR', 'XAU']) setCandles(t.market, id, 100, 100)
    for (const id of ['BTC', 'ETH', 'SPX', 'NDX', 'EUR', 'XAU']) {
      if (t.riskCheck({ symbol: id, side: 'long' }).ok) t.openPosition({ symbol: id, side: 'long', why: 't' }, 'dev1')
    }
    // 8% por posição e no máximo 50% investido -> no máximo 6 posições
    expect(t.exposure() / t.equity()).toBeLessThanOrEqual(0.5 + 1e-9)
    setCandles(t.market, 'AAPL', 100, 100)
    expect(t.riskCheck({ symbol: 'AAPL', side: 'long' }).ok).toBe(false)
  })

  it('o risco bloqueia novas operações depois de perder 3% na sessão', async () => {
    const t = await fresh()
    t.useOffice.setState((s) => ({ portfolio: { ...s.portfolio, realized: -4000 } }))
    setCandles(t.market, 'BTC', 100, 100)
    const check = t.riskCheck({ symbol: 'BTC', side: 'long' })
    expect(check.ok).toBe(false)
    expect(check.reason).toMatch(/limite de perda/)
  })
})
