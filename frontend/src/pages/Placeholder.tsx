import { useLocation } from 'react-router-dom';
import { titleForPath } from '../components/layout/navConfig';

/**
 * Page temporaire affichée tant qu'un module n'est pas implémenté.
 * Chaque sprint remplacera ces placeholders par les vraies pages.
 */
export default function Placeholder() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex max-w-sm flex-col items-center rounded-2xl border border-border bg-surface px-10 py-12 text-center shadow-sm">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-softer text-accent-deep">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <h2 className="mt-5 text-lg font-bold tracking-tight text-ink">{title}</h2>
        <p className="mt-1.5 text-sm text-ink-mute">
          Module à venir — il sera construit dans un prochain sprint.
        </p>
      </div>
    </div>
  );
}
