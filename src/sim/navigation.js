// Navegação: descobre um caminho pelo escritório que desvia dos móveis.
// O chão é dividido numa grelha de quadradinhos de 25 cm. Os quadradinhos ocupados
// por móveis ficam "bloqueados" e o algoritmo A* (usado em muitos jogos) encontra
// o caminho mais curto entre os livres.

const CELL = 0.25
const MIN_X = -11.7, MAX_X = 11.7, MIN_Z = -7.7, MAX_Z = 7.7
const COLS = Math.round((MAX_X - MIN_X) / CELL) + 1
const ROWS = Math.round((MAX_Z - MIN_Z) / CELL) + 1
const PAD = 0.28 // margem à volta dos móveis (a "largura" do agente)

// Retângulos ocupados: [x1, z1, x2, z2]
const STATIC_OBSTACLES = [
  [6.4, -5.2, 9.6, -3.8],    // mesa de reuniões
  [5.4, -1.1, 12, -0.9],     // parede de vidro (frente)
  [4.0, -8, 4.2, -1],        // parede de vidro (lado)
  [2.5, -8, 3.9, -7.5],      // estante do fundo
  [-12, 0.8, -11.5, 3.7],    // estantes da esquerda
  [6.9, 6.55, 9.1, 7.35],    // sofá grande
  [4.85, 4.4, 5.75, 6.0],    // sofá pequeno
  [7.3, 4.8, 8.7, 5.6],      // mesa de centro
  [10.3, 4.65, 11.2, 5.75],  // poltrona
  [10.75, 6.55, 11.05, 6.85], // luminária de chão
  [8.8, 0.9, 11.8, 1.6],     // balcão da cozinha
  [8.0, 1.05, 8.4, 1.45],    // garrafão de água
  [-7.1, 5.45, -4.9, 5.75],  // painel holográfico
  ...[[11.3, -7.3], [11.3, 7.3], [4.8, 7.3], [-11.3, -7.3], [0.6, -7.4], [-11.3, 7.4], [1.5, 3.5]]
    .map(([x, z]) => [x - 0.25, z - 0.25, x + 0.25, z + 0.25]), // plantas
]

let blocked = new Uint8Array(COLS * ROWS)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const idx = (c, r) => r * COLS + c
const toCell = (x, z) => [
  clamp(Math.round((x - MIN_X) / CELL), 0, COLS - 1),
  clamp(Math.round((z - MIN_Z) / CELL), 0, ROWS - 1),
]
const toWorld = (c, r) => [MIN_X + c * CELL, MIN_Z + r * CELL]

// Constrói a grelha. Chamado outra vez quando houver mesas novas (Fase 4).
export function buildGrid(desks) {
  blocked = new Uint8Array(COLS * ROWS)
  const deskRects = desks.map(({ position: [x, , z] }) => [x - 0.85, z - 1.05, x + 0.85, z + 0.45])
  for (const [x1, z1, x2, z2] of [...STATIC_OBSTACLES, ...deskRects]) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const [x, z] = toWorld(c, r)
        if (x >= x1 - PAD && x <= x2 + PAD && z >= z1 - PAD && z <= z2 + PAD) blocked[idx(c, r)] = 1
      }
    }
  }
}

function isFree(x, z) {
  const [c, r] = toCell(x, z)
  return !blocked[idx(c, r)]
}

// Há linha de vista direta entre dois pontos (sem móveis pelo meio)?
function lineOfSight([ax, az], [bx, bz]) {
  const d = Math.hypot(bx - ax, bz - az)
  const steps = Math.ceil(d / (CELL / 2))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (!isFree(ax + (bx - ax) * t, az + (bz - az) * t)) return false
  }
  return true
}

// Se um ponto calhar dentro de um móvel, procura o quadradinho livre mais próximo.
function nearestFree(c, r) {
  if (!blocked[idx(c, r)]) return [c, r]
  for (let rad = 1; rad < 20; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const nc = c + dc, nr = r + dr
        if (nc >= 0 && nr >= 0 && nc < COLS && nr < ROWS && !blocked[idx(nc, nr)]) return [nc, nr]
      }
    }
  }
  return [c, r]
}

// Fila de prioridade simples (heap binário) para o A*
class Heap {
  constructor() { this.a = [] }
  get size() { return this.a.length }
  push(item, f) {
    const a = this.a
    a.push([f, item])
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p][0] <= a[i][0]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1, r = l + 1
        let m = i
        if (l < a.length && a[l][0] < a[m][0]) m = l
        if (r < a.length && a[r][0] < a[m][0]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top[1]
  }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]]

// Devolve a lista de pontos [x, z] a percorrer (sem o ponto de partida).
export function findPath(from, to) {
  const [sc, sr] = nearestFree(...toCell(from[0], from[1]))
  const [ec, er] = nearestFree(...toCell(to[0], to[1]))
  const start = idx(sc, sr), end = idx(ec, er)

  const g = new Float32Array(COLS * ROWS).fill(Infinity)
  const came = new Int32Array(COLS * ROWS).fill(-1)
  const open = new Heap()
  const h = (c, r) => Math.hypot(c - ec, r - er)
  g[start] = 0
  open.push(start, h(sc, sr))

  while (open.size) {
    const cur = open.pop()
    if (cur === end) break
    const c = cur % COLS, r = (cur / COLS) | 0
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc, nr = r + dr
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue
      const n = idx(nc, nr)
      if (blocked[n]) continue
      // não cortar cantos na diagonal
      if (dc && dr && (blocked[idx(c + dc, r)] || blocked[idx(c, r + dr)])) continue
      const ng = g[cur] + cost
      if (ng < g[n]) {
        g[n] = ng
        came[n] = cur
        open.push(n, ng + h(nc, nr))
      }
    }
  }

  // Reconstruir o caminho de trás para a frente
  const cells = []
  if (start === end || came[end] !== -1) {
    for (let n = end; n !== -1 && n !== start; n = came[n]) cells.push(toWorld(n % COLS, (n / COLS) | 0))
  }
  cells.reverse()
  const pts = [[from[0], from[1]], ...cells, [to[0], to[1]]]

  // Alisar: saltar pontos intermédios quando há linha de vista direta
  const out = []
  let i = 0
  while (i < pts.length - 1) {
    let j = pts.length - 1
    while (j > i + 1 && !lineOfSight(pts[i], pts[j])) j--
    out.push(pts[j])
    i = j
  }
  return out
}
