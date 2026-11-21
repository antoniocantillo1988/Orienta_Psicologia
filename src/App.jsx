// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Citas from './pages/Citas';
import Chat from './pages/Chat';
import Material from './pages/Material';
import Tareas from './pages/Tareas';
import Informes from './pages/Informes';
import Talleres from './pages/Talleres';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminCitas from './pages/AdminCitas';
import AdminUsuarios from './pages/AdminUsuarios';
import AcercaDe from './pages/AcercaDe';
import Privacidad from './pages/Privacidad';

const AdminTalleres = lazy(() => import('./pages/AdminTalleres'));
const Curso = lazy(() => import('./pages/Curso'));

function CargandoPagina() {
  return <div className="py-16 text-center text-sm text-stone-500" role="status">Cargando espacio del campus…</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Layout (menú lateral + pie) compartido por todas las rutas */}
          <Route element={<Layout />}>
            {/* Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/citas" element={<Citas />} />
            <Route path="/talleres" element={<Talleres />} />
            <Route path="/cursos/:id" element={<ProtectedRoute><Suspense fallback={<CargandoPagina />}><Curso /></Suspense></ProtectedRoute>} />
            <Route path="/material" element={<Material />} />
            <Route path="/acerca-de" element={<AcercaDe />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/privacidad" element={<Privacidad />} />

            {/* Requieren sesión */}
            <Route path="/campus" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/campus" replace /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/tareas" element={<ProtectedRoute><Tareas /></ProtectedRoute>} />
            <Route path="/informes" element={<ProtectedRoute><Informes /></ProtectedRoute>} />

            {/* Solo administradores (tipo 1) */}
            <Route path="/admin/citas" element={<ProtectedRoute adminOnly><AdminCitas /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><AdminUsuarios /></ProtectedRoute>} />
            <Route path="/admin/talleres" element={<ProtectedRoute adminOnly><Suspense fallback={<CargandoPagina />}><AdminTalleres /></Suspense></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
