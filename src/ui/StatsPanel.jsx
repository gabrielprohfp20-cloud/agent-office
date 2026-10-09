// Painel de estatísticas: números gerais do escritório e uma tabela por agente.
import { resetOffice, useOffice } from '../sim/store'

export const fmtSeconds = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`)

export default function StatsPanel({ onClose }) {
  const stats = useOffice((s) => s.stats)
  const objectivesDone = useOffice((s) => s.objectivesDone)
  const agents = useOffice((s) => s.agents)
  const bugRate = stats.reviews ? Math.round((stats.bugsFound / stats.reviews) * 100) : 0
  const avg = stats.tasksDone ? stats.workSeconds / stats.tasksDone : 0
  const ranking = [...agents].sort((a, b) => b.doneCount - a.doneCount)

  const reset = () => {
    if (window.confirm('Apagar todo o progresso (objetivos, tarefas, histórico e estatísticas) e recomeçar do zero?')) resetOffice()
  }

  return (
    <section className="panel stats" role="dialog" aria-label="Estatísticas">
      <div className="board-head">
        <div>
          <h2>Estatísticas</h2>
          <p>Desempenho da equipa desde o início</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      </div>

      <div className="kpis">
        <div><b>{objectivesDone}</b><span>Objetivos concluídos</span></div>
        <div><b>{stats.tasksDone}</b><span>Tarefas concluídas</span></div>
        <div><b>{bugRate}%</b><span>Revisões com bugs</span></div>
        <div><b>{fmtSeconds(avg)}</b><span>Tempo médio por tarefa</span></div>
      </div>

      <table className="stats-table">
        <thead>
          <tr><th>Agente</th><th>Tarefas</th><th>Revisões feitas</th><th>Bugs no seu trabalho</th></tr>
        </thead>
        <tbody>
          {ranking.map((a) => (
            <tr key={a.id} style={{ '--c': a.color }}>
              <td><i className="dot" />{a.name} <em>{a.role}</em></td>
              <td>{a.doneCount}</td>
              <td>{a.reviews}</td>
              <td>{a.bugsCaused}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="danger" onClick={reset}>Reiniciar escritório</button>
    </section>
  )
}
