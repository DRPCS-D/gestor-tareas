/**
 * Gestor de Tareas - Backend (Google Apps Script)
 *
 * Registra las incidencias de mantenimiento de todas las sucursales
 * (en Google Sheets) y las muestra a quien tiene que resolverlas.
 *
 * Despliegue:
 *   Extensiones > Apps Script > pegar este archivo
 *   > Implementar > Aplicación web
 *   > Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
 *
 * Primera vez: ejecuta la función `instalar` (botón Ejecutar en el editor, o
 * menú "Gestor de Tareas" de la hoja tras recargarla). Crea todo lo de abajo
 * y un admin inicial (la contraseña queda en la pestaña Usuarios).
 *
 * La hoja debe tener cuatro pestañas (fila 1 = encabezados):
 *   "Tareas":      id | folio | sucursalId | titulo | descripcion | prioridad |
 *                  estado | asignadoA | creadoPor | fechaCreacion |
 *                  completadoPor | fechaCompletada
 *   "Sucursales":  id | nombre | direccion | activo
 *   "Usuarios":    usuario | password | rol | activo | sucursales
 *   "Comentarios": id | tareaId | usuario | texto | fecha
 *
 * Roles:
 *   admin    control total.
 *   gerente  registra, asigna y completa tareas de SU sucursal.
 *   personal ve solo las tareas que tiene asignadas y puede comentarlas.
 *
 * "sucursales" en Usuarios son ids separados por coma: uno para el gerente,
 * uno o varios para el personal, vacío para el admin.
 */

var SHEET_TAREAS = 'Tareas';
var SHEET_SUCURSALES = 'Sucursales';
var SHEET_USUARIOS = 'Usuarios';
var SHEET_COMENTARIOS = 'Comentarios';

// Índices de columnas (0-based).
var COL = {
  id: 0, folio: 1, sucursalId: 2, titulo: 3, descripcion: 4, prioridad: 5,
  estado: 6, asignadoA: 7, creadoPor: 8, fechaCreacion: 9,
  completadoPor: 10, fechaCompletada: 11
};
var COL_SUC = { id: 0, nombre: 1, direccion: 2, activo: 3 };
var COL_USR = { usuario: 0, password: 1, rol: 2, activo: 3, sucursales: 4 };
var COL_COM = { id: 0, tareaId: 1, usuario: 2, texto: 3, fecha: 4 };

var PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];

function doGet() {
  return jsonOut_({ ok: true, service: 'gestor-tareas' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Solicitud inválida' });
  }

  try {
    switch (body.action) {
      case 'login':             return handleLogin_(body);
      case 'listTareas':        return handleListTareas_(body);
      case 'createTarea':       return handleCreateTarea_(body);
      case 'updateTarea':       return handleUpdateTarea_(body);
      case 'completarTarea':    return handleCompletarTarea_(body);
      case 'reabrirTarea':      return handleReabrirTarea_(body);
      case 'deleteTarea':       return handleDeleteTarea_(body);
      case 'listComentarios':   return handleListComentarios_(body);
      case 'createComentario':  return handleCreateComentario_(body);
      case 'listSucursales':    return handleListSucursales_(body);
      case 'createSucursal':    return handleCreateSucursal_(body);
      case 'updateSucursal':    return handleUpdateSucursal_(body);
      case 'deleteSucursal':    return handleDeleteSucursal_(body);
      case 'listPersonal':      return handleListPersonal_(body);
      case 'listUsuarios':      return handleListUsuarios_(body);
      case 'createUsuario':     return handleCreateUsuario_(body);
      case 'updateUsuario':     return handleUpdateUsuario_(body);
      case 'deleteUsuario':     return handleDeleteUsuario_(body);
      case 'cambiarMiPassword': return handleCambiarMiPassword_(body);
      default:                  return jsonOut_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    // "codigo" deja que el frontend distinga una sesión caída de cualquier
    // otro error sin depender del texto del mensaje (ver requireAuth_).
    return jsonOut_({
      ok: false,
      error: err.message || ('Error del servidor: ' + err),
      codigo: err.codigo || ''
    });
  }
}

// ---------- Autenticación ----------

function handleLogin_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) return jsonOut_({ ok: false, error: 'Usuario o contraseña incorrectos' });
  return jsonOut_({ ok: true, usuario: user.usuario, rol: user.rol, sucursales: user.sucursales });
}

