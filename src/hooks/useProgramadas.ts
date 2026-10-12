import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Prioridad, Programada, TipoProgramada } from '@/lib/tipos'
import { useTabla } from './useTabla'

export interface DatosProgramada {
  sucursalId: string
  titulo: string
  descripcion: string
  prioridad: Prioridad
  asignadoA: string
  tipo: TipoProgramada
  intervalo: number
  diasSemana: number[]
  diaMes: number
  hora: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
}

/** Tareas programadas visibles para el usuario (admin: todas; gerente: las de su sucursal). */
export function useProgramadas(activo = true) {
  const lista = useTabla<Programada>(TABLAS.programadas, {}, activo)

  const crear = (datos: DatosProgramada) =>
    ejecutar('createProgramada', { ...datos }, 'No se pudo guardar la tarea programada.')
  const editar = (id: string, datos: DatosProgramada) =>
    ejecutar('updateProgramada', { id, ...datos }, 'No se pudo guardar la tarea programada.')
  const eliminar = (id: string) => ejecutar('deleteProgramada', { id }, 'No se pudo borrar la tarea programada.')
  /** Crea ya una tarea desde la plantilla, sin cambiar su calendario. */
  const crearAhora = (id: string) => ejecutar('ejecutarProgramada', { id }, 'No se pudo crear la tarea.')

  return { ...lista, crear, editar, eliminar, crearAhora }
}
