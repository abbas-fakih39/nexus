import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMe } from '../api/auth';

/**
 * Garde d'authentification.
 * - Pas de token → redirection vers /login.
 * - Token présent mais profil non chargé (ex. après un rechargement) → on restaure
 *   le profil via GET /auth/me, avec un loader. Token invalide → logout (→ /login).
 * - Token + profil → rend les routes enfants.
 */
export default function PrivateRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (token && !user) {
      getMe()
        .then(setUser)
        .catch(() => logout());
    }
  }, [token, user, setUser, logout]);

  if (!token) return <Navigate to="/login" replace />;

  // Token présent, profil en cours de restauration (ou logout imminent si échec).
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return <Outlet />;
}