/**
 * Valida credenciales y devuelve el usuario, o lanza error.
 * El error lleva codigo 'SESION' para que el frontend cierre la sesión en vez
 * de mostrar el error en cada pantalla (pasa si te desactivan, te renombran o
 * te cambian la contraseña mientras estabas dentro).
 */
function requireAuth_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) {
    var e = new Error('Sesión no válida. Vuelve a iniciar sesión.');
    e.codigo = 'SESION';
    throw e;
  }
  return user;
}

/** Valida que el usuario tenga uno de los roles indicados, o lanza error. */
function requireRol_(body, roles) {
  var user = requireAuth_(body);
  if (roles.indexOf(user.rol) === -1) throw new Error('No autorizado para esta acción.');
  return user;
}

function requireAdmin_(body) {
  return requireRol_(body, ['admin']);
}

/**
 * Busca un usuario activo con usuario y contraseña coincidentes.
 * Devuelve { usuario, rol, activo, sucursales } o null.
 */
function findUser_(usuario, password) {
  var nombre = String(usuario || '').trim();
  var pass = String(password || '');
  if (!nombre || !pass) return null;

  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var rowUsuario = String(rows[i][COL_USR.usuario]).trim();
    var rowPass = String(rows[i][COL_USR.password]);
    // El usuario no distingue mayúsculas/minúsculas; la contraseña sí.
    if (rowUsuario.toUpperCase() === nombre.toUpperCase() && rowPass === pass && esActivo_(rows[i][COL_USR.activo])) {
      return {
        usuario: rowUsuario,
        rol: normalizarRol_(rows[i][COL_USR.rol]),
        activo: true,
        sucursales: parseSucursales_(rows[i][COL_USR.sucursales])
      };
    }
  }
  return null;
}

// ---------- Permisos sobre tareas ----------

/** ¿Este usuario puede ver la tarea? */
function puedeVer_(user, tarea) {
  if (user.rol === 'admin') return true;
  if (user.rol === 'gerente') return user.sucursales.indexOf(tarea.sucursalId) !== -1;
  return tarea.asignadoA.toUpperCase() === user.usuario.toUpperCase();
}

/** ¿Este usuario puede modificar/completar la tarea? (admin o gerente de esa sucursal) */
function puedeGestionar_(user, tarea) {
  if (user.rol === 'admin') return true;
  return user.rol === 'gerente' && user.sucursales.indexOf(tarea.sucursalId) !== -1;
}

/** Busca la tarea y comprueba que el usuario la pueda ver. Devuelve { indice, tarea }. */
function tareaVisible_(user, id) {
  var sheet = getSheet_(SHEET_TAREAS);
  var encontrada = filaPorId_(sheet, COL.id, id);
  if (!encontrada) throw new Error('La tarea ya no existe.');
  var tarea = rowToTarea_(encontrada.valores);
  if (!puedeVer_(user, tarea)) throw new Error('No tienes acceso a esta tarea.');
  return { sheet: sheet, indice: encontrada.indice, tarea: tarea };
}

function tareaGestionable_(user, id) {
  var t = tareaVisible_(user, id);
  if (!puedeGestionar_(user, t.tarea)) throw new Error('No autorizado para modificar esta tarea.');
  return t;
}

/**
 * Valida que el usuario a asignar exista, sea personal activo y cubra la
 * sucursal. Devuelve el nombre normalizado, o '' si no se asigna a nadie.
 */
function validarAsignado_(nombre, sucursalId) {
  var buscado = String(nombre || '').trim();
  if (!buscado) return '';
  var encontrado = usuarioPorNombre_(getSheet_(SHEET_USUARIOS), buscado);
  if (!encontrado) throw new Error('El usuario asignado no existe.');
  var v = encontrado.valores;
  if (normalizarRol_(v[COL_USR.rol]) !== 'personal' || !esActivo_(v[COL_USR.activo])) {
    throw new Error('Solo se puede asignar a personal de mantenimiento activo.');
  }
  if (parseSucursales_(v[COL_USR.sucursales]).indexOf(sucursalId) === -1) {
    throw new Error('Ese personal no cubre la sucursal de la tarea.');
  }
  return String(v[COL_USR.usuario]).trim();
}

