import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { getSettings } from '../../api/settings';
import { useSettingsStore } from '../../store/settingsStore';

/** Coquille de l'application connectée : sidebar fixe + topbar + contenu de page. */
export default function AppLayout() {
  const setSettings = useSettingsStore((s) => s.setSettings);

  // Charge le branding (nom + logo) pour la sidebar et les en-têtes.
  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, [setSettings]);

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
