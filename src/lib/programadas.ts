import type { Programada } from './tipos'

const DIAS_CORTOS = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** 'yyyy-MM-dd' → 'dd/MM/yyyy' (el backend ya manda la hora local, no hay huso que convertir). */
export function formatFechaLocal(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

/** 'yyyy-MM-dd HH:mm' → 'dd/MM/yyyy HH:mm'; vacío si no hay. */
export function formatFechaHoraLocal(valor: string): string {
  if (!valor) return '—'
  return `${formatFechaLocal(valor)} ${valor.slice(11, 16)}`.trim()
}

/** Hoy en hora local, como 'yyyy-MM-dd' (para el valor inicial de un <input type="date">). */
export function hoyLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Frase corta: «Cada 7 días · 08:00», «lun, jue · 09:30», «Día 5 de cada mes · 08:00». */
export function describirFrecuencia(p: Programada): string {
  switch (p.tipo) {
    case 'una':
      return `Una vez · ${formatFechaLocal(p.fechaInicio)} ${p.hora}`
    case 'dias':
      return `${p.intervalo === 1 ? 'Todos los días' : `Cada ${p.intervalo} días`} · ${p.hora}`
    case 'semanal': {
      const dias = p.diasSemana.map((d) => DIAS_CORTOS[d]).join(', ')
      return `${p.intervalo === 1 ? 'Cada semana' : `Cada ${p.intervalo} semanas`}: ${dias} · ${p.hora}`
    }
    case 'mensual':
      return `Día ${p.diaMes} ${p.intervalo === 1 ? 'de cada mes' : `cada ${p.intervalo} meses`} · ${p.hora}`
  }
}

export type EstadoProgramada = 'activa' | 'pausada' | 'finalizada'

export function estadoProgramada(p: Programada): EstadoProgramada {
  // Una de una sola vez se desactiva sola al cumplirse; eso es «finalizada», no «pausada».
  if (!p.activo) return p.tipo === 'una' && p.ultima >= `${p.fechaInicio} ${p.hora}` ? 'finalizada' : 'pausada'
  return p.proxima ? 'activa' : 'finalizada'
}
