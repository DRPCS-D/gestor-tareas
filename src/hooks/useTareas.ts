import { ejecutar, ejecutarConDatos } from '@/lib/ejecutar'
import { guardarRegistro, quitarDeLista } from '@/lib/parches'
import { TABLAS, parchearTabla } from '@/lib/tablas'
import { useTabla } from './useTabla'
import type { Prioridad, Tarea } from '@/lib/tipos'

export interface DatosTarea {
  sucursalId: string
  titulo: string
  descripcion: string
  prioridad: Prioridad
  asignadoA: string
}

/** Pone en la lista la tarea que el backend acaba de confirmar, sin esperar a bajar todas de nuevo. */
async function guardando(accion: string, payload: Record<string, unknown>, mensajeError: string) {
  const r = await ejecutarConDatos<{ tarea?: Tarea }>(accion, payload, mensajeError)
  const tarea = r.data?.tarea
  if (!r.error && tarea) parchearTabla(TABLAS.tareas, {}, (lista) => guardarRegistro(lista as Tarea[], tarea))
  return { error: r.error }
}

/** Tareas visibles para el usuario actual: el backend ya filtra por rol. */
export function useTareas() {
  const lista = useTabla<Tarea>(TABLAS.tareas)

  const crear = (datos: DatosTarea) => guardando('createTarea', { ...datos }, 'No se pudo registrar la tarea.')
  const editar = (id: string, datos: DatosTarea) =>
    guardando('updateTarea', { id, ...datos }, 'No se pudo guardar la tarea.')
  const completar = (id: string, nota: string) =>
    guardando('completarTarea', { id, nota }, 'No se pudo completar la tarea.')
  const cancelar = (id: string, nota: string) =>
    guardando('cancelarTarea', { id, nota }, 'No se pudo cancelar la tarea.')
  const reabrir = (id: string) => guardando('reabrirTarea', { id }, 'No se pudo reabrir la tarea.')
  const eliminar = async (id: string) => {
    const r = await ejecutar('deleteTarea', { id }, 'No se pudo borrar la tarea.')
    if (!r.error) parchearTabla(TABLAS.tareas, {}, (lista) => quitarDeLista(lista as Tarea[], id))
    return r
  }

  return { ...lista, crear, editar, completar, cancelar, reabrir, eliminar }
}
