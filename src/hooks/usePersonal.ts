import { TABLAS } from '@/lib/tablas'
import { useTabla } from './useTabla'
import type { Personal } from '@/lib/tipos'

/** Personal de mantenimiento asignable. Solo se pide si el usuario puede asignar. */
export function usePersonal(activo: boolean) {
  return useTabla<Personal>(TABLAS.personal, {}, activo)
}
