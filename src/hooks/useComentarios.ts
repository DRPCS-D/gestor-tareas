import { ejecutar } from '@/lib/ejecutar'
import { TABLAS } from '@/lib/tablas'
import type { Comentario } from '@/lib/tipos'
import { useTabla } from './useTabla'

/** Comentarios de una tarea. Con `tareaId` null no carga nada. */
export function useComentarios(tareaId: string | null) {
  const lista = useTabla<Comentario>(TABLAS.comentarios, { tareaId }, tareaId !== null)

  const agregar = (texto: string) =>
    ejecutar('createComentario', { tareaId, texto }, 'No se pudo guardar el comentario.')

  return { ...lista, agregar }
}
