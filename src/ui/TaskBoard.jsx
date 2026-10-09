// Quadro Kanban: mostra as tarefas do objetivo atual em 4 colunas
// e deixa o utilizador pedir novos objetivos à equipa.
import { useState } from 'react'
import { useOffice } from '../sim/store'
import { ROLE_LABEL } from '../data/office'

// Resultado de uma tarefa "Operar X"
const OUTCOMES = { opened: '✅ posição aberta', blocked: '🛑 bloqueada pelo risco', 'no-signal': '⏸️ sem sinal' }

const COLUMNS = [
  { id: 'todo', title: 'A fazer' },
  { id: 'doing', title: 'Em curso' },
  { id: 'review', title: 'Revisão' },
  { id: 'done', title: 'Concluído' },
]

function TaskCard({ task, agents }) {
  const owner = agents.find((a) => a.id === task.assignee)
  const reviewer = agents.find((a) => a.id === task.reviewer)
  const waiting = task.status === 'todo' && !task.assignee
  const progress = task.status === 'review' ? task.reviewProgress : task.progress
  return (
    <li className={`card ${task.status}`} style={{ '--c': owner?.color || '#475569' }}>
      <div className="card-title">
        <span>{task.emoji}</span> {task.title}
      </div>
      <div className="card-meta">
        {owner ? <span className="who"><i />{owner.name}</span> : <span className="muted">{ROLE_LABEL[task.role]}</span>}
        {waiting && task.deps.length > 0 && <span className="muted">⛓️ à espera</span>}
        {task.bugs > 0 && <span className="bug">✏️ {task.bugs}</span>}
        {task.order && <span className={task.order.side === 'long' ? 'up' : 'down'}>{task.order.side.toUpperCase()}</span>}
        {task.outcome && <span className="muted">{OUTCOMES[task.outcome]}</span>}
        {reviewer && task.status === 'review' && <span className="muted">🔍 {reviewer.name}</span>}
      </div>
      {(task.status === 'doing' || task.status === 'review') && (
        <div className="card-bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      )}
    </li>
  )
}

export default function TaskBoard({ onClose }) {
  const objective = useOffice((s) => s.objective)
  const tasks = useOffice((s) => s.tasks)
  const agents = useOffice((s) => s.agents)
  const queue = useOffice((s) => s.queue)
  const addObjective = useOffice((s) => s.addObjective)
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addObjective(text)
    setText('')
  }

  return (
    <section className="panel board" role="dialog" aria-label="Quadro de tarefas">
      <div className="board-head">
        <div>
          <h2>Tarefas</h2>
          <p>{objective ? `🎯 ${objective.title}` : 'À espera do primeiro objetivo…'}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      </div>

      {objective?.status === 'planning' ? (
        <div className="board-empty">🧠 O Gestor da Mesa está a dividir o objetivo em tarefas…</div>
      ) : (
        <div className="columns">
          {COLUMNS.map((col) => {
            const list = tasks.filter((t) => t.status === col.id)
            return (
              <div className="column" key={col.id}>
                <h3>{col.title} <span>{list.length}</span></h3>
                <ul>
                  {list.map((t) => <TaskCard key={t.id} task={t} agents={agents} />)}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <form className="new-objective" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Novo objetivo (ex.: Operar bitcoin e ouro hoje)"
          maxLength={60}
        />
        <button type="submit" disabled={!text.trim()}>Adicionar</button>
      </form>
      {queue.length > 0 && (
        <p className="queue">Na fila: {queue.map((q, i) => <span key={i}>{q}</span>)}</p>
      )}
    </section>
  )
}
