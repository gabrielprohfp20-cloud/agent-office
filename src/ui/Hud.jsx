// Interface por cima do 3D: objetivo atual, equipa, detalhes do agente, feed e quadro de tarefas.
import { useEffect, useRef, useState } from 'react'
import { useOffice } from '../sim/store'
import { ROLE_LABEL, STRATEGIES } from '../data/office'
import { changePct, fmtPrice, market } from '../sim/market'
import TaskBoard from './TaskBoard'
import StatsPanel, { fmtSeconds } from './StatsPanel'
import AgentEditor from './AgentEditor'
import PortfolioPanel from './PortfolioPanel'
import { START_CAPITAL, equity, fmtMoney, unrealized } from '../sim/trading'
import HireButton from './HireButton'

const ACTIVITY = {
  typing: 'A trabalhar',
  thinking: 'A pensar',
  idle: 'Em movimento / pausa',
}

const time = (ms) => new Date(ms).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Faz o componente atualizar-se de X em X milissegundos (para os preços)
function useTick(ms) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

function Change({ s }) {
  const ch = changePct(s)
  return <span className={ch >= 0 ? 'up' : 'down'}>{ch >= 0 ? '▲' : '▼'}{Math.abs(ch).toFixed(2)}%</span>
}

// Painel recolhido/aberto, lembrado entre visitas (fica guardado no navegador)
function useRemembered(key) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })
  const update = (v) => {
    setValue(v)
    try { localStorage.setItem(key, v ? '1' : '0') } catch { /* ignorar */ }
  }
  return [value, update]
}

// [velocidade, texto do botão, tecla de atalho]
const SPEEDS = [[0, '❚❚', 'Espaço'], [1, '1x', '1'], [2, '2x', '2'], [4, '4x', '3']]

// Atalhos: Espaço = pausa/continuar, 1/2/3 = 1x/2x/4x
function useSpeedKeys(speed, setSpeed) {
  const lastSpeed = useRef(speed || 1)
  if (speed) lastSpeed.current = speed
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        setSpeed(speed === 0 ? lastSpeed.current : 0)
      } else if (e.key === '1') setSpeed(1)
      else if (e.key === '2') setSpeed(2)
      else if (e.key === '3') setSpeed(4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [speed, setSpeed])
}

// Seta para recolher/abrir um painel
function FoldButton({ folded, onClick }) {
  return (
    <button className={`fold${folded ? ' is-folded' : ''}`} onClick={onClick} aria-label={folded ? 'Mostrar' : 'Esconder'} title={folded ? 'Mostrar' : 'Esconder'}>
      ▾
    </button>
  )
}

