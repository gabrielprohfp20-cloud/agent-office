# Agent Office

Escritório 3D em tempo real com uma equipa de agentes de IA, no estilo de um *trading floor*.
Os agentes recebem objetivos, dividem-nos em tarefas, trabalham, revêem o trabalho uns dos
outros e vão tomar café — tudo visível no escritório.

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
| `M` | Ligar / desligar sons |
| Minimapa | Clique para levar a câmara até lá |

## Funcionalidades

- **Escritório 3D** com mesas de trading, sala de reuniões, zona de descanso e ciclo dia/noite ligado à hora real.
- **Cérebro dos agentes**: objetivos → tarefas com dependências → revisões (o QA revê código, o PM revê design) → bugs → objetivo concluído.
- **Quadro de tarefas** (📋 Tarefas) onde também se podem pedir objetivos novos.
- **Estatísticas** (📊) e histórico por agente.
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
    routines.js        "histórias" animadas (visitar colegas, reuniões, café)
    movement.js        andar, sentar, levantar
    navigation.js      caminhos pelo escritório (algoritmo A*)
    store.js           estado partilhado + gravação automática
    market.js          mercado simulado
    sound.js           sons discretos (Web Audio)
    daylight.js        cálculo do dia/noite
  ui/                a interface por cima do 3D (painéis, Kanban, estatísticas, minimapa)
tests/               testes automáticos (Vitest)
```

## Próximas fases

1. ~~Escritório 3D~~ ✅
2. ~~Agentes animados~~ ✅
3. ~~Cérebro simulado~~ ✅
4. Equipa que cresce (contratar agentes)
5. IA real (Claude) + servidor próprio
6. Agentes de trading (primeiro com dinheiro simulado)
