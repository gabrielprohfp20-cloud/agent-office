// Editor de aparência de um agente: nome, cor da camisola, cabelo e pele.
// As mudanças aparecem logo no 3D e ficam gravadas.
import { useOffice } from '../sim/store'

const SHIRTS = ['#7c5cff', '#22c55e', '#0ea5e9', '#f472b6', '#f59e0b', '#ef4444', '#14b8a6', '#94a3b8']
const HAIR = ['#15110e', '#3b2a20', '#5a3825', '#c2410c', '#d4a373', '#e5e7eb', '#1f2937', '#7c3aed']
const SKIN = ['#ffdbac', '#f6d2b8', '#f1c7a5', '#e0ac69', '#c68642', '#8d5a3b', '#5c3a24']

function Swatches({ label, colors, value, onPick }) {
  return (
    <div className="swatch-row">
      <span>{label}</span>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c}
            className={c === value ? 'on' : ''}
            style={{ background: c }}
            onClick={() => onPick(c)}
            aria-label={`${label} ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function AgentEditor({ agent }) {
  const customize = useOffice((s) => s.customizeAgent)
  const set = (patch) => customize(agent.id, patch)
  return (
    <div className="editor">
      <label className="name-field">
        <span>Nome</span>
        <input
          defaultValue={agent.name}
          maxLength={16}
          onBlur={(e) => set({ name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>
      <Swatches label="Camisola" colors={SHIRTS} value={agent.color} onPick={(color) => set({ color })} />
      <Swatches label="Cabelo" colors={HAIR} value={agent.hair} onPick={(hair) => set({ hair })} />
      <Swatches label="Pele" colors={SKIN} value={agent.skin} onPick={(skin) => set({ skin })} />
    </div>
  )
}