function validarSucursal_(sucursalId) {
  var id = String(sucursalId || '').trim();
  if (!id) throw new Error('La sucursal es obligatoria.');
  var encontrada = filaPorId_(getSheet_(SHEET_SUCURSALES), COL_SUC.id, id);
  if (!encontrada) throw new Error('La sucursal no existe.');
  if (!esActivo_(encontrada.valores[COL_SUC.activo])) throw new Error('La sucursal está inactiva.');
  return id;
}

// ---------- Tareas ----------

function handleListTareas_(body) {
  var user = requireAuth_(body);
  var rows = getSheet_(SHEET_TAREAS).getDataRange().getValues();
  var tareas = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL.id]).trim()) continue;
    var t = rowToTarea_(rows[i]);
    if (puedeVer_(user, t)) tareas.push(t);
  }
  // Más recientes primero.
  tareas.sort(function (a, b) {
    return String(b.fechaCreacion).localeCompare(String(a.fechaCreacion));
  });
  return jsonOut_({ ok: true, tareas: tareas });
}

function handleCreateTarea_(body) {
  var user = requireRol_(body, ['admin', 'gerente']);
  var datos = leerDatosTarea_(body);

  // El gerente solo registra en su sucursal, aunque mande otra.
  var sucursalId = user.rol === 'gerente' ? user.sucursales[0] : datos.sucursalId;
  if (user.rol === 'gerente' && !sucursalId) throw new Error('No tienes una sucursal asignada.');
  sucursalId = validarSucursal_(sucursalId);
  var asignadoA = validarAsignado_(datos.asignadoA, sucursalId);

  var sheet = getSheet_(SHEET_TAREAS);

  // El folio se calcula y se inserta dentro del lock para que dos altas
  // simultáneas no obtengan el mismo número.
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var id;
  try {
    id = Utilities.getUuid();
    var fila = [];
    fila[COL.id] = id;
    fila[COL.folio] = siguienteFolio_(sheet);
    fila[COL.sucursalId] = sucursalId;
    fila[COL.titulo] = datos.titulo;
    fila[COL.descripcion] = datos.descripcion;
    fila[COL.prioridad] = datos.prioridad;
    fila[COL.estado] = 'pendiente';
    fila[COL.asignadoA] = asignadoA;
    fila[COL.creadoPor] = user.usuario;
    fila[COL.fechaCreacion] = new Date().toISOString();
    fila[COL.completadoPor] = '';
    fila[COL.fechaCompletada] = '';
    sheet.appendRow(fila);
  } finally {
    lock.releaseLock();
  }

  return jsonOut_({ ok: true, tarea: rowToTarea_(filaPorId_(sheet, COL.id, id).valores) });
}

