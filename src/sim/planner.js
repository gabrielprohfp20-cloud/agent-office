// O "planeador" do Gestor da Mesa: transforma um objetivo numa lista de tarefas.
// Por agora usa modelos prontos (simulado). Mais tarde será uma IA a fazer este plano.
//
// Cada tarefa tem:
//   role   -> quem a pode fazer (TRADER, ANALYST, RISK, JUNIOR, LEAD)
//   kind   -> tipo: research (notícias), analysis (análise), trade (operar), report (relatório)
//   deps   -> tarefas que têm de estar concluídas antes desta começar
//   status -> 'todo' (a fazer), 'doing' (em curso), 'review' (em revisão), 'done' (concluída)
//   symbol -> (só nas operações) o ativo a operar
import { SYMBOLS } from './market'

const KINDS = {
  research: { emoji: '📰', work: [14, 20] },
  analysis: { emoji: '📊', work: [18, 26], reviewer: 'LEAD' },
  trade: { emoji: '💹', work: [12, 18], reviewer: 'RISK' }, // a "revisão" é a aprovação de risco
  report: { emoji: '📝', work: [12, 18] },
}

const ROLE_FOR = { research: 'JUNIOR', analysis: 'ANALYST', trade: 'TRADER', report: 'JUNIOR' }

const name = (id) => SYMBOLS.find((s) => s.id === id)?.name || id
const names = (ids) => ids.map(name).join(', ').replace(/, ([^,]*)$/, ' e $1')

// Uma sessão de trading típica: notícias -> análise -> operações em paralelo -> relatório
function session(research, symbols, report) {
  return [
    ['research', research],
    ['analysis', `Analisar ${names(symbols)}`, [0], { symbols }],
    ...symbols.map((id) => ['trade', `Operar ${name(id)}`, [1], { symbol: id }]),
    ['report', report, symbols.map((_, i) => i + 2)],
  ]
}

// Objetivos de exemplo que o escritório escolhe sozinho quando não há pedidos
export const PRESETS = [
  { title: 'Sessão de criptomoedas', tasks: session('Ler as notícias de cripto', ['BTC', 'ETH'], 'Relatório da sessão cripto') },
  // 3 operações em paralelo com só 2 traders -> falta gente e a equipa cresce
  { title: 'Sessão de ações', tasks: session('Ler os resultados das empresas', ['AAPL', 'TSLA', 'SPX'], 'Relatório da sessão de ações') },
  { title: 'Ouro e câmbio', tasks: session('Acompanhar o dólar e os juros', ['XAU', 'EUR'], 'Relatório de ouro e câmbio') },
  { title: 'Varredura completa do mercado', tasks: session('Ler as notícias globais', ['BTC', 'NDX', 'XAU', 'EUR'], 'Relatório da varredura') },
]

// Palavras que, num objetivo escrito pelo utilizador, indicam um ativo
const KEYWORDS = [
  [/\b(btc|bitcoin)\b/i, 'BTC'], [/\b(eth|ethereum)\b/i, 'ETH'], [/\b(ouro|gold|xau)\b/i, 'XAU'],
  [/\b(euro|eur)\b/i, 'EUR'], [/\b(apple|aapl)\b/i, 'AAPL'], [/\b(tesla|tsla)\b/i, 'TSLA'],
  [/\b(nasdaq|ndx)\b/i, 'NDX'], [/(s&p|sp500|spx)/i, 'SPX'],
]

// Plano genérico para objetivos escritos pelo utilizador
export function symbolsFor(title) {
  const found = KEYWORDS.filter(([re]) => re.test(title)).map(([, id]) => id)
  if (found.length) return [...new Set(found)].slice(0, 4)
  const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 2).map((s) => s.id)
}

function genericPlan(title) {
  return session(`Pesquisar: ${title}`, symbolsFor(title), `Relatório: ${title}`)
}

const rand = ([a, b]) => a + Math.random() * (b - a)

export function planObjective(title) {
  const preset = PRESETS.find((p) => p.title === title)
  const rows = preset ? preset.tasks : genericPlan(title)
  const objId = `obj${Date.now().toString(36)}` // único, mesmo depois de recarregar a página
  const ids = rows.map((_, i) => `${objId}-t${i + 1}`)
  const tasks = rows.map(([kind, taskTitle, deps = [], extra = {}], i) => ({
    id: ids[i],
    title: taskTitle,
    kind,
    emoji: KINDS[kind].emoji,
    role: ROLE_FOR[kind],
    reviewerRole: KINDS[kind].reviewer || null,
    deps: deps.map((d) => ids[d]),
    status: 'todo',
    assignee: null,
    reviewer: null,
    progress: 0,
    reviewProgress: 0,
    work: rand(KINDS[kind].work), // segundos de trabalho
    bugs: 0,
    ...extra,
  }))
  return { objective: { id: objId, title, status: 'active' }, tasks }
}
