import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type Role } from '../store/authStore';

/** Route d'accueil par défaut d'un rôle (post-login + redirection si rôle insuffisant). */
export function homeForRole(role: Role): string {
  return role === 'owner' ? '/dashboard' : '/mon-espace';
}

interface RoleRouteProps {
  /** Rôles autorisés à accéder aux routes enfants. */
  roles: Role[];
}

/**
 * Garde de rôle. À utiliser à l'intérieur de PrivateRoute (le profil est déjà chargé).
 * Si le rôle de l'utilisateur n'est pas autorisé, on le renvoie vers son accueil.
 */
export default function RoleRoute({ roles }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  // Sécurité : PrivateRoute garantit normalement un user chargé en amont.
  if (!user) return null;

  if (!roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}
