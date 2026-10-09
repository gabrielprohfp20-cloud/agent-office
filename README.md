# Agent Office

Escritório 3D em tempo real com uma mesa de trading de agentes de IA.
Os agentes recebem objetivos, analisam o mercado, abrem e fecham operações, passam pelo
controlo de risco e vão tomar café — tudo visível no escritório.

> Por agora a "inteligência" é **simulada** (sem IA real e sem custos), e os preços nos ecrãs
> vêm de um **mercado simulado**. Nenhum dinheiro real está envolvido.

## Como abrir

Precisa do [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Depois abra <http://localhost:5173> no navegador.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o escritório em modo de desenvolvimento |
| `npm test` | Corre os testes automáticos |
| `npm run build` | Cria a versão final na pasta `dist/` |

## Controlos

| Tecla / ação | Efeito |
|---|---|
| `W` `A` `S` `D` / setas | Mover a câmara |
| `Q` / `E` | Rodar a câmara |
| `Shift` | Mover mais depressa |
| Scroll do rato | Zoom |
| Clique num agente | Seguir o agente e ver detalhes (✏️ para personalizar) |
| `Espaço` | Pausa / continuar |
| `1` `2` `3` | Velocidade 1x / 2x / 4x |

## Funcionalidades

- **Escritório 3D** com mesas de trading, sala de reuniões, zona de descanso e ciclo dia/noite ligado à hora real.
- **Mesa de trading (paper trading)**: carteira com $100.000 virtuais. Notícias → análise → os traders operam (LONG/SHORT) segundo a sua estratégia → o Gestor de Risco aprova ou bloqueia → as posições fecham no alvo, no stop ou ao fim de 2 minutos.
- **Funções**: Gestor da Mesa (planeia e revê análises), Traders (estratégias: seguir a tendência, reversão à média, rompimento), Analista, Gestor de Risco (limites: 8% por operação, 50% investido no máximo, 6 posições, parar após perder 3% na sessão) e Analista Júnior (notícias e relatórios).
- **Carteira** (💼): património, resultado, posições abertas e operações fechadas.
- **Quadro de tarefas** (📋 Tarefas) onde também se podem pedir objetivos novos.
- **Estatísticas** (📊) e histórico por agente.
- **Equipa que cresce**: se há trabalho à espera e ninguém livre com a função certa, o Gestor da Mesa contrata alguém (até 10 pessoas). Também se pode contratar no botão "+ Contratar agente". Os contratados entram pela porta e ganham uma mesa nova.
- **Gravação automática** no navegador: ao recarregar, tudo continua de onde estava.
- **Continua a trabalhar com a aba escondida** (o ritmo vem de um Web Worker).

## Estrutura do código

```
src/
  App.jsx            arranca o 3D, a interface e o motor da simulação
  data/office.js     agentes (nomes, cores, funções) e mesas
  scene/             tudo o que é 3D
    Scene.jsx          luzes, câmara, dia/noite, mesas e agentes
    Office.jsx         o edifício (chão, paredes, salas)
    Furniture.jsx      mobília
    Agent.jsx          personagem 3D, animações e balão
    screens.js         texturas dos ecrãs (gráficos, quadros, cidade)
  sim/               a simulação (sem 3D)
    engine.js          arranca mercado + cérebro + movimento
    clock.js           relógio (Web Worker, velocidade, pausa)
    brain.js           o cérebro: objetivos, tarefas, revisões, pausas
    planner.js         divide um objetivo em tarefas
    team.js            contratar agentes (mesas novas, entrada pela porta)
    trading.js         estratégias, regras de risco, posições e lucro/prejuízo
    routines.js        "histórias" animadas (visitar colegas, reuniões, café)
    movement.js        andar, sentar, levantar
    navigation.js      caminhos pelo escritório (algoritmo A*)
    store.js           estado partilhado + gravação automática
    market.js          mercado simulado
    daylight.js        cálculo do dia/noite
  ui/                a interface por cima do 3D (painéis, Kanban, estatísticas)
tests/               testes automáticos (Vitest)
```

## Próximas fases

1. ~~Escritório 3D~~ ✅
2. ~~Agentes animados~~ ✅
3. ~~Cérebro simulado~~ ✅
4. ~~Equipa que cresce~~ ✅
5. ~~Trading simulado (paper trading)~~ ✅
6. IA real (Claude) + servidor próprio
