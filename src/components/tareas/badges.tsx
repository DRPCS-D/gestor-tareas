import { Badge, type TonoBadge } from '@/components/ui/badge'
import { ESTADO_LABEL, PRIORIDAD_LABEL, type EstadoTarea, type Prioridad } from '@/lib/tipos'

const TONO_PRIORIDAD: Record<Prioridad, TonoBadge> = {
  baja: 'neutral',
  media: 'primary',
  alta: 'warning',
  urgente: 'danger',
}

export function BadgePrioridad({ prioridad }: { prioridad: Prioridad }) {
  return <Badge tono={TONO_PRIORIDAD[prioridad]}>{PRIORIDAD_LABEL[prioridad]}</Badge>
}

export function BadgeEstado({ estado }: { estado: EstadoTarea }) {
  const tono: TonoBadge = estado === 'completada' ? 'success' : estado === 'cancelada' ? 'neutral' : 'warning'
  return <Badge tono={tono}>{ESTADO_LABEL[estado]}</Badge>
}