/** Devuelve el siguiente folio: el mayor existente + 1 (empieza en 1). */
function siguienteFolio_(sheet) {
  var rows = sheet.getDataRange().getValues();
  var max = 0;
  for (var i = 1; i < rows.length; i++) {
    var n = parseInt(String(rows[i][COL.folio]).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

function handleUpdateTarea_(body) {
  var user = requireRol_(body, ['admin', 'gerente']);
  var t = tareaGestionable_(user, String(body.id || '').trim());
  var datos = leerDatosTarea_(body);

  // Solo el admin puede mover una tarea de sucursal.
  var sucursalId = user.rol === 'admin' && datos.sucursalId ? validarSucursal_(datos.sucursalId) : t.tarea.sucursalId;
  var asignadoA = validarAsignado_(datos.asignadoA, sucursalId);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var fila = t.indice;
    t.sheet.getRange(fila, COL.sucursalId + 1).setValue(sucursalId);
    t.sheet.getRange(fila, COL.titulo + 1).setValue(datos.titulo);
    t.sheet.getRange(fila, COL.descripcion + 1).setValue(datos.descripcion);
    t.sheet.getRange(fila, COL.prioridad + 1).setValue(datos.prioridad);
    t.sheet.getRange(fila, COL.asignadoA + 1).setValue(asignadoA);
  } finally {
    lock.releaseLock();
  }

  return jsonOut_({ ok: true, tarea: rowToTarea_(filaPorId_(t.sheet, COL.id, t.tarea.id).valores) });
}

function handleCompletarTarea_(body) {
  var user = requireRol_(body, ['admin', 'gerente']);
  var t = tareaGestionable_(user, String(body.id || '').trim());
  if (t.tarea.estado === 'completada') throw new Error('La tarea ya está completada.');

  var nota = String(body.nota || '').trim();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    t.sheet.getRange(t.indice, COL.estado + 1).setValue('completada');
    t.sheet.getRange(t.indice, COL.completadoPor + 1).setValue(user.usuario);
    t.sheet.getRange(t.indice, COL.fechaCompletada + 1).setValue(new Date().toISOString());
  } finally {
    lock.releaseLock();
  }
  // La nota de cierre opcional queda como comentario de la tarea.
  if (nota) agregarComentario_(t.tarea.id, user.usuario, 'Completada: ' + nota);
  return jsonOut_({ ok: true });
}

function handleReabrirTarea_(body) {
  var user = requireAdmin_(body);
  var t = tareaGestionable_(user, String(body.id || '').trim());
  if (t.tarea.estado !== 'completada') throw new Error('La tarea no está completada.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    t.sheet.getRange(t.indice, COL.estado + 1).setValue('pendiente');
    t.sheet.getRange(t.indice, COL.completadoPor + 1).setValue('');
    t.sheet.getRange(t.indice, COL.fechaCompletada + 1).setValue('');
  } finally {
    lock.releaseLock();
  }
  agregarComentario_(t.tarea.id, user.usuario, 'Tarea reabierta.');
  return jsonOut_({ ok: true });
}

function handleDeleteTarea_(body) {
  var user = requireAdmin_(body);
  var t = tareaGestionable_(user, String(body.id || '').trim());

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    t.sheet.deleteRow(t.indice);
    // Los comentarios de la tarea se van con ella (de abajo hacia arriba
    // para que los índices no se corran al borrar).
    var com = getSheet_(SHEET_COMENTARIOS);
    var rows = com.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][COL_COM.tareaId]).trim() === t.tarea.id) com.deleteRow(i + 1);
    }
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

function leerDatosTarea_(body) {
  var titulo = String(body.titulo || '').trim().slice(0, 80);
  if (!titulo) throw new Error('El título es obligatorio.');
  return {
    sucursalId: String(body.sucursalId || '').trim(),
    titulo: titulo,
    descripcion: String(body.descripcion || '').trim().slice(0, 2000),
    prioridad: normalizarPrioridad_(body.prioridad),
    asignadoA: String(body.asignadoA || '').trim()
  };
}

// ---------- Comentarios ----------

function handleListComentarios_(body) {
  var user = requireAuth_(body);
  var t = tareaVisible_(user, String(body.tareaId || '').trim());
  var rows = getSheet_(SHEET_COMENTARIOS).getDataRange().getValues();
  var comentarios = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_COM.tareaId]).trim() !== t.tarea.id) continue;
    comentarios.push({
      id: String(rows[i][COL_COM.id]),
      tareaId: t.tarea.id,
      usuario: String(rows[i][COL_COM.usuario]),
      texto: String(rows[i][COL_COM.texto]),
      fecha: normalizarFecha_(rows[i][COL_COM.fecha])
    });
  }
  comentarios.sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
  return jsonOut_({ ok: true, comentarios: comentarios });
}

function handleCreateComentario_(body) {
  var user = requireAuth_(body);
  var t = tareaVisible_(user, String(body.tareaId || '').trim());
  var texto = String(body.texto || '').trim().slice(0, 1000);
  if (!texto) throw new Error('El comentario está vacío.');
  agregarComentario_(t.tarea.id, user.usuario, texto);
  return jsonOut_({ ok: true });
}

function agregarComentario_(tareaId, usuario, texto) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_(SHEET_COMENTARIOS).appendRow([Utilities.getUuid(), tareaId, usuario, texto, new Date().toISOString()]);
  } finally {
    lock.releaseLock();
  }
}

// ---------- Sucursales ----------

/** Todos los autenticados las leen: se necesitan para mostrar el nombre de cada tarea. */
function handleListSucursales_(body) {
  requireAuth_(body);
  var rows = getSheet_(SHEET_SUCURSALES).getDataRange().getValues();
  var sucursales = [];
  for (var i = 1; i < rows.length; i++) {
    if (!String(rows[i][COL_SUC.id]).trim()) continue;
    sucursales.push(rowToSucursal_(rows[i]));
  }
  sucursales.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  return jsonOut_({ ok: true, sucursales: sucursales });
}

