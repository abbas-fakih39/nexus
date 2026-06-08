import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { navForRole } from './navConfig';

function monogram(name: string): string {
  const parts = name.replace(/[^a-zA-ZÀ-ÿ ]/g, '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((w) => w[0]).join('');
  return (letters || 'N').toUpperCase();
}

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const items = navForRole(user?.role ?? 'employee');

  const settings = useSettingsStore((s) => s.settings);
  const shopName = settings?.shopName || 'Nexus';
  const logo = settings?.logoPath;

  return (
    <>
      {/* Fond cliquable du tiroir (mobile uniquement) */}
      <div
        className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[264px] flex-col overflow-hidden border-r border-white/10 bg-sidebar px-4 pb-5 pt-6 text-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Marque boutique (nom + logo pilotés depuis Paramètres) */}
      <div className="flex items-center gap-3 px-2">
        {logo ? (
          <img src={logo} alt={shopName} className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-bold tracking-tight text-white shadow-sm">
            {monogram(shopName)}
          </div>
        )}
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[17px] font-bold tracking-tight">{shopName}</span>
          {settings?.address && (
            <span className="mt-1 truncate text-[11.5px] font-medium text-white/50">{settings.address}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-3 mb-2 mt-7 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/35">
        Menu
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-accent/12 text-white shadow-[inset_0_0_0_1px] shadow-accent/30'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`[&_svg]:h-[18px] [&_svg]:w-[18px] ${
                    isActive ? 'text-accent' : 'opacity-90'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Pied — seul crédit produit */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3.5 text-[11px] text-white/40">
        <span>© 2026 Nexus</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10.5px]">v1.0.0</span>
      </div>
      </aside>
    </>
  );
}
