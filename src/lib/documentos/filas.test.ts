import { describe, expect, it } from 'vitest'
import type { Tarea } from '@/lib/tipos'
import { filasTareas, nombreArchivo } from './filas'

const tarea: Tarea = {
  id: 'a',
  folio: '12',
  sucursalId: 's1',
  titulo: 'Foco quemado',
  descripcion: 'Pasillo 3',
  prioridad: 'urgente',
  estado: 'completada',
  asignadoA: 'JPEREZ',
  asignadoNombre: 'Juan Pérez',
  creadoPor: 'ADMIN',
  creadoNombre: 'Administrador',
  fechaCreacion: '2026-03-14T12:00:00',
  completadoPor: 'JPEREZ',
  completadoNombre: 'Juan Pérez',
  fechaCompletada: '2026-03-15T09:30:00',
  programadaId: '',
}

describe('filasTareas', () => {
  it('traduce estado y prioridad y usa nombres completos', () => {
    const [f] = filasTareas([tarea], (id) => (id === 's1' ? 'Matriz' : '—'))
    expect(f).toMatchObject({
      folio: '12',
      fecha: '14/03/2026',
      sucursal: 'Matriz',
      prioridad: 'Urgente',
      estado: 'Completada',
      asignada: 'Juan Pérez',
      creadaPor: 'Administrador',
      cierre: '15/03/2026 09:30',
      cerradaPor: 'Juan Pérez',
    })
  })

  it('deja vacío el cierre de una tarea pendiente', () => {
    const [f] = filasTareas([{ ...tarea, estado: 'pendiente', fechaCompletada: '', completadoPor: '', completadoNombre: '' }], () => 'Matriz')
    expect(f.cierre).toBe('')
    expect(f.cerradaPor).toBe('')
  })
})

describe('nombreArchivo', () => {
  it('lleva la fecha de hoy', () => {
    expect(nombreArchivo('pdf', new Date(2026, 10, 2))).toBe('tareas-2026-11-02.pdf')
    expect(nombreArchivo('xlsx', new Date(2026, 0, 5))).toBe('tareas-2026-01-05.xlsx')
  })
})
