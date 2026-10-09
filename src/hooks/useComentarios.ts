import { ejecutar, useListaApi } from './useListaApi'
import type { Comentario } from '@/lib/tipos'

/** Comentarios de una tarea. Con `tareaId` null no carga nada. */
export function useComentarios(tareaId: string | null) {
  const lista = useListaApi<Comentario>(
    'listComentarios',
    'comentarios',
    'No se pudieron cargar los comentarios.',
    { tareaId },
    tareaId !== null,
  )

  const agregar = (texto: string) =>
    ejecutar('createComentario', { tareaId, texto }, 'No se pudo guardar el comentario.')

  return { ...lista, agregar }
}
