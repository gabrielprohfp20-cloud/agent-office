// Sons discretos, gerados pelo navegador (Web Audio) — não precisa de ficheiros de áudio.
// Só tocam com a aba visível (para não incomodar quando o escritório está em segundo plano).
let ctx = null
let muted = false

export const setMuted = (m) => { muted = m }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  // o navegador só deixa tocar som depois de o utilizador interagir com a página
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Uma nota curta e suave: frequência (Hz), início (s), duração (s), volume
function note(c, freq, start, dur, vol, type = 'sine') {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = c.currentTime + start
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

const SOUNDS = {
  // tarefa concluída: "tic" agudo e curto
  task: (c) => note(c, 1318, 0, 0.18, 0.05),
  // novo objetivo: duas notas a subir
  start: (c) => { note(c, 523, 0, 0.25, 0.04); note(c, 784, 0.12, 0.3, 0.04) },
  // objetivo concluído: pequeno acorde
  objective: (c) => { note(c, 523, 0, 0.6, 0.04); note(c, 659, 0.1, 0.6, 0.04); note(c, 784, 0.2, 0.8, 0.045) },
  // bug encontrado: nota grave e curta
  bug: (c) => { note(c, 220, 0, 0.22, 0.04, 'triangle'); note(c, 185, 0.12, 0.25, 0.035, 'triangle') },
}

export function play(name) {
  if (muted || typeof document === 'undefined' || document.hidden) return
  const c = audio()
  if (c && SOUNDS[name]) SOUNDS[name](c)
}
