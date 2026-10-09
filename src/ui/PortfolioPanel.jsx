// Carteira: património, resultado da sessão, posições abertas e últimas operações fechadas.
// Dinheiro virtual — os preços vêm do mercado simulado.
import { useOffice } from '../sim/store'
import { market, fmtPrice } from '../sim/market'
import { START_CAPITAL, equity, exposure, fmtMoney, openPnl, unrealized } from '../sim/trading'

const REASONS = { alvo: '🎯 alvo', stop: '🛑 stop', tempo: '⏱️ tempo' }

export default function PortfolioPanel({ onClose }) {
  const portfolio = useOffice((s) => s.portfolio)
  const agents = useOffice((s) => s.agents)
  const who = (id) => agents.find((a) => a.id === id)

  const eq = equity(portfolio)
  const total = eq - START_CAPITAL
  const session = eq - portfolio.sessionStart
  const exp = eq ? (exposure(portfolio) / eq) * 100 : 0

  return (
    <section className="panel stats portfolio" role="dialog" aria-label="Carteira">
      <div className="board-head">
        <div>
          <h2>Carteira</h2>
          <p>Dinheiro virtual · capital inicial {fmtMoney(START_CAPITAL)}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      </div>

      <div className="kpis">
        <div><b>{fmtMoney(eq)}</b><span>Património</span></div>
        <div><b className={total >= 0 ? 'up' : 'down'}>{fmtMoney(total, true)}</b><span>Desde o início</span></div>
        <div><b className={session >= 0 ? 'up' : 'down'}>{fmtMoney(session, true)}</b><span>Nesta sessão</span></div>
        <div><b>{exp.toFixed(0)}%</b><span>Investido agora</span></div>
      </div>

      <h3 className="section-title">Posições abertas ({portfolio.positions.length}) · {fmtMoney(openPnl(portfolio), true)}</h3>
      {portfolio.positions.length ? (
        <table className="stats-table">
          <thead>
            <tr><th>Ativo</th><th>Lado</th><th>Entrada</th><th>Agora</th><th>Resultado</th><th>Trader</th></tr>
          </thead>
          <tbody>
            {portfolio.positions.map((p) => {
              const s = market[p.symbol]
              const pnl = unrealized(p)
              const t = who(p.trader)
              return (
                <tr key={p.id} style={{ '--c': t?.color }}>
                  <td>{s.name}</td>
                  <td className={p.side === 'long' ? 'up' : 'down'}>{p.side.toUpperCase()}</td>
                  <td>{fmtPrice(s, p.entry)}</td>
                  <td>{fmtPrice(s)}</td>
                  <td className={pnl >= 0 ? 'up' : 'down'}>{fmtMoney(pnl, true)}</td>
                  <td><i className="dot" />{t?.name || '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="muted">Nenhuma posição aberta. Os traders abrem posições nas tarefas "Operar …".</p>
      )}

      <h3 className="section-title">Últimas operações fechadas</h3>
      {portfolio.closed.length ? (
        <table className="stats-table">
          <thead>
            <tr><th>Ativo</th><th>Lado</th><th>Resultado</th><th>Motivo</th><th>Trader</th></tr>
          </thead>
          <tbody>
            {portfolio.closed.slice(0, 8).map((c) => {
              const t = who(c.trader)
              return (
                <tr key={c.id} style={{ '--c': t?.color }}>
                  <td>{market[c.symbol]?.name || c.symbol}</td>
                  <td className={c.side === 'long' ? 'up' : 'down'}>{c.side.toUpperCase()}</td>
                  <td className={c.pnl >= 0 ? 'up' : 'down'}>{fmtMoney(c.pnl, true)}</td>
                  <td>{REASONS[c.reason]}</td>
                  <td><i className="dot" />{t?.name || '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="muted">Ainda nenhuma operação fechada.</p>
      )}
    </section>
  )
}
