/**
 * Parches locales sobre una lista ya cargada: se aplican en cuanto el backend confirma una escritura propia, para que
 * la pantalla cambie sin esperar a volver a descargar la tabla. La descarga posterior trae la versión definitiva.
 */

type ConId = { id: string }

/** Reemplaza el registro con el mismo id o, si no está, lo pone al principio (las listas van de más nuevo a más viejo). */
export function guardarRegistro<T extends ConId>(lista: T[], registro: T): T[] {
  if (lista.some((r) => r.id === registro.id)) return lista.map((r) => (r.id === registro.id ? registro : r))
  return [registro, ...lista]
}

/** Quita el registro `id`. */
export function quitarDeLista<T extends ConId>(lista: T[], id: string): T[] {
  return lista.filter((r) => r.id !== id)
}