function handleCreateSucursal_(body) {
  requireAdmin_(body);
  var nombre = String(body.nombre || '').trim().slice(0, 60);
  var direccion = String(body.direccion || '').trim().slice(0, 150);
  if (!nombre) throw new Error('El nombre es obligatorio.');

  var sheet = getSheet_(SHEET_SUCURSALES);
  if (sucursalPorNombre_(sheet, nombre)) throw new Error('Ya existe una sucursal con ese nombre.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow([Utilities.getUuid().slice(0, 8), nombre, direccion, true]);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

function handleUpdateSucursal_(body) {
  requireAdmin_(body);
  var id = String(body.id || '').trim();
  var nombre = String(body.nombre || '').trim().slice(0, 60);
  var direccion = String(body.direccion || '').trim().slice(0, 150);
  var activo = body.activo !== false;
  if (!nombre) throw new Error('El nombre es obligatorio.');

  var sheet = getSheet_(SHEET_SUCURSALES);
  var encontrada = filaPorId_(sheet, COL_SUC.id, id);
  if (!encontrada) throw new Error('La sucursal ya no existe.');
  var otra = sucursalPorNombre_(sheet, nombre);
  if (otra && otra !== encontrada.indice) throw new Error('Ya existe una sucursal con ese nombre.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.getRange(encontrada.indice, COL_SUC.nombre + 1).setValue(nombre);
    sheet.getRange(encontrada.indice, COL_SUC.direccion + 1).setValue(direccion);
    sheet.getRange(encontrada.indice, COL_SUC.activo + 1).setValue(activo);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

/** Solo se borra si no tiene tareas; si tiene, hay que desactivarla. */
function handleDeleteSucursal_(body) {
  requireAdmin_(body);
  var id = String(body.id || '').trim();
  var sheet = getSheet_(SHEET_SUCURSALES);
  var encontrada = filaPorId_(sheet, COL_SUC.id, id);
  if (!encontrada) throw new Error('La sucursal ya no existe.');

  var tareas = getSheet_(SHEET_TAREAS).getDataRange().getValues();
  for (var i = 1; i < tareas.length; i++) {
    if (String(tareas[i][COL.sucursalId]).trim() === id) {
      throw new Error('La sucursal tiene tareas registradas. Desactívala en lugar de borrarla.');
    }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.deleteRow(encontrada.indice);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

/** Devuelve el índice (1-based) de la sucursal con ese nombre, o 0. */
function sucursalPorNombre_(sheet, nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_SUC.nombre]).trim().toUpperCase() === buscado) return i + 1;
  }
  return 0;
}

// ---------- Usuarios ----------

/** Personal activo con sus sucursales, para el selector de asignación. */
function handleListPersonal_(body) {
  var user = requireRol_(body, ['admin', 'gerente']);
  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  var personal = [];
  for (var i = 1; i < rows.length; i++) {
    var nombre = String(rows[i][COL_USR.usuario]).trim();
    if (!nombre || normalizarRol_(rows[i][COL_USR.rol]) !== 'personal' || !esActivo_(rows[i][COL_USR.activo])) continue;
    var sucursales = parseSucursales_(rows[i][COL_USR.sucursales]);
    // El gerente solo necesita ver al personal que cubre su sucursal.
    if (user.rol === 'gerente' && sucursales.indexOf(user.sucursales[0]) === -1) continue;
    personal.push({ usuario: nombre, sucursales: sucursales });
  }
  personal.sort(function (a, b) { return a.usuario.localeCompare(b.usuario); });
  return jsonOut_({ ok: true, personal: personal });
}

function handleListUsuarios_(body) {
  requireAdmin_(body);
  var rows = getSheet_(SHEET_USUARIOS).getDataRange().getValues();
  var usuarios = [];
  for (var i = 1; i < rows.length; i++) {
    var nombre = String(rows[i][COL_USR.usuario]).trim();
    if (!nombre) continue;
    usuarios.push({
      usuario: nombre,
      rol: normalizarRol_(rows[i][COL_USR.rol]),
      activo: esActivo_(rows[i][COL_USR.activo]),
      sucursales: parseSucursales_(rows[i][COL_USR.sucursales])
    });
  }
  return jsonOut_({ ok: true, usuarios: usuarios });
}

function handleCreateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.nuevoUsuario || '').trim().toUpperCase(); // nombres siempre en mayúsculas
  var password = String(body.nuevaPassword || '');
  var rol = normalizarRol_(body.rol);
  var activo = body.activo !== false;
  var sucursales = validarSucursalesDeRol_(rol, body.sucursales);

  if (!nombre) throw new Error('El nombre de usuario es obligatorio.');
  if (!password) throw new Error('La contraseña inicial es obligatoria.');

  var sheet = getSheet_(SHEET_USUARIOS);
  if (usuarioExiste_(sheet, nombre)) throw new Error('Ya existe un usuario con ese nombre.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow([nombre, password, rol, activo, sucursales.join(',')]);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

function handleUpdateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.targetUsuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario a editar.');
  var rol = normalizarRol_(body.rol);
  var activo = body.activo !== false;
  var nuevaPassword = String(body.nuevaPassword || '');
  var nuevoNombre = String(body.nuevoUsuario || '').trim().toUpperCase(); // nombres siempre en mayúsculas
  var sucursales = validarSucursalesDeRol_(rol, body.sucursales);

  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, nombre);
  if (!encontrada) throw new Error('El usuario ya no existe.');

  // Evita dejar el sistema sin ningún Admin activo.
  var eraAdminActivo = normalizarRol_(encontrada.valores[COL_USR.rol]) === 'admin' && esActivo_(encontrada.valores[COL_USR.activo]);
  var seguiraSiendoAdminActivo = rol === 'admin' && activo;
  if (eraAdminActivo && !seguiraSiendoAdminActivo && contarAdminsActivos_(sheet) <= 1) {
    throw new Error('No puedes quitar el último Admin activo.');
  }

  // Renombrar es opcional: solo si viene un nombre distinto al actual.
  var seRenombra = !!nuevoNombre && nuevoNombre !== nombre.toUpperCase();
  if (seRenombra && usuarioExiste_(sheet, nuevoNombre)) {
    throw new Error('Ya existe un usuario con ese nombre.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var fila = encontrada.indice;
    if (seRenombra) {
      sheet.getRange(fila, COL_USR.usuario + 1).setValue(nuevoNombre);
      renombrarEnTareas_(String(encontrada.valores[COL_USR.usuario]).trim(), nuevoNombre);
    }
    sheet.getRange(fila, COL_USR.rol + 1).setValue(rol);
    sheet.getRange(fila, COL_USR.activo + 1).setValue(activo);
    sheet.getRange(fila, COL_USR.sucursales + 1).setValue(sucursales.join(','));
    if (nuevaPassword) sheet.getRange(fila, COL_USR.password + 1).setValue(nuevaPassword);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true, usuario: seRenombra ? nuevoNombre : nombre.toUpperCase() });
}

