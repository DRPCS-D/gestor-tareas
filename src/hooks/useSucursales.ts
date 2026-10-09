import { useMemo } from 'react'
import { ejecutar, useListaApi } from './useListaApi'
import type { Sucursal } from '@/lib/tipos'

export interface DatosSucursal {
  nombre: string
  direccion: string
  activo: boolean
}

export function useSucursales() {
  const lista = useListaApi<Sucursal>('listSucursales', 'sucursales', 'No se pudieron cargar las sucursales.')

  /** id → nombre, para mostrar la sucursal de cada tarea. */
  const nombres = useMemo(() => new Map(lista.data.map((s) => [s.id, s.nombre])), [lista.data])

  const crear = (datos: DatosSucursal) =>
    ejecutar('createSucursal', { ...datos }, 'No se pudo crear la sucursal.')
  const editar = (id: string, datos: DatosSucursal) =>
    ejecutar('updateSucursal', { id, ...datos }, 'No se pudo guardar la sucursal.')
  const eliminar = (id: string) => ejecutar('deleteSucursal', { id }, 'No se pudo borrar la sucursal.')

  return { ...lista, nombres, crear, editar, eliminar }
}
