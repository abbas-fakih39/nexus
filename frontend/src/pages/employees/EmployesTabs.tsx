import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/employes', label: 'Fiches', end: true },
  { to: '/employes/salaires', label: 'Salaires', end: false },
];

export default function EmployesTabs() {
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `relative px-4 py-2.5 text-sm font-semibold transition ${
              isActive ? 'text-accent-deep' : 'text-ink-mute hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {t.label}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
