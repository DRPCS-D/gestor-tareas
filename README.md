# Gestor de Tareas

Registro de incidencias de mantenimiento de las sucursales (un foco quemado, un equipo descompuesto…). Las tareas quedan visibles para el personal de mantenimiento que debe resolverlas.

Frontend: React 19 + Vite + Tailwind 4 (Vercel). Backend: Google Apps Script sobre Google Sheets.

## Roles

| Rol | Puede |
|---|---|
| `admin` | Todo: tareas de cualquier sucursal, sucursales, usuarios, reabrir y borrar. |
| `gerente` | Registrar, asignar, editar y completar tareas **de su sucursal** (una sola). |
| `personal` | Ver las tareas que tiene asignadas y comentarlas. Puede cubrir varias sucursales. |

## Google Sheet

**Automático:** crea una hoja de cálculo vacía, pega `Code.gs` en Apps Script (ver abajo) y ejecuta la función `instalar` una vez. Crea las pestañas, encabezados, listas desplegables, una sucursal «Matriz» y un usuario `ADMIN` con contraseña aleatoria (la verás en la pestaña `Usuarios`). Es seguro volver a ejecutarla.

Si prefieres hacerlo a mano, las pestañas son (fila 1 = encabezados exactos):

| Pestaña | Columnas (A, B, C…) |
|---|---|
| `Tareas` | id, folio, sucursalId, titulo, descripcion, prioridad, estado, asignadoA, creadoPor, fechaCreacion, completadoPor, fechaCompletada |
| `Sucursales` | id, nombre, direccion, activo |
| `Usuarios` | usuario, password, rol, activo, sucursales |
| `Comentarios` | id, tareaId, usuario, texto, fecha |

Sin `instalar`, agrega a mano **un admin** en `Usuarios`: `ADMIN | <contraseña> | admin | TRUE |` (sucursales vacío). El resto se crea desde la app.
`sucursales` guarda ids de la pestaña `Sucursales`, separados por coma (la app lo gestiona sola).

## Backend (Apps Script)

1. En la hoja: Extensiones → Apps Script. Pega `apps-script/Code.gs` y, en la configuración del proyecto, activa «Mostrar el archivo appsscript.json» y pega `apps-script/appsscript.json`.
2. Elige la función `instalar` y pulsa Ejecutar (acepta los permisos). Mira el resultado en el registro de ejecución o en la hoja.
3. Implementar → Aplicación web → Ejecutar como: **Yo** · Acceso: **Cualquier usuario**.
4. Copia la URL `/exec`.

## Frontend

```bash
cp .env.example .env     # pega la URL /exec en VITE_APPS_SCRIPT_URL
npm install
npm run dev              # http://localhost:5177
```

En Vercel, define la variable de entorno `VITE_APPS_SCRIPT_URL` y despliega el repositorio.

## Notas de seguridad

Heredado del proyecto base: las contraseñas se guardan en texto plano en la hoja y viajan en cada llamada. Es aceptable para uso interno de baja criticidad; no reutilices contraseñas personales.