/** Mantiene las asignaciones al renombrar a un usuario de personal. */
function renombrarEnTareas_(viejo, nuevo) {
  var sheet = getSheet_(SHEET_TAREAS);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL.asignadoA]).trim().toUpperCase() === viejo.toUpperCase()) {
      sheet.getRange(i + 1, COL.asignadoA + 1).setValue(nuevo);
    }
  }
}

function handleDeleteUsuario_(body) {
  var actual = requireAdmin_(body);
  var nombre = String(body.targetUsuario || '').trim();
  if (!nombre) throw new Error('Falta el usuario a borrar.');
  if (nombre.toUpperCase() === actual.usuario.toUpperCase()) throw new Error('No puedes borrarte a ti mismo.');

  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, nombre);
  if (!encontrada) throw new Error('El usuario ya no existe.');

  var esAdminActivo = normalizarRol_(encontrada.valores[COL_USR.rol]) === 'admin' && esActivo_(encontrada.valores[COL_USR.activo]);
  if (esAdminActivo && contarAdminsActivos_(sheet) <= 1) {
    throw new Error('No puedes borrar el último Admin activo.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.deleteRow(encontrada.indice);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

/** Cualquier usuario autenticado cambia su propia contraseña. */
function handleCambiarMiPassword_(body) {
  var user = requireAuth_(body);
  var nuevaPassword = String(body.nuevaPassword || '');
  if (!nuevaPassword) throw new Error('La nueva contraseña es obligatoria.');

  var sheet = getSheet_(SHEET_USUARIOS);
  var encontrada = usuarioPorNombre_(sheet, user.usuario);
  if (!encontrada) throw new Error('El usuario ya no existe.');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.getRange(encontrada.indice, COL_USR.password + 1).setValue(nuevaPassword);
  } finally {
    lock.releaseLock();
  }
  return jsonOut_({ ok: true });
}

/**
 * Normaliza las sucursales según el rol: el admin no lleva, el gerente
 * exactamente una y el personal al menos una. Todas deben existir.
 */
function validarSucursalesDeRol_(rol, valor) {
  if (rol === 'admin') return [];
  var lista = Array.isArray(valor) ? valor.map(function (s) { return String(s).trim(); }).filter(String) : parseSucursales_(valor);
  if (rol === 'gerente' && lista.length !== 1) throw new Error('El gerente debe tener exactamente una sucursal.');
  if (rol === 'personal' && lista.length === 0) throw new Error('El personal debe cubrir al menos una sucursal.');
  var sheet = getSheet_(SHEET_SUCURSALES);
  lista.forEach(function (id) {
    if (!filaPorId_(sheet, COL_SUC.id, id)) throw new Error('Una de las sucursales no existe.');
  });
  return lista;
}

// ---------- Instalación ----------

var ENCABEZADOS = {
  Tareas: ['id', 'folio', 'sucursalId', 'titulo', 'descripcion', 'prioridad', 'estado',
           'asignadoA', 'creadoPor', 'fechaCreacion', 'completadoPor', 'fechaCompletada'],
  Sucursales: ['id', 'nombre', 'direccion', 'activo'],
  Usuarios: ['usuario', 'password', 'rol', 'activo', 'sucursales'],
  Comentarios: ['id', 'tareaId', 'usuario', 'texto', 'fecha']
};

/** Agrega el menú "Gestor de Tareas" al abrir la hoja. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Gestor de Tareas')
    .addItem('Instalar / reparar hoja', 'instalar')
    .addToUi();
}

/**
 * Crea las pestañas y encabezados que falten, con validaciones y formato, y
 * deja un admin inicial y una sucursal de ejemplo si no hay ninguno.
 * Es idempotente: se puede ejecutar varias veces sin pisar datos existentes.
 * Ejecútala una vez a mano desde el editor de Apps Script (Ejecutar > instalar)
 * o desde el menú "Gestor de Tareas" de la hoja.
 */
function instalar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var creadas = [];

  Object.keys(ENCABEZADOS).forEach(function (nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      // Reutiliza la hoja vacía por defecto en lugar de dejarla sobrando.
      var primera = ss.getSheets()[0];
      var vacia = ss.getSheets().length === 1 && primera.getLastRow() === 0 && primera.getName() !== nombre;
      sheet = vacia ? primera.setName(nombre) : ss.insertSheet(nombre);
      creadas.push(nombre);
    }
    var cols = ENCABEZADOS[nombre];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8eaf6');
    sheet.setFrozenRows(1);
  });

  aplicarValidaciones_(ss);

  var mensaje = creadas.length ? 'Pestañas creadas: ' + creadas.join(', ') + '. ' : 'Las pestañas ya existían. ';

  var sucursales = ss.getSheetByName(SHEET_SUCURSALES);
  if (sucursales.getLastRow() < 2) {
    sucursales.appendRow([Utilities.getUuid().slice(0, 8), 'Matriz', '', true]);
    mensaje += 'Sucursal de ejemplo "Matriz" creada. ';
  }

  var usuarios = ss.getSheetByName(SHEET_USUARIOS);
  if (contarAdminsActivos_(usuarios) === 0) {
    var password = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    usuarios.appendRow(['ADMIN', password, 'admin', true, '']);
    mensaje += 'Admin inicial: usuario ADMIN, contraseña ' + password +
      ' (también está en la pestaña Usuarios; cámbiala al entrar). ';
  }

  Logger.log(mensaje);
  try { ss.toast(mensaje, 'Gestor de Tareas', 30); } catch (e) {}
  return mensaje;
}

