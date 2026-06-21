import { Outlet } from "react-router-dom";
import VentesTabs from "./VentesTabs";

/** Cadre commun de la zone Ventes : titre + onglets (Caisse / Historique) + contenu. */
export default function VentesLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Ventes</h2>
        <p className="mt-1 text-sm text-ink-mute">
          Encaissez et consultez l'historique des ventes.
        </p>
      </div>
      <VentesTabs />
      <Outlet />
    </div>
  );
}
