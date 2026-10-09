import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Inicio from '@/pages/Inicio'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'
import Sucursales from '@/pages/Sucursales'
import Tareas from '@/pages/Tareas'
import Usuarios from '@/pages/Usuarios'

/**
 * Dos zonas: `/login` publica, y todo lo demas dentro de `AppLayout` (exige
 * sesion). Sucursales y Usuarios son solo para admin (la propia pagina redirige).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="sucursales" element={<Sucursales />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
