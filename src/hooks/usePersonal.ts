import { useListaApi } from './useListaApi'
import type { Personal } from '@/lib/tipos'

/** Personal de mantenimiento asignable. Solo se pide si el usuario puede asignar. */
export function usePersonal(activo: boolean) {
  return useListaApi<Personal>('listPersonal', 'personal', 'No se pudo cargar el personal.', {}, activo)
}
