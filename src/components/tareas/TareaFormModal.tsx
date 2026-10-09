import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { DatosTarea } from '@/hooks/useTareas'
import { PRIORIDADES, PRIORIDAD_LABEL, type Personal, type Prioridad, type Sucursal, type Tarea } from '@/lib/tipos'

export function TareaFormModal({
  abierto,
  tarea,
  sucursales,
  personal,
  sucursalFija,
  onCerrar,
  onGuardado,
  crear,
  editar,
}: {
  abierto: boolean
  /** null = registrar, con valor = editar */
  tarea: Tarea | null
  sucursales: Sucursal[]
  personal: Personal[]
  /** Sucursal del gerente: no se puede cambiar. Undefined para el admin. */
  sucursalFija?: string
  onCerrar: () => void
  onGuardado: () => void
  crear: (datos: DatosTarea) => Promise<{ error: string | null }>
  editar: (id: string, datos: DatosTarea) => Promise<{ error: string | null }>
}) {
  const [sucursalId, setSucursalId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [asignadoA, setAsignadoA] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setSucursalId(tarea?.sucursalId ?? sucursalFija ?? '')
    setTitulo(tarea?.titulo ?? '')
    setDescripcion(tarea?.descripcion ?? '')
    setPrioridad(tarea?.prioridad ?? 'media')
    setAsignadoA(tarea?.asignadoA ?? '')
    setError(null)
  }, [abierto, tarea, sucursalFija])

  // Solo el personal que cubre la sucursal elegida.
  const asignables = useMemo(
    () => personal.filter((p) => p.sucursales.includes(sucursalId)),
    [personal, sucursalId],
  )
  const sucursalesVisibles = sucursales.filter((s) => s.activo || s.id === tarea?.sucursalId)

  function cambiarSucursal(id: string) {
    setSucursalId(id)
    // Si el asignado ya no cubre la nueva sucursal, se des-asigna.
    if (asignadoA && !personal.some((p) => p.usuario === asignadoA && p.sucursales.includes(id))) setAsignadoA('')
  }

  async function onGuardar() {
    const t = titulo.trim()
    if (!sucursalId) return setError('Elige la sucursal.')
    if (!t) return setError('El título es obligatorio.')
    setGuardando(true)
    setError(null)
    const datos: DatosTarea = { sucursalId, titulo: t, descripcion: descripcion.trim(), prioridad, asignadoA }
    const { error: err } = tarea ? await editar(tarea.id, datos) : await crear(datos)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(tarea ? 'Tarea actualizada.' : 'Tarea registrada.')
    onGuardado()
  }

  // El asignado actual puede no estar en la lista (p. ej. fue desactivado): se mantiene visible.
  const asignadoFueraDeLista = asignadoA !== '' && !asignables.some((p) => p.usuario === asignadoA)

  return (
    <Modal
      abierto={abierto}
      titulo={tarea ? `Editar tarea #${tarea.folio}` : 'Nueva tarea'}
      onCerrar={onCerrar}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : tarea ? 'Guardar' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Sucursal *">
          <Select
            value={sucursalId}
            onChange={(e) => cambiarSucursal(e.target.value)}
            disabled={sucursalFija !== undefined}
          >
            <option value="">Elegir sucursal…</option>
            {sucursalesVisibles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título *" hint="Ej.: Foco quemado en bodega. Máximo 80 caracteres.">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} autoFocus />
        </Field>
        <Field label="Descripción">
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridad">
            <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {PRIORIDAD_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Asignar a"
            hint={sucursalId && asignables.length === 0 ? 'Ningún personal cubre esta sucursal.' : undefined}
            warning={asignadoFueraDeLista ? 'El asignado actual ya no cubre esta sucursal.' : undefined}
          >
            <Select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} disabled={!sucursalId}>
              <option value="">Sin asignar</option>
              {asignadoFueraDeLista && <option value={asignadoA}>{asignadoA}</option>}
              {asignables.map((p) => (
                <option key={p.usuario} value={p.usuario}>
                  {p.usuario}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
