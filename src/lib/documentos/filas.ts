/** Datos comunes de los documentos (PDF y Excel) de la lista de tareas: una fila por tarea. */
import { formatFecha, formatFechaHora } from '@/lib/format'
import { ESTADO_LABEL, PRIORIDAD_LABEL, type Tarea } from '@/lib/tipos'

export interface FilaTarea {
  folio: string
  fecha: string
  sucursal: string
  titulo: string
  descripcion: string
  prioridad: string
  estado: string
  asignada: string
  creadaPor: string
  /** Fecha y hora en que se completó o canceló; vacío si sigue pendiente. */
  cierre: string
  cerradaPor: string
}

export function filasTareas(tareas: Tarea[], nombreSucursal: (id: string) => string): FilaTarea[] {
  return tareas.map((t) => ({
    folio: t.folio,
    fecha: formatFecha(t.fechaCreacion),
    sucursal: nombreSucursal(t.sucursalId),
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: PRIORIDAD_LABEL[t.prioridad],
    estado: ESTADO_LABEL[t.estado],
    asignada: t.asignadoNombre || t.asignadoA,
    creadaPor: t.creadoNombre || t.creadoPor,
    cierre: t.fechaCompletada ? formatFechaHora(t.fechaCompletada) : '',
    cerradaPor: t.completadoNombre || t.completadoPor,
  }))
}

/** `tareas-2026-11-02.pdf` */
export function nombreArchivo(extension: 'pdf' | 'xlsx', hoy = new Date()): string {
  const d = [hoy.getFullYear(), String(hoy.getMonth() + 1).padStart(2, '0'), String(hoy.getDate()).padStart(2, '0')].join('-')
  return `tareas-${d}.${extension}`
}
