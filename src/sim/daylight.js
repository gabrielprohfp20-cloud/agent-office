// Ciclo dia/noite ligado à hora real do computador.
// daylight = 0 (noite) … 1 (dia). Amanhecer 6h–8h, anoitecer 18h–20h30.
const smooth = (t) => t * t * (3 - 2 * t)

export function daylightAt(hours) {
  if (hours < 6 || hours >= 20.5) return 0
  if (hours < 8) return smooth((hours - 6) / 2)
  if (hours < 18) return 1
  return 1 - smooth((hours - 18) / 2.5)
}

// Hora atual em horas decimais (ex.: 14,5 = 14h30).
// Em modo de desenvolvimento, window.__hour permite testar outras horas.
export function currentHours() {
  if (typeof window !== 'undefined' && typeof window.__hour === 'number') return window.__hour
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

export const getDaylight = () => daylightAt(currentHours())