/** Listas desplegables y casillas para que editar a mano la hoja no rompa valores. */
function aplicarValidaciones_(ss) {
  var lista = function (valores) {
    return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
  };
  var casilla = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  var filas = 1000;

  var tareas = ss.getSheetByName(SHEET_TAREAS);
  tareas.getRange(2, COL.prioridad + 1, filas, 1).setDataValidation(lista(PRIORIDADES));
  tareas.getRange(2, COL.estado + 1, filas, 1).setDataValidation(lista(['pendiente', 'completada']));

  ss.getSheetByName(SHEET_SUCURSALES).getRange(2, COL_SUC.activo + 1, filas, 1).setDataValidation(casilla);

  var usuarios = ss.getSheetByName(SHEET_USUARIOS);
  usuarios.getRange(2, COL_USR.rol + 1, filas, 1).setDataValidation(lista(['admin', 'gerente', 'personal']));
  usuarios.getRange(2, COL_USR.activo + 1, filas, 1).setDataValidation(casilla);
}

// ---------- Helpers de hoja ----------

function getSheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('No existe la pestaña "' + name + '" en la hoja de cálculo.');
  return sheet;
}

function rowToTarea_(row) {
  return {
    id: String(row[COL.id]).trim(),
    folio: row[COL.folio] === '' ? '' : String(row[COL.folio]),
    sucursalId: String(row[COL.sucursalId]).trim(),
    titulo: String(row[COL.titulo]),
    descripcion: String(row[COL.descripcion]),
    prioridad: normalizarPrioridad_(row[COL.prioridad]),
    estado: String(row[COL.estado]).trim().toLowerCase() === 'completada' ? 'completada' : 'pendiente',
    asignadoA: String(row[COL.asignadoA]).trim(),
    creadoPor: String(row[COL.creadoPor]),
    fechaCreacion: normalizarFecha_(row[COL.fechaCreacion]),
    completadoPor: String(row[COL.completadoPor]),
    fechaCompletada: normalizarFecha_(row[COL.fechaCompletada])
  };
}

