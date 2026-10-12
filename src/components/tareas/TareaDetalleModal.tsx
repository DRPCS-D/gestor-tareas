import { CheckCircle2, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox } from '@/components/ui/estado'
import { Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useComentarios } from '@/hooks/useComentarios'
import { formatFecha, formatFechaHora } from '@/lib/format'
import type { Tarea } from '@/lib/tipos'
import { BadgeEstado, BadgePrioridad } from './badges'

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  )
}

export function TareaDetalleModal({
  tarea,
  nombreSucursal,
  puedeGestionar,
  esAdmin,
  onCerrar,
  onEditar,
  onCompletar,
  onReabrir,
  onBorrar,
}: {
  tarea: Tarea | null
  nombreSucursal: string
  /** Admin, o gerente de la sucursal de la tarea. */
  puedeGestionar: boolean
  esAdmin: boolean
  onCerrar: () => void
  onEditar: () => void
  onCompletar: () => void
  onReabrir: () => void
  onBorrar: () => void
}) {
  const { data: comentarios, loading, error, refetch, agregar } = useComentarios(tarea?.id ?? null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const lista = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setTexto('')
  }, [tarea?.id])

  // Los más recientes quedan abajo: al cargar o agregar uno, se baja hasta el final.
  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [comentarios])

  async function enviar() {
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    const { error: err } = await agregar(t)
    setEnviando(false)
    if (err) return toast.error(err)
    setTexto('')
    refetch()
  }

  return (
    <Modal
      abierto={tarea !== null}
      titulo={tarea ? `#${tarea.folio} — ${tarea.titulo}` : ''}
      onCerrar={onCerrar}
      ancho="max-w-3xl"
      footer={
        puedeGestionar && tarea ? (
          <>
            {esAdmin && (
              <Button variant="outline" onClick={onBorrar}>
                <Trash2 className="text-destructive" /> Borrar
              </Button>
            )}
            <Button variant="outline" onClick={onEditar}>
              <Pencil /> Editar
            </Button>
            {tarea.estado === 'pendiente' ? (
              <Button onClick={onCompletar}>
                <CheckCircle2 /> Completar
              </Button>
            ) : (
              esAdmin && (
                <Button onClick={onReabrir}>
                  <RotateCcw /> Reabrir
                </Button>
              )
            )}
          </>
        ) : undefined
      }
    >
      {tarea && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <BadgeEstado estado={tarea.estado} />
            <BadgePrioridad prioridad={tarea.prioridad} />
          </div>

          {tarea.descripcion && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{tarea.descripcion}</p>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Sucursal">{nombreSucursal}</Dato>
            <Dato etiqueta="Asignada a">{tarea.asignadoA || 'Sin asignar'}</Dato>
            <Dato etiqueta="Registrada">
              {formatFecha(tarea.fechaCreacion)} por {tarea.creadoPor}
            </Dato>
            {tarea.estado === 'completada' && (
              <Dato etiqueta="Completada">
                {formatFecha(tarea.fechaCompletada)} por {tarea.completadoPor}
              </Dato>
            )}
          </dl>

          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">Comentarios</h3>
            {loading ? (
              <Cargando className="py-4" />
            ) : error ? (
              <ErrorBox mensaje={error} />
            ) : comentarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin comentarios.</p>
            ) : (
              <ul ref={lista} className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {comentarios.map((c) => (
                  <li key={c.id} className="rounded-md bg-secondary px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.usuario}</span> · {formatFechaHora(c.fecha)}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{c.texto}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-end gap-2">
              <Textarea
                aria-label="Nuevo comentario"
                className="min-h-10"
                rows={2}
                maxLength={1000}
                placeholder="Escribe un comentario…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <Button size="icon" onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar comentario">
                <Send />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
