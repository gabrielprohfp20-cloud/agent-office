// Botão "+ Contratar agente": escolhe a função e o agente novo entra pela porta.
import { useState } from 'react'
import { useOffice } from '../sim/store'
import { HIRABLE_ROLES, freeDeskCount, hireAgent } from '../sim/team'

const LABELS = { TRADER: '💹 Trader', ANALYST: '📊 Analista', RISK: '🛡️ Risco', JUNIOR: '📰 Júnior' }

export default function HireButton() {
  useOffice((s) => s.agents.length) // atualiza quando a equipa muda
  const [open, setOpen] = useState(false)
  const free = freeDeskCount()

  if (free === 0) {
    return <button className="hire" disabled title="Não há mais mesas livres">Escritório cheio</button>
  }
  if (!open) {
    return (
      <button className="hire" onClick={() => setOpen(true)}>
        + Contratar agente <small>({free} mesa{free > 1 ? 's' : ''} livre{free > 1 ? 's' : ''})</small>
      </button>
    )
  }
  return (
    <div className="hire-pick">
      {HIRABLE_ROLES.map((role) => (
        <button
          key={role}
          onClick={() => {
            hireAgent(role)
            setOpen(false)
          }}
        >
          {LABELS[role]}
        </button>
      ))}
      <button className="hire-cancel" onClick={() => setOpen(false)} aria-label="Cancelar">×</button>
    </div>
  )
}
