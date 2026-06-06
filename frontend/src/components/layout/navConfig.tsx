import type { ReactNode } from 'react';
import type { Role } from '../../store/authStore';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const icons = {
  dashboard: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7" height="9" rx="1.2" />
      <rect x="14" y="3" width="7" height="5" rx="1.2" />
      <rect x="14" y="12" width="7" height="9" rx="1.2" />
      <rect x="3" y="16" width="7" height="5" rx="1.2" />
    </svg>
  ),
  stock: (
    <svg {...svgProps}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  ),
  ventes: (
    <svg {...svgProps}>
      <path d="M3 3h2l3 13h12l2-9H6" />
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="17" cy="20" r="1.6" />
    </svg>
  ),
  factures: (
    <svg {...svgProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  employes: (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15 20c0-2.4 1.2-4.4 3-5.4" />
    </svg>
  ),
  parametres: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
};

const OWNER_NAV: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard', icon: icons.dashboard },
  { label: 'Stock', path: '/stock', icon: icons.stock },
  { label: 'Ventes', path: '/ventes', icon: icons.ventes },
  { label: 'Factures', path: '/factures', icon: icons.factures },
  { label: 'Employés', path: '/employes', icon: icons.employes },
  { label: 'Paramètres', path: '/parametres', icon: icons.parametres },
];

const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Tableau de bord', path: '/mon-espace', icon: icons.dashboard },
  { label: 'Ventes', path: '/ventes', icon: icons.ventes },
  { label: 'Stock', path: '/stock', icon: icons.stock },
];

export function navForRole(role: Role): NavItem[] {
  return role === 'owner' ? OWNER_NAV : EMPLOYEE_NAV;
}

/** Titre de page à partir du chemin courant (pour la Topbar et les placeholders). */
export function titleForPath(pathname: string): string {
  const match = [...OWNER_NAV, ...EMPLOYEE_NAV].find((i) => i.path === pathname);
  return match?.label ?? 'Nexus';
}
