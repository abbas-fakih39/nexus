import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getSettings } from "../../api/settings";
import { useSettingsStore } from "../../store/settingsStore";

/** Coquille de l'application connectée : sidebar (tiroir sur mobile) + topbar + contenu. */
export default function AppLayout() {
  const setSettings = useSettingsStore((s) => s.setSettings);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Charge le branding (nom + logo) pour la sidebar et les en-têtes.
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {});
  }, [setSettings]);

  // Ferme le tiroir mobile à chaque changement de page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Échap ferme le tiroir mobile.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setNavOpen(true)} navOpen={navOpen} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
