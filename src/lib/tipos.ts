/**
 * Tipos del dominio. Se escriben a mano (no hay esquema que generar: el
 * backend es Apps Script sobre Google Sheets, no una base tipada).
 */

/** Coincide con lo que devuelve `normalizarRol_` en apps-script/Code.gs. */
export type Rol = 'admin' | 'gerente' | 'personal'

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  personal: 'Personal de mantenimiento',
}

export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente'

/** De menor a mayor urgencia. */
export const PRIORIDADES: Prioridad[] = ['baja', 'media', 'alta', 'urgente']

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

export type EstadoTarea = 'pendiente' | 'completada' | 'cancelada'

export const ESTADO_LABEL: Record<EstadoTarea, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export interface Tarea {
  id: string
  folio: string
  sucursalId: string
  titulo: string
  descripcion: string
  prioridad: Prioridad
  estado: EstadoTarea
  asignadoA: string
  creadoPor: string
  fechaCreacion: string
  completadoPor: string
  fechaCompletada: string
  /** Nombres completos para mostrar (si no hay, repiten el usuario). */
  creadoNombre: string
  asignadoNombre: string
  completadoNombre: string
}

export interface Sucursal {
  id: string
  nombre: string
  direccion: string
  activo: boolean
}

export interface Comentario {
  id: string
  tareaId: string
  usuario: string
  usuarioNombre: string
  texto: string
  fecha: string
}

export interface UsuarioApp {
  /** Nombre de acceso (login). */
  usuario: string
  /** Nombre completo, opcional. */
  nombre: string
  rol: Rol
  activo: boolean
  /** Ids de sucursal: uno para gerente, uno o más para personal, ninguno para admin. */
  sucursales: string[]
}

/** Personal asignable (lo que devuelve `listPersonal`). */
export interface Personal {
  usuario: string
  nombre: string
  sucursales: string[]
}
