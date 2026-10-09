// Painel de estatísticas: números gerais do escritório e uma tabela por agente.
import { resetOffice, useOffice } from '../sim/store'
import { ROLE_LABEL } from '../data/office'
import { fmtMoney } from '../sim/trading'

export const fmtSeconds = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`)

export default function StatsPanel({ onClose }) {
  const stats = useOffice((s) => s.stats)
  const objectivesDone = useOffice((s) => s.objectivesDone)
  const agents = useOffice((s) => s.agents)
  const realized = useOffice((s) => s.portfolio.realized)
  const winRate = stats.trades ? Math.round((stats.wins / stats.trades) * 100) : 0
  // ranking: primeiro quem deu mais lucro, depois quem fez mais tarefas
  const ranking = [...agents].sort((a, b) => (b.pnl || 0) - (a.pnl || 0) || b.doneCount - a.doneCount)

  const reset = () => {
    if (window.confirm('Apagar todo o progresso (objetivos, tarefas, carteira, histórico e estatísticas) e recomeçar do zero?')) resetOffice()
  }

  return (
    <section className="panel stats" role="dialog" aria-label="Estatísticas">
      <div className="board-head">
        <div>
          <h2>Estatísticas</h2>
          <p>Desempenho da mesa desde o início</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      </div>

      <div className="kpis">
        <div><b className={realized >= 0 ? 'up' : 'down'}>{fmtMoney(realized, true)}</b><span>Lucro realizado</span></div>
        <div><b>{stats.trades}</b><span>Operações fechadas</span></div>
        <div><b>{winRate}%</b><span>Operações com lucro</span></div>
        <div><b>{objectivesDone}</b><span>Objetivos concluídos</span></div>
      </div>

      <table className="stats-table">
        <thead>
          <tr><th>Agente</th><th>Lucro</th><th>Operações</th><th>Tarefas</th><th>Revisões</th></tr>
        </thead>
        <tbody>
          {ranking.map((a) => (
            <tr key={a.id} style={{ '--c': a.color }}>
              <td><i className="dot" />{a.name} <em>{ROLE_LABEL[a.role]}</em></td>
              <td className={a.pnl > 0 ? 'up' : a.pnl < 0 ? 'down' : ''}>{a.trades ? fmtMoney(a.pnl, true) : '–'}</td>
              <td>{a.trades ? `${a.trades} (${Math.round((a.wins / a.trades) * 100)}% ✓)` : '–'}</td>
              <td>{a.doneCount}</td>
              <td>{a.reviews}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="danger" onClick={reset}>Reiniciar escritório</button>
    </section>
  )
}