function rowToSucursal_(row) {
  return {
    id: String(row[COL_SUC.id]).trim(),
    nombre: String(row[COL_SUC.nombre]).trim(),
    direccion: String(row[COL_SUC.direccion]).trim(),
    activo: esActivo_(row[COL_SUC.activo])
  };
}

/** Devuelve { indice (1-based), valores } de la fila cuyo valor en `col` es `id`, o null. */
function filaPorId_(sheet, col, id) {
  var buscado = String(id || '').trim();
  if (!buscado) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][col]).trim() === buscado) {
      return { indice: i + 1, valores: rows[i] };
    }
  }
  return null;
}

function usuarioPorNombre_(sheet, nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][COL_USR.usuario]).trim().toUpperCase() === buscado) {
      return { indice: i + 1, valores: rows[i] };
    }
  }
  return null;
}

function usuarioExiste_(sheet, nombre) {
  return !!usuarioPorNombre_(sheet, nombre);
}

function contarAdminsActivos_(sheet) {
  var rows = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < rows.length; i++) {
    if (normalizarRol_(rows[i][COL_USR.rol]) === 'admin' && esActivo_(rows[i][COL_USR.activo])) total++;
  }
  return total;
}

function normalizarRol_(valor) {
  var r = String(valor || '').trim().toLowerCase();
  if (r === 'admin' || r === 'gerente') return r;
  return 'personal';
}

function normalizarPrioridad_(valor) {
  var p = String(valor || '').trim().toLowerCase();
  return PRIORIDADES.indexOf(p) === -1 ? 'media' : p;
}

/** "a1, b2" → ['a1', 'b2'] */
function parseSucursales_(valor) {
  return String(valor || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

/** Acepta TRUE, SI, SÍ o X (casilla de verificación) como "activo". */
function esActivo_(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  var texto = String(valor).trim().toUpperCase().replace('Í', 'I');
  return texto === 'TRUE' || texto === 'SI' || texto === 'X' || texto === '1';
}

/** Normaliza una fecha a texto ISO; Sheets puede convertir la celda a Date. */
function normalizarFecha_(valor) {
  if (valor instanceof Date) return valor.toISOString();
  return String(valor || '').trim();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
