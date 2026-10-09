import { useCallback, useEffect, useState } from 'react'
import { callApi, conCredenciales } from '@/lib/appsScript'

interface Estado<T> {
  data: T[]
  loading: boolean
  error: string | null
}

/**
 * Carga una lista desde una acción de Apps Script y la expone con
 * loading/error/refetch. `clave` es la propiedad de la respuesta que trae
 * el arreglo (p. ej. 'tareas'). Con `activo=false` no hace la llamada.
 */
export function useListaApi<T>(
  accion: string,
  clave: string,
  mensajeError: string,
  payload: Record<string, unknown> = {},
  activo = true,
) {
  const [estado, setEstado] = useState<Estado<T>>({ data: [], loading: activo, error: null })
  const payloadJson = JSON.stringify(payload)

  const refetch = useCallback(async () => {
    setEstado((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await callApi<Record<string, T[]>>(accion, conCredenciales(JSON.parse(payloadJson)))
      setEstado({ data: data[clave] || [], loading: false, error: null })
    } catch (e) {
      setEstado({ data: [], loading: false, error: e instanceof Error ? e.message : mensajeError })
    }
  }, [accion, clave, mensajeError, payloadJson])

  useEffect(() => {
    if (activo) refetch()
    else setEstado({ data: [], loading: false, error: null })
  }, [activo, refetch])

  return { ...estado, refetch }
}

/** Ejecuta una acción y devuelve `{ error }` en vez de lanzar. */
export async function ejecutar(
  accion: string,
  payload: Record<string, unknown>,
  mensajeError: string,
): Promise<{ error: string | null }> {
  try {
    await callApi(accion, conCredenciales(payload))
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : mensajeError }
  }
}
