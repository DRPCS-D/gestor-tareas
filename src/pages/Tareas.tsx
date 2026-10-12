import { ClipboardList, Plus, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BadgeEstado, BadgePrioridad } from '@/components/tareas/badges'
import { TareaDetalleModal } from '@/components/tareas/TareaDetalleModal'
import { TareaFormModal } from '@/components/tareas/TareaFormModal'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { usePersonal } from '@/hooks/usePersonal'
import { useSucursales } from '@/hooks/useSucursales'
import { useTareas } from '@/hooks/useTareas'
import { formatFecha, normalizar, recortar } from '@/lib/format'
import { PRIORIDADES, PRIORIDAD_LABEL, type EstadoTarea, type Prioridad, type Tarea } from '@/lib/tipos'


export default function Tareas() {
  const { esAdmin, esGerente, esPersonal, puedeGestionar, sucursales: misSucursales } = useAuth()
  const { data, loading, error, refetch, crear, editar, completar, cancelar, reabrir, eliminar } = useTareas()
  const { data: sucursales, nombres } = useSucursales()
  const { data: personal } = usePersonal(puedeGestionar)

  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState<'' | EstadoTarea>('pendiente')
  const [fPrioridad, setFPrioridad] = useState<'' | Prioridad>('')
  const [fSucursal, setFSucursal] = useState('')

  const [detalle, setDetalle] = useState<Tarea | null>(null)
  const [modalForm, setModalForm] = useState<'nueva' | Tarea | null>(null)
  const [modalCierre, setModalCierre] = useState<{ tarea: Tarea; tipo: 'completar' | 'cancelar' } | null>(null)
  const [nota, setNota] = useState('')
  const [modalBorrar, setModalBorrar] = useState<Tarea | null>(null)
  const [procesando, setProcesando] = useState(false)

  const sucursalGerente = esGerente ? misSucursales[0] : undefined
  const nombreSucursal = (id: string) => nombres.get(id) ?? '—'

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda)
    return data
      .filter((t) => !fEstado || t.estado === fEstado)
      .filter((t) => !fPrioridad || t.prioridad === fPrioridad)
      .filter((t) => !fSucursal || t.sucursalId === fSucursal)
      .filter(
        (t) =>
          !q ||
          [t.folio, t.titulo, t.descripcion, t.asignadoA, t.asignadoNombre ?? '', nombres.get(t.sucursalId) ?? ''].some((v) =>
            normalizar(String(v)).includes(q),
          ),
      )
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
  }, [data, busqueda, fEstado, fPrioridad, fSucursal, nombres])

  /** Ejecuta una acción sobre una tarea, avisa y recarga. */
  async function accion(fn: () => Promise<{ error: string | null }>, exito: string) {
    setProcesando(true)
    const { error: err } = await fn()
    setProcesando(false)
    if (err) {
      toast.error(err)
      return false
    }
    toast.success(exito)
    setDetalle(null)
    refetch()
    return true
  }

  // Un gerente solo gestiona las de su sucursal (el backend lo vuelve a validar).
  const gestiona = (t: Tarea) => esAdmin || (esGerente && misSucursales.includes(t.sucursalId))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{esPersonal ? 'Mis tareas' : 'Tareas'}</h1>
          <p className="text-sm text-muted-foreground">
            {esPersonal ? 'Incidencias que tienes asignadas.' : 'Incidencias registradas en las sucursales.'}
          </p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => setModalForm('nueva')}>
            <Plus /> Nueva tarea
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="mb-4 h-9.5 max-w-3xl" />
      ) : (
        data.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-52 max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="busqueda"
                aria-label="Buscar"
                className="pl-9"
                placeholder="Buscar…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select aria-label="Estado" className="w-auto" value={fEstado} onChange={(e) => setFEstado(e.target.value as '' | EstadoTarea)}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </Select>
            <Select aria-label="Prioridad" className="w-auto" value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value as '' | Prioridad)}>
              <option value="">Toda prioridad</option>
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {PRIORIDAD_LABEL[p]}
                </option>
              ))}
            </Select>
            {(esAdmin || esPersonal) && sucursales.length > 1 && (
              <Select aria-label="Sucursal" className="w-auto" value={fSucursal} onChange={(e) => setFSucursal(e.target.value)}>
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )
      )}

      {loading ? (
        <TableSkeleton columnas={[8, 35, 20, 12, 12]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio
          icono={ClipboardList}
          titulo={esPersonal ? 'No tienes tareas asignadas' : 'Sin tareas todavía'}
          descripcion={puedeGestionar ? 'Registra la primera incidencia con «Nueva tarea».' : undefined}
        />
      ) : filtradas.length === 0 ? (
        <Vacio icono={ClipboardList} titulo="Sin resultados" descripcion="Prueba con otros filtros." />
      ) : (
        <TablaScroll total={filtradas.length} clave={[busqueda, fEstado, fPrioridad, fSucursal].join('|')}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">#</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Tarea</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Sucursal</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Asignada a</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Prioridad</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Estado</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setDetalle(t)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDetalle(t)
                      }
                    }}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="tabular whitespace-nowrap px-4 py-2.5 font-medium text-foreground">#{t.folio}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-foreground" title={t.titulo}>
                      {recortar(t.titulo, 50)}
                      {t.programadaId && (
                        <RefreshCw className="ml-1.5 inline size-3 text-muted-foreground" aria-label="Tarea programada" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{nombreSucursal(t.sucursalId)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{t.asignadoNombre || t.asignadoA || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <BadgePrioridad prioridad={t.prioridad} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <BadgeEstado estado={t.estado} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatFecha(t.fechaCreacion)}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <TareaDetalleModal
        tarea={modalBorrar || modalCierre || modalForm ? null : detalle}
        nombreSucursal={detalle ? nombreSucursal(detalle.sucursalId) : ''}
        puedeGestionar={!!detalle && gestiona(detalle)}
        esAdmin={esAdmin}
        onCerrar={() => setDetalle(null)}
        onEditar={() => setModalForm(detalle)}
        onCompletar={() => {
          setNota('')
          if (detalle) setModalCierre({ tarea: detalle, tipo: 'completar' })
        }}
        onCancelar={() => {
          setNota('')
          if (detalle) setModalCierre({ tarea: detalle, tipo: 'cancelar' })
        }}
        onReabrir={() => detalle && accion(() => reabrir(detalle.id), 'Tarea reabierta.')}
        onBorrar={() => setModalBorrar(detalle)}
      />

      <TareaFormModal
        abierto={modalForm !== null}
        tarea={modalForm === 'nueva' ? null : modalForm}
        sucursales={sucursales}
        personal={personal}
        sucursalFija={sucursalGerente}
        onCerrar={() => setModalForm(null)}
        onGuardado={() => {
          setModalForm(null)
          setDetalle(null)
          refetch()
        }}
        crear={crear}
        editar={editar}
      />

      <Modal
        abierto={modalCierre !== null}
        titulo={`${modalCierre?.tipo === 'cancelar' ? 'Cancelar' : 'Completar'} tarea #${modalCierre?.tarea.folio ?? ''}`}
        descripcion={modalCierre?.tarea.titulo}
        onCerrar={() => setModalCierre(null)}
        ancho="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalCierre(null)} disabled={procesando}>
              Cancelar
            </Button>
            <Button
              disabled={procesando}
              onClick={async () => {
                if (!modalCierre) return
                const { tarea, tipo } = modalCierre
                const ok =
                  tipo === 'cancelar'
                    ? await accion(() => cancelar(tarea.id, nota.trim()), 'Tarea cancelada.')
                    : await accion(() => completar(tarea.id, nota.trim()), 'Tarea completada.')
                if (ok) setModalCierre(null)
              }}
            >
              {procesando ? 'Guardando…' : modalCierre?.tipo === 'cancelar' ? 'Cancelar tarea' : 'Marcar como completada'}
            </Button>
          </>
        }
      >
        <Field label={modalCierre?.tipo === 'cancelar' ? 'Motivo' : 'Nota de cierre'} hint="Opcional. Queda como comentario de la tarea.">
          <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} maxLength={900} autoFocus />
        </Field>
      </Modal>

      <ConfirmModal
        abierto={modalBorrar !== null}
        titulo="Borrar tarea"
        textoConfirmar="Borrar"
        procesando={procesando}
        mensaje={
          <>
            ¿Borrar la tarea <strong>#{modalBorrar?.folio}</strong> y sus comentarios? No se puede deshacer.
          </>
        }
        onCancelar={() => setModalBorrar(null)}
        onConfirmar={async () => {
          if (!modalBorrar) return
          await accion(() => eliminar(modalBorrar.id), 'Tarea borrada.')
          setModalBorrar(null)
        }}
      />
    </div>
  )
}
