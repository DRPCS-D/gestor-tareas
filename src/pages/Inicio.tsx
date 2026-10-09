import { Building2, ClipboardList, Users } from 'lucide-react'
import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { BadgePrioridad } from '@/components/tareas/badges'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useSucursales } from '@/hooks/useSucursales'
import { useTareas } from '@/hooks/useTareas'
import { PRIORIDADES, ROL_LABEL, type Prioridad } from '@/lib/tipos'

interface Modulo {
  to: string
  titulo: string
  descripcion: string
  icono: ComponentType<{ className?: string }>
}

export default function Inicio() {
  const { usuario, rol, esAdmin, esPersonal } = useAuth()
  const { data: tareas, loading } = useTareas()
  const { nombres } = useSucursales()

  const pendientes = useMemo(() => tareas.filter((t) => t.estado === 'pendiente'), [tareas])

  const porPrioridad = useMemo(() => {
    const cuenta: Record<Prioridad, number> = { baja: 0, media: 0, alta: 0, urgente: 0 }
    for (const t of pendientes) cuenta[t.prioridad]++
    return cuenta
  }, [pendientes])

  // Solo el admin ve el reparto por sucursal (el resto ya ve una o sus asignadas).
  const porSucursal = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const t of pendientes) cuenta.set(t.sucursalId, (cuenta.get(t.sucursalId) ?? 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [pendientes])

  const modulos: Modulo[] = [
    {
      to: '/tareas',
      titulo: esPersonal ? 'Mis tareas' : 'Tareas',
      descripcion: esPersonal
        ? 'Incidencias que tienes asignadas.'
        : 'Registro, asignación y cierre de incidencias.',
      icono: ClipboardList,
    },
    ...(esAdmin
      ? [
          {
            to: '/sucursales',
            titulo: 'Sucursales',
            descripcion: 'Alta y baja de los lugares de trabajo.',
            icono: Building2,
          },
          {
            to: '/usuarios',
            titulo: 'Usuarios',
            descripcion: 'Altas, roles, sucursales y contraseñas.',
            icono: Users,
          },
        ]
      : []),
  ]

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-foreground">Hola{usuario ? `, ${usuario}` : ''}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{rol ? ROL_LABEL[rol] : ''}</p>
      </div>

      <section className="mb-7 rounded-lg border border-border bg-card p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">
          {esPersonal ? 'Mis tareas pendientes' : 'Tareas pendientes'}
        </h2>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-64" />
        ) : pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No hay tareas pendientes.</p>
        ) : (
          <>
            <p className="tabular mt-1 text-3xl font-semibold text-foreground">{pendientes.length}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {[...PRIORIDADES].reverse().map((p) => (
                <span key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BadgePrioridad prioridad={p} />
                  <span className="tabular font-medium text-foreground">{porPrioridad[p]}</span>
                </span>
              ))}
            </div>
            {esAdmin && porSucursal.length > 0 && (
              <ul className="mt-4 grid gap-x-6 gap-y-1 border-t border-border pt-3 text-sm sm:grid-cols-2">
                {porSucursal.map(([id, n]) => (
                  <li key={id} className="flex justify-between gap-3">
                    <span className="truncate text-muted-foreground">{nombres.get(id) ?? '—'}</span>
                    <span className="tabular font-medium text-foreground">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map(({ to, titulo, descripcion, icono: Icono }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-lg border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="mb-3 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icono className="size-4.5" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
