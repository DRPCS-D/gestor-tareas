import { useSearchParams } from 'react-router-dom'
import { ListaProgramadas } from '@/components/programadas/ListaProgramadas'
import { ListaTareas } from '@/components/tareas/ListaTareas'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const PESTANAS = [
  { clave: 'tareas', etiqueta: 'Tareas' },
  { clave: 'programadas', etiqueta: 'Programadas' },
] as const

type Pestana = (typeof PESTANAS)[number]['clave']

/** Tareas y tareas programadas, en pestañas (el personal solo ve sus tareas, sin pestañas). */
export default function Tareas() {
  const { puedeGestionar } = useAuth()
  // La pestaña va en la dirección (?pestana=programadas) para que recargar o volver atrás no la pierda.
  const [params, setParams] = useSearchParams()
  const pedida = params.get('pestana')
  const pestana: Pestana = puedeGestionar && pedida === 'programadas' ? 'programadas' : 'tareas'

  const elegir = (clave: Pestana) => setParams(clave === 'tareas' ? {} : { pestana: clave }, { replace: true })

  return (
    <div>
      {puedeGestionar ? (
        <div className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
          {PESTANAS.map(({ clave, etiqueta }) => (
            <button
              key={clave}
              onClick={() => elegir(clave)}
              className={cn(
                '-mb-px shrink-0 border-b-2 px-4 py-2 text-sm transition-colors',
                pestana === clave
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      ) : (
        <h1 className="mb-4 text-lg font-semibold text-foreground">Mis tareas</h1>
      )}

      {pestana === 'tareas' ? <ListaTareas /> : <ListaProgramadas />}
    </div>
  )
}
