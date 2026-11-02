import { nombreArchivo, type FilaTarea } from './filas'

/** Genera y descarga el Excel de la lista de tareas (la librería se carga recién al pedirlo). */
export async function descargarExcel(filas: FilaTarea[], subtitulo: string): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')

  const cab = ['#', 'Fecha', 'Sucursal', 'Tarea', 'Descripción', 'Prioridad', 'Estado', 'Asignada a', 'Registrada por', 'Cierre', 'Cerrada por']
  const data: unknown[][] = [
    [{ value: 'Tareas', fontWeight: 'bold' as const }, subtitulo],
    [],
    cab.map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#F5D000' })),
    ...filas.map((f) => [
      { value: Number(f.folio) || f.folio, type: Number.isFinite(Number(f.folio)) ? Number : String },
      f.fecha,
      f.sucursal,
      f.titulo,
      f.descripcion,
      f.prioridad,
      f.estado,
      f.asignada,
      f.creadaPor,
      f.cierre,
      f.cerradaPor,
    ]),
  ]
  const columns = [7, 12, 22, 40, 50, 11, 12, 24, 24, 17, 24].map((width) => ({ width }))
  await writeExcelFile(data as never, { columns, sheet: 'Tareas' }).toFile(nombreArchivo('xlsx'))
}