export default function Hud({ selected, onSelect }) {
  useTick(1000)
  const agents = useOffice((s) => s.agents)
  const feed = useOffice((s) => s.log)
  const objective = useOffice((s) => s.objective)
  const tasks = useOffice((s) => s.tasks)
  const objectivesDone = useOffice((s) => s.objectivesDone)
  const speed = useOffice((s) => s.speed)
  const setSpeed = useOffice((s) => s.setSpeed)
  const [boardOpen, setBoardOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const portfolio = useOffice((s) => s.portfolio)
  const eq = equity(portfolio)
  const [editing, setEditing] = useState(false)
  useSpeedKeys(speed, setSpeed)
  const [teamFolded, setTeamFolded] = useRemembered('fold-team')
  const [feedFolded, setFeedFolded] = useRemembered('fold-feed')
  const current = agents.find((a) => a.id === selected)
  const working = agents.filter((a) => a.activity !== 'idle').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const myPositions = current ? portfolio.positions.filter((p) => p.trader === current.id) : []
  const currentTask = current && tasks.find((t) => (t.assignee === current.id && t.status === 'doing') || (t.reviewer === current.id && t.status === 'review'))

  return (
    <>
      <header className="panel brand">
        <div className="brand-row">
          <div className="logo">AO</div>
          <div>
            <h1>Agent Office</h1>
            <p>Trading Floor · Equipa de IA</p>
          </div>
          {speed === 0
            ? <div className="live paused">❚❚ PAUSA</div>
            : <div className="live"><span />AO VIVO</div>}
          <div className="sim" title="Os preços são inventados — nenhum dinheiro real está envolvido">SIMULADO</div>
        </div>

        {/* Velocidade da simulação + estatísticas */}
        <div className="controls">
          <div className="speed" role="group" aria-label="Velocidade">
            {SPEEDS.map(([value, label, key]) => (
              <button
                key={value}
                className={speed === value ? 'on' : ''}
                onClick={() => setSpeed(value)}
                title={`${value === 0 ? 'Pausa' : `Velocidade ${label}`} (tecla ${key})`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="controls-right">
            <button className="tasks-btn" onClick={() => setPortfolioOpen((o) => !o)} title="Carteira (dinheiro virtual)">
              💼 <span className={eq >= START_CAPITAL ? 'up' : 'down'}>{fmtMoney(eq)}</span>
            </button>
            <button className="tasks-btn" onClick={() => setStatsOpen((o) => !o)}>📊</button>
          </div>
        </div>

        {/* Objetivo atual (linha discreta) + botão para abrir o quadro de tarefas */}
        <div className="objective">
          <div className="objective-info">
            <span className="objective-title">
              🎯 {objective ? objective.title : 'A aguardar objetivo…'}
              {objective?.status === 'planning' && <em> · a planear</em>}
              {objective?.status === 'done' && <em className="up"> · concluído!</em>}
            </span>
            <div className="objective-bar">
              <i style={{ width: tasks.length ? `${(doneTasks / tasks.length) * 100}%` : '0%' }} />
            </div>
          </div>
          <span className="objective-count">{doneTasks}/{tasks.length || '–'}</span>
          <button className="tasks-btn" onClick={() => setBoardOpen((o) => !o)}>📋 Tarefas</button>
        </div>
      </header>

      {boardOpen && <TaskBoard onClose={() => setBoardOpen(false)} />}
      {statsOpen && <StatsPanel onClose={() => setStatsOpen(false)} />}
      {portfolioOpen && <PortfolioPanel onClose={() => setPortfolioOpen(false)} />}

      <aside className={`panel team${teamFolded ? ' folded' : ''}`}>
        <div className="team-head">
          <h2>Equipa</h2>
          <span className="pill">{working}/{agents.length} ativos</span>
          <FoldButton folded={teamFolded} onClick={() => setTeamFolded(!teamFolded)} />
        </div>
        <ul>
          {agents.map((a) => {
            const s = market[a.symbol]
            return (
              <li
                key={a.id}
                className={a.id === selected ? 'active' : ''}
                onClick={() => onSelect(a.id === selected ? null : a.id)}
                style={{ '--c': a.color }}
              >
                <div className="avatar">{a.name[0]}</div>
                <div className="info">
                  <strong>{a.name} <em>{ROLE_LABEL[a.role]}</em></strong>
                  <span>{a.emoji} {a.status}</span>
                </div>
                <div className="asset">
                  <small>{s.name}</small>
                  <Change s={s} />
                </div>
                <i className={`state ${a.activity}`} title={ACTIVITY[a.activity]} />
              </li>
            )
          })}
        </ul>
        <HireButton />
      </aside>

      {current && (
        <section className="panel detail" style={{ '--c': current.color }}>
          <div className="detail-head">
            <div className="avatar big">{current.name[0]}</div>
            <div>
              <h3>{current.name}</h3>
              <p>{current.title}</p>
            </div>
            <button
              className={`edit-btn${editing ? ' on' : ''}`}
              onClick={() => setEditing(!editing)}
              title="Personalizar nome e aparência"
            >
              ✏️
            </button>
            <button className="close" onClick={() => onSelect(null)} aria-label="Fechar">×</button>
          </div>
          {editing && <AgentEditor key={current.id} agent={current} />}
          <dl>
            <dt>Estado</dt><dd>{ACTIVITY[current.activity]}</dd>
            <dt>Agora</dt><dd>{current.emoji} {current.status}</dd>
            <dt>Tarefa</dt>
            <dd>
              {currentTask
                ? `${currentTask.title} (${Math.round((currentTask.status === 'review' ? currentTask.reviewProgress : currentTask.progress) * 100)}%)`
                : <span className="muted">Sem tarefa</span>}
            </dd>
            {current.role === 'TRADER' && (
              <>
                <dt>Estratégia</dt><dd>{STRATEGIES[current.strategy] || '–'}</dd>
                <dt>Lucro</dt>
                <dd className={current.pnl > 0 ? 'up' : current.pnl < 0 ? 'down' : ''}>
                  {current.trades ? ` em  operaç (% com lucro)` : 'Ainda sem operações fechadas'}
                </dd>
                <dt>Abertas</dt>
                <dd>
                  {myPositions.length
                    ? myPositions.map((p) => `  `).join(' · ')
                    : <span className="muted">Nenhuma</span>}
                </dd>
              </>
            )}
            <dt>Resumo</dt>
            <dd>{current.doneCount} concluída{current.doneCount === 1 ? '' : 's'} · {current.reviews} revis{current.reviews === 1 ? 'ão' : 'ões'}</dd>
            <dt>Mercado</dt>
            <dd className="mono">{market[current.symbol].name} {fmtPrice(market[current.symbol])} <Change s={market[current.symbol]} /></dd>
          </dl>

          <h4>Histórico</h4>
          {current.history.length ? (
            <ol className="history">
              {current.history.slice(0, 6).map((h, i) => (
                <li key={i}>
                  <span>{h.emoji} {h.title}</span>
                  <small>{fmtSeconds(h.seconds)}{h.bugs > 0 && ` · ✏️ ${h.bugs}`}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted history-empty">Ainda não concluiu nenhuma tarefa</p>
          )}
        </section>
      )}

      {/* com um agente selecionado, o feed recolhe-se para não ficar tapado pelos detalhes */}
      <section className={`panel feed${feedFolded || current ? ' folded' : ''}`}>
        <h2>
          Atividade
          <span className="feed-tools">
            {objectivesDone > 0 && <span className="pill">🏆 {objectivesDone} objetivo{objectivesDone > 1 ? 's' : ''}</span>}
            <FoldButton folded={feedFolded} onClick={() => setFeedFolded(!feedFolded)} />
          </span>
        </h2>
        <ol>
          {feed.slice(0, 6).map((e) => (
            <li key={e.id} style={{ '--c': e.color }}>
              <time>{time(e.time)}</time>
              <span>{e.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Ajuda discreta: só mostra os atalhos ao passar o rato */}
      <div className="help" tabIndex={0} aria-label="Atalhos de teclado">
        ?
        <div className="help-pop">
          <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover</div>
          <div><kbd>Q</kbd><kbd>E</kbd> rodar</div>
          <div><kbd>Shift</kbd> mais rápido</div>
          <div>Scroll: zoom</div>
          <div>Clique num agente para o seguir</div>
          <div><kbd>Espaço</kbd> pausa · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> velocidade</div>
        </div>
      </div>
    </>
  )
}
