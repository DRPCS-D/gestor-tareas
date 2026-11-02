import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { filasTareas } from '@/lib/documentos/filas'
import type { Tarea } from '@/lib/tipos'

type Formato = 'pdf' | 'xlsx'

/** Exporta a PDF o Excel las tareas que la lista muestra con los filtros actuales. Solo para admin. */
export function ExportarTareas({
  tareas,
  nombreSucursal,
  filtros,
}: {
  tareas: Tarea[]
  nombreSucursal: (id: string) => string
  /** Los filtros activos en palabras, para que el documento diga qué contiene. */
  filtros: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [formato, setFormato] = useState<Formato>('pdf')
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      const filas = filasTareas(tareas, nombreSucursal)
      const subtitulo = `${filtros} · ${filas.length} ${filas.length === 1 ? 'tarea' : 'tareas'}`
      if (formato === 'pdf') await (await import('@/lib/documentos/pdf')).descargarPdf(filas, subtitulo)
      else await (await import('@/lib/documentos/excel')).descargarExcel(filas, subtitulo)
      setAbierto(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el documento.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)} disabled={tareas.length === 0}>
        <Download /> Exportar
      </Button>

      <Modal
        abierto={abierto}
        titulo="Exportar tareas"
        descripcion={`Se exportan las ${tareas.length} tareas que ves ahora, con los filtros aplicados.`}
        onCerrar={() => setAbierto(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={generando}>
              Cancelar
            </Button>
            <Button onClick={descargar} disabled={generando}>
              <Download /> {generando ? 'Generando…' : formato === 'pdf' ? 'Descargar PDF' : 'Descargar Excel'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            {(
              [
                ['pdf', 'PDF'],
                ['xlsx', 'Excel'],
              ] as const
            ).map(([v, etiqueta]) => (
              <Button key={v} variant={formato === v ? 'primary' : 'outline'} size="sm" onClick={() => setFormato(v)}>
                {etiqueta}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {formato === 'pdf'
              ? 'PDF en hoja horizontal: resumen de cada tarea con su estado y cierre.'
              : 'Excel con todas las columnas, incluida la descripción completa.'}
          </p>
          <p className="text-xs text-muted-foreground">Filtros: {filtros}</p>
        </div>
      </Modal>
    </>
  )
}
