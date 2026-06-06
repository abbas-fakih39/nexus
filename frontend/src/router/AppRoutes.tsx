import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PrivateRoute from './PrivateRoute';
import RoleRoute, { homeForRole } from './RoleRoute';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import Placeholder from '../pages/Placeholder';

/** Redirige `/` vers l'accueil du rôle (le profil est garanti par PrivateRoute). */
function RoleHome() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protégé (authentification requise) */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<RoleHome />} />

          {/* Owner uniquement */}
          <Route element={<RoleRoute roles={['owner']} />}>
            <Route path="dashboard" element={<Placeholder />} />
            <Route path="factures" element={<Placeholder />} />
            <Route path="employes" element={<Placeholder />} />
            <Route path="parametres" element={<Placeholder />} />
          </Route>

          {/* Employee uniquement */}
          <Route element={<RoleRoute roles={['employee']} />}>
            <Route path="mon-espace" element={<Placeholder />} />
          </Route>

          {/* Partagé owner + employee */}
          <Route element={<RoleRoute roles={['owner', 'employee']} />}>
            <Route path="stock" element={<Placeholder />} />
            <Route path="ventes" element={<Placeholder />} />
          </Route>
        </Route>
      </Route>

      {/* Tout le reste → racine (puis redirection selon l'état d'auth) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
