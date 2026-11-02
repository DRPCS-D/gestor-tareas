import { recortar } from '@/lib/format'
import { nombreArchivo, type FilaTarea } from './filas'

/** Genera y descarga el PDF de la lista de tareas, en hoja horizontal. jsPDF se carga recién al pedirlo (pesa bastante). */
export async function descargarPdf(filas: FilaTarea[], subtitulo: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 12

  doc.setFont('helvetica', 'bold').setFontSize(15).text('Tareas', M, M + 4)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
  doc.text(subtitulo, M, M + 10, { maxWidth: W - 2 * M })
  doc.setTextColor(0)

  autoTable(doc, {
    startY: M + 15,
    head: [['#', 'Fecha', 'Sucursal', 'Tarea', 'Prioridad', 'Estado', 'Asignada a', 'Cierre']],
    body: filas.map((f) => [
      f.folio,
      f.fecha,
      f.sucursal,
      f.descripcion ? `${f.titulo}\n${recortar(f.descripcion, 160)}` : f.titulo,
      f.prioridad,
      f.estado,
      f.asignada || '—',
      f.cierre ? `${f.cierre}${f.cerradaPor ? `\n${f.cerradaPor}` : ''}` : '—',
    ]),
    margin: { left: M, right: M, bottom: 12 },
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1, valign: 'top' },
    headStyles: { fillColor: [20, 20, 20], textColor: [245, 208, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'right' },
      1: { cellWidth: 21 },
      2: { cellWidth: 36 },
      4: { cellWidth: 20 },
      5: { cellWidth: 22 },
      6: { cellWidth: 38 },
      7: { cellWidth: 32 },
    },
  })

  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(130)
    doc.text(`${filas.length} tareas · Página ${p} de ${paginas}`, W - M, H - 6, { align: 'right' })
  }

  doc.save(nombreArchivo('pdf'))
}
