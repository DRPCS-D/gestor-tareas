import { CalendarClock, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ProgramadaFormModal } from '@/components/programadas/ProgramadaFormModal'
import { Badge, type TonoBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorBox, Vacio } from '@/components/ui/estado'
import { Input } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { TablaScroll } from '@/components/ui/tabla-scroll'
import { useAuth } from '@/hooks/useAuth'
import { usePersonal } from '@/hooks/usePersonal'
import { useProgramadas } from '@/hooks/useProgramadas'
import { useSucursales } from '@/hooks/useSucursales'
import { normalizar, recortar } from '@/lib/format'
import { describirFrecuencia, estadoProgramada, formatFechaHoraLocal, type EstadoProgramada } from '@/lib/programadas'
import type { Programada } from '@/lib/tipos'

const ESTADO: Record<EstadoProgramada, { label: string; tono: TonoBadge }> = {
  activa: { label: 'Activa', tono: 'success' },
  pausada: { label: 'Pausada', tono: 'warning' },
  finalizada: { label: 'Finalizada', tono: 'neutral' },
}

export default function Programadas() {
  const { puedeGestionar, esGerente, sucursales: misSucursales } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refetch, crear, editar, eliminar, crearAhora } = useProgramadas(puedeGestionar)
  const { data: sucursales, nombres } = useSucursales()
  const { data: personal } = usePersonal(puedeGestionar)

  const [busqueda, setBusqueda] = useState('')
  const [modalForm, setModalForm] = useState<'nueva' | Programada | null>(null)
  const [modalBorrar, setModalBorrar] = useState<Programada | null>(null)
  const [borrando, setBorrando] = useState(false)

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda)
    if (!q) return data
    return data.filter((p) =>
      [p.titulo, p.descripcion, p.asignadoNombre, nombres.get(p.sucursalId) ?? ''].some((v) =>
        normalizar(String(v ?? '')).includes(q),
      ),
    )
  }, [data, busqueda, nombres])

  // Solo admin y gerente programan; el personal vuelve al inicio.
  useEffect(() => {
    if (!puedeGestionar) navigate('/', { replace: true })
  }, [puedeGestionar, navigate])

  if (!puedeGestionar) return null

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tareas programadas</h1>
          <p className="text-sm text-muted-foreground">
            Tareas que se crean solas en la lista de tareas, en las fechas que indiques.
          </p>
        </div>
        <Button onClick={() => setModalForm('nueva')}>
          <Plus /> Nueva programada
        </Button>
      </div>

      {loading ? (
        <Skeleton className="mb-4 h-9.5 max-w-sm" />
      ) : (
        data.length > 0 && (
          <div className="relative mb-4 max-w-sm">
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
        )
      )}

      {loading ? (
        <TableSkeleton columnas={[28, 16, 24, 14, 12, 10]} />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio
          icono={CalendarClock}
          titulo="Sin tareas programadas todavía"
          descripcion="Crea una para que, por ejemplo, la limpieza de filtros se registre sola cada mes."
        />
      ) : filtradas.length === 0 ? (
        <Vacio icono={CalendarClock} titulo="Sin resultados" descripcion="Prueba con otra búsqueda." />
      ) : (
        <TablaScroll total={filtradas.length} clave={busqueda}>
          {(limite) => (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Tarea</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Sucursal</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Se repite</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Próxima</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Asignada a</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Creada por</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice(0, limite).map((p) => {
                  const estado = ESTADO[estadoProgramada(p)]
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setModalForm(p)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setModalForm(p)
                        }
                      }}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-foreground" title={p.titulo}>
                        {recortar(p.titulo, 45)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{nombres.get(p.sucursalId) ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{describirFrecuencia(p)}</td>
                      <td className="tabular whitespace-nowrap px-4 py-2.5 text-foreground">{formatFechaHoraLocal(p.proxima)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.asignadoNombre || p.asignadoA || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{p.creadoNombre || p.creadoPor}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Badge tono={estado.tono}>{estado.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </>
          )}
        </TablaScroll>
      )}

      <ProgramadaFormModal
        abierto={modalForm !== null}
        programada={modalForm === 'nueva' ? null : modalForm}
        sucursales={sucursales}
        personal={personal}
        sucursalFija={esGerente ? misSucursales[0] : undefined}
        onCerrar={() => setModalForm(null)}
        onGuardado={() => {
          setModalForm(null)
          refetch()
        }}
        onBorrar={() => {
          setModalBorrar(modalForm === 'nueva' ? null : modalForm)
          setModalForm(null)
        }}
        crear={crear}
        editar={editar}
        crearAhora={async (id) => {
          const r = await crearAhora(id)
          if (!r.error) refetch()
          return r
        }}
      />

      <ConfirmModal
        abierto={modalBorrar !== null}
        titulo="Borrar tarea programada"
        textoConfirmar="Borrar"
        procesando={borrando}
        mensaje={
          <>
            ¿Borrar <strong>{modalBorrar?.titulo}</strong>? Dejará de crear tareas. Las que ya creó se quedan en la
            lista de tareas.
          </>
        }
        onCancelar={() => setModalBorrar(null)}
        onConfirmar={async () => {
          if (!modalBorrar) return
          setBorrando(true)
          const { error: err } = await eliminar(modalBorrar.id)
          setBorrando(false)
          if (err) toast.error(err)
          else {
            toast.success('Tarea programada borrada.')
            refetch()
          }
          setModalBorrar(null)
        }}
      />
    </div>
  )
}
