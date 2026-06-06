import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { titleForPath } from './navConfig';

/** Initiales à partir du nom complet ("Karim Amrani" → "KA"). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-10 flex h-[68px] items-center border-b border-border bg-surface px-8">
      <h1 className="text-[19px] font-bold tracking-tight text-ink">
        {titleForPath(location.pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-softer text-[13px] font-bold text-accent-deep">
            {user ? initials(user.name) : '?'}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-ink">{user?.name}</span>
            <span className="text-[11px] capitalize text-ink-mute">
              {user?.role === 'owner' ? 'Propriétaire' : 'Employé'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Se déconnecter"
          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-ink-mute transition hover:border-border-strong hover:bg-canvas hover:text-ink"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
