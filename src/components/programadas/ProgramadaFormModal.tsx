import { Play, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { DatosProgramada } from '@/hooks/useProgramadas'
import { estadoProgramada, hoyLocal } from '@/lib/programadas'
import {
  DIAS_SEMANA,
  PRIORIDADES,
  PRIORIDAD_LABEL,
  TIPO_PROGRAMADA_LABEL,
  type Personal,
  type Prioridad,
  type Programada,
  type Sucursal,
  type TipoProgramada,
} from '@/lib/tipos'
import { cn } from '@/lib/utils'

const TIPOS: TipoProgramada[] = ['una', 'dias', 'semanal', 'mensual']

export function ProgramadaFormModal({
  abierto,
  programada,
  sucursales,
  personal,
  sucursalFija,
  onCerrar,
  onGuardado,
  onBorrar,
  puedeBorrar,
  crear,
  editar,
  crearAhora,
}: {
  abierto: boolean
  /** null = nueva, con valor = editar */
  programada: Programada | null
  sucursales: Sucursal[]
  personal: Personal[]
  /** Sucursal del gerente: no se puede cambiar. Undefined para el admin. */
  sucursalFija?: string
  onCerrar: () => void
  onGuardado: () => void
  onBorrar: () => void
  /** Solo admin. */
  puedeBorrar: boolean
  crear: (datos: DatosProgramada) => Promise<{ error: string | null }>
  editar: (id: string, datos: DatosProgramada) => Promise<{ error: string | null }>
  crearAhora: (id: string) => Promise<{ error: string | null }>
}) {
  const [sucursalId, setSucursalId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [asignadoA, setAsignadoA] = useState('')
  const [tipo, setTipo] = useState<TipoProgramada>('semanal')
  const [intervalo, setIntervalo] = useState('1')
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [diaMes, setDiaMes] = useState('1')
  const [hora, setHora] = useState('08:00')
  const [fechaInicio, setFechaInicio] = useState(hoyLocal())
  const [fechaFin, setFechaFin] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setSucursalId(programada?.sucursalId ?? sucursalFija ?? '')
    setTitulo(programada?.titulo ?? '')
    setDescripcion(programada?.descripcion ?? '')
    setPrioridad(programada?.prioridad ?? 'media')
    setAsignadoA(programada?.asignadoA ?? '')
    setTipo(programada?.tipo ?? 'semanal')
    setIntervalo(String(programada?.intervalo ?? (programada?.tipo === 'dias' ? 7 : 1)))
    setDiasSemana(programada?.diasSemana ?? [])
    setDiaMes(String(programada?.diaMes ?? 1))
    setHora(programada?.hora ?? '08:00')
    setFechaInicio(programada?.fechaInicio ?? hoyLocal())
    setFechaFin(programada?.fechaFin ?? '')
    setActivo(programada?.activo ?? true)
    setError(null)
  }, [abierto, programada, sucursalFija])

  const asignables = useMemo(
    () => personal.filter((p) => p.sucursales.includes(sucursalId)),
    [personal, sucursalId],
  )
  const sucursalesVisibles = sucursales.filter((s) => s.activo || s.id === programada?.sucursalId)
  // Se puede pausar en este mismo formulario, pero el borrado exige que ya esté guardada como pausada.
  const estaActiva = programada !== null && estadoProgramada(programada) === 'activa'
  const asignadoFueraDeLista = asignadoA !== '' && !asignables.some((p) => p.usuario === asignadoA)

  function cambiarSucursal(id: string) {
    setSucursalId(id)
    if (asignadoA && !personal.some((p) => p.usuario === asignadoA && p.sucursales.includes(id))) setAsignadoA('')
  }

  function cambiarTipo(t: TipoProgramada) {
    setTipo(t)
    // «Cada N días» suele ser 7, 14, 30…; para semanas y meses lo normal es 1.
    if (t === 'dias' && (intervalo === '' || intervalo === '1')) setIntervalo('7')
    if ((t === 'semanal' || t === 'mensual') && Number(intervalo) > 12) setIntervalo('1')
  }

  function alternarDia(d: number) {
    setDiasSemana((actuales) => (actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d].sort()))
  }

  async function onGuardar() {
    if (!sucursalId) return setError('Elige la sucursal.')
    if (!titulo.trim()) return setError('El título es obligatorio.')
    if (!fechaInicio) return setError('Indica la fecha.')
    if (tipo === 'semanal' && diasSemana.length === 0) return setError('Elige al menos un día de la semana.')

    setGuardando(true)
    setError(null)
    const datos: DatosProgramada = {
      sucursalId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      prioridad,
      asignadoA,
      tipo,
      intervalo: Number(intervalo) || 1,
      diasSemana,
      diaMes: Number(diaMes) || 1,
      hora: hora || '08:00',
      fechaInicio,
      fechaFin: tipo === 'una' ? '' : fechaFin,
      activo,
    }
    const { error: err } = programada ? await editar(programada.id, datos) : await crear(datos)
    setGuardando(false)
    if (err) return setError(err)
    toast.success(programada ? 'Tarea programada actualizada.' : 'Tarea programada creada.')
    onGuardado()
  }

  async function onCrearAhora() {
    if (!programada) return
    setGuardando(true)
    const { error: err } = await crearAhora(programada.id)
    setGuardando(false)
    if (err) return setError(err)
    toast.success('Tarea creada en la lista de tareas.')
  }

  return (
    <Modal
      abierto={abierto}
      titulo={programada ? 'Editar tarea programada' : 'Nueva tarea programada'}
      descripcion="Se crea sola en la lista de tareas, en la fecha y hora indicadas."
      onCerrar={onCerrar}
      ancho="max-w-2xl"
      footer={
        <>
          {programada && (
            <>
              {puedeBorrar && (
                <Button
                  variant="outline"
                  onClick={onBorrar}
                  disabled={guardando || estaActiva}
                  title={estaActiva ? 'Pausa la tarea programada para poder borrarla' : undefined}
                >
                  <Trash2 className="text-destructive" /> Borrar
                </Button>
              )}
              <Button variant="outline" onClick={onCrearAhora} disabled={guardando} title="No cambia el calendario">
                <Play /> Crear una ahora
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : programada ? 'Guardar' : 'Crear'}
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
        <Field label="Título *" hint="Es el título de cada tarea que se cree. Máximo 80 caracteres.">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} autoFocus />
        </Field>
        <Field label="Descripción">
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} maxLength={2000} />
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
                  {p.nombre ? `${p.nombre} (${p.usuario})` : p.usuario}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="space-y-4 rounded-md border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Cuándo se crea</legend>

          <Field label="Se repite">
            <Select value={tipo} onChange={(e) => cambiarTipo(e.target.value as TipoProgramada)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_PROGRAMADA_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>

          {tipo === 'dias' && (
            <Field label="Cada cuántos días" hint="Por ejemplo 7 = una vez por semana, 30 = una vez al mes.">
              <Input type="number" min={1} max={365} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className="max-w-32" />
            </Field>
          )}

          {tipo === 'semanal' && (
            <>
              <Field label="Cada cuántas semanas" hint="1 = todas las semanas, 2 = una sí y una no.">
                <Input type="number" min={1} max={12} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} className="max-w-32" />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Días de la semana</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((d) => {
                    const elegido = diasSemana.includes(d.valor)
                    return (
                      <button
                        key={d.valor}
                        type="button"
                        title={d.largo}
                        aria-label={d.largo}
                        aria-pressed={elegido}
                        onClick={() => alternarDia(d.valor)}
                        className={cn(
                          'size-9 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          elegido
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {d.corto}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {tipo === 'mensual' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Día del mes" hint="Si el mes no tiene ese día (31 en abril), se usa el último.">
                <Input type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(e.target.value)} />
              </Field>
              <Field label="Cada cuántos meses" hint="1 = todos los meses.">
                <Input type="number" min={1} max={12} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
              </Field>
            </div>
          )}

          <div className={cn('grid gap-4', tipo === 'una' ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
            <Field label={tipo === 'una' ? 'Fecha *' : 'Empieza el *'}>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </Field>
            {tipo !== 'una' && (
              <Field label="Termina el" hint="Opcional.">
                <Input type="date" value={fechaFin} min={fechaInicio} onChange={(e) => setFechaFin(e.target.value)} />
              </Field>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Las fechas que ya pasaron no generan tareas. Cada hora el sistema revisa y crea las que tocan.
          </p>
        </fieldset>

        {programada && (
          <Field label="Estado">
            <Select value={activo ? '1' : '0'} onChange={(e) => setActivo(e.target.value === '1')} className="max-w-48">
              <option value="1">Activa</option>
              <option value="0">Pausada</option>
            </Select>
          </Field>
        )}
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
