// O "planeador" do PM: transforma um objetivo numa lista de tarefas.
// Por agora usa modelos prontos (simulado). Na Fase 5 será uma IA a fazer este plano.
//
// Cada tarefa tem:
//   role   -> quem a pode fazer (DEV, DESIGN, QA, INTERN, PM)
//   kind   -> tipo: research, design, dev, test, docs
//   deps   -> tarefas que têm de estar concluídas antes desta começar
//   status -> 'todo' (a fazer), 'doing' (em curso), 'review' (em revisão), 'done' (concluída)

const KINDS = {
  research: { emoji: '🔎', work: [16, 22] },
  design: { emoji: '🎨', work: [24, 32], reviewer: 'PM' },
  dev: { emoji: '💻', work: [28, 40], reviewer: 'QA' },
  test: { emoji: '🧪', work: [18, 24] },
  docs: { emoji: '📝', work: [16, 22] },
}

const ROLE_FOR = { research: 'INTERN', design: 'DESIGN', dev: 'DEV', test: 'QA', docs: 'INTERN' }

// Objetivos de exemplo que o escritório escolhe sozinho quando não há pedidos
export const PRESETS = [
  {
    title: 'Painel de alertas de preço',
    tasks: [
      ['research', 'Pesquisar que alertas os traders querem'],
      ['design', 'Desenhar o ecrã de alertas', [0]],
      ['dev', 'Ligar o sistema aos preços do mercado', [0]],
      ['dev', 'Programar os alertas', [1, 2]],
      ['test', 'Teste final dos alertas', [3]],
      ['docs', 'Escrever o manual de utilização', [3]],
    ],
  },
  {
    title: 'Relatório diário do mercado',
    tasks: [
      ['research', 'Recolher dados do BTC, ouro e S&P 500'],
      ['dev', 'Calcular as variações do dia', [0]],
      ['design', 'Desenhar o layout do relatório', [0]],
      ['dev', 'Gerar o relatório automaticamente', [1, 2]],
      ['test', 'Verificar os números do relatório', [3]],
    ],
  },
  {
    title: 'Simulador de carteira',
    tasks: [
      ['research', 'Definir as regras da carteira'],
      ['design', 'Desenhar o painel da carteira', [0]],
      ['dev', 'Programar compras e vendas simuladas', [0]],
      ['dev', 'Mostrar lucro e prejuízo em tempo real', [1, 2]],
      ['test', 'Testar cenários de mercado', [3]],
      ['docs', 'Escrever o guia do simulador', [3]],
    ],
  },
  {
    // Objetivo grande: 3 tarefas de código em paralelo -> com 2 programadores, falta gente
    title: 'Plataforma de análise de mercado',
    tasks: [
      ['research', 'Escolher os indicadores a acompanhar'],
      ['dev', 'Ligar os dados de criptomoedas', [0]],
      ['dev', 'Ligar os dados de ações', [0]],
      ['dev', 'Ligar os dados de matérias-primas', [0]],
      ['design', 'Desenhar o painel principal', [0]],
      ['dev', 'Juntar tudo no painel', [1, 2, 3, 4]],
      ['test', 'Testar a plataforma completa', [5]],
      ['docs', 'Escrever o guia da plataforma', [5]],
    ],
  },
]

// Plano genérico para objetivos escritos pelo utilizador
function genericPlan(title) {
  return [
    ['research', `Pesquisar: ${title}`],
    ['design', `Desenhar a interface de "${title}"`, [0]],
    ['dev', `Preparar os dados para "${title}"`, [0]],
    ['dev', `Programar "${title}"`, [1, 2]],
    ['test', `Teste final de "${title}"`, [3]],
    ['docs', `Documentar "${title}"`, [3]],
  ]
}

const rand = ([a, b]) => a + Math.random() * (b - a)

export function planObjective(title) {
  const preset = PRESETS.find((p) => p.title === title)
  const rows = preset ? preset.tasks : genericPlan(title)
  const objId = `obj${Date.now().toString(36)}` // único, mesmo depois de recarregar a página
  const ids = rows.map((_, i) => `${objId}-t${i + 1}`)
  const tasks = rows.map(([kind, taskTitle, deps = []], i) => ({
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
  }))
  return { objective: { id: objId, title, status: 'active' }, tasks }
}
