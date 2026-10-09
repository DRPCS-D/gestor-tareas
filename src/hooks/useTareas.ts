import { ejecutar, useListaApi } from './useListaApi'
import type { Prioridad, Tarea } from '@/lib/tipos'

export interface DatosTarea {
  sucursalId: string
  titulo: string
  descripcion: string
  prioridad: Prioridad
  asignadoA: string
}

/** Tareas visibles para el usuario actual: el backend ya filtra por rol. */
export function useTareas() {
  const lista = useListaApi<Tarea>('listTareas', 'tareas', 'No se pudieron cargar las tareas.')

  const crear = (datos: DatosTarea) =>
    ejecutar('createTarea', { ...datos }, 'No se pudo registrar la tarea.')
  const editar = (id: string, datos: DatosTarea) =>
    ejecutar('updateTarea', { id, ...datos }, 'No se pudo guardar la tarea.')
  const completar = (id: string, nota: string) =>
    ejecutar('completarTarea', { id, nota }, 'No se pudo completar la tarea.')
  const reabrir = (id: string) => ejecutar('reabrirTarea', { id }, 'No se pudo reabrir la tarea.')
  const eliminar = (id: string) => ejecutar('deleteTarea', { id }, 'No se pudo borrar la tarea.')

  return { ...lista, crear, editar, completar, reabrir, eliminar }
}
