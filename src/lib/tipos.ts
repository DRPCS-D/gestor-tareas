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
  /** Id de la tarea programada que la generó; vacío si se creó a mano. */
  programadaId: string
}

export type TipoProgramada = 'una' | 'dias' | 'semanal' | 'mensual'

export const TIPO_PROGRAMADA_LABEL: Record<TipoProgramada, string> = {
  una: 'Una sola vez (fecha específica)',
  dias: 'Cada cierta cantidad de días',
  semanal: 'Cada semana, en los días que elijas',
  mensual: 'Cada mes, en un día fijo',
}

/** 1 = lunes … 7 = domingo (igual que el backend). */
export const DIAS_SEMANA: { valor: number; corto: string; largo: string }[] = [
  { valor: 1, corto: 'L', largo: 'Lunes' },
  { valor: 2, corto: 'M', largo: 'Martes' },
  { valor: 3, corto: 'X', largo: 'Miércoles' },
  { valor: 4, corto: 'J', largo: 'Jueves' },
  { valor: 5, corto: 'V', largo: 'Viernes' },
  { valor: 6, corto: 'S', largo: 'Sábado' },
  { valor: 7, corto: 'D', largo: 'Domingo' },
]

/** Plantilla que crea tareas solas (ver «Tareas programadas» en Code.gs). */
export interface Programada {
  id: string
  titulo: string
  descripcion: string
  prioridad: Prioridad
  sucursalId: string
  asignadoA: string
  asignadoNombre: string
  tipo: TipoProgramada
  intervalo: number
  diasSemana: number[]
  diaMes: number
  /** 'HH:mm' */
  hora: string
  /** 'yyyy-MM-dd' */
  fechaInicio: string
  /** 'yyyy-MM-dd', vacío = sin fin */
  fechaFin: string
  activo: boolean
  creadoPor: string
  creadoNombre: string
  /** Última ocurrencia ya atendida, 'yyyy-MM-dd HH:mm'. */
  ultima: string
  /** Próxima ocurrencia, 'yyyy-MM-dd HH:mm'; vacía si está pausada o ya terminó. */
  proxima: string
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
