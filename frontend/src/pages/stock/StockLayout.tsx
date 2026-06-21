import { Outlet } from "react-router-dom";
import StockTabs from "./StockTabs";

/** Cadre commun de la zone Stock : titre + onglets + contenu de l'onglet. */
export default function StockLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Gestion du stock
        </h2>
        <p className="mt-1 text-sm text-ink-mute">
          Amrani Sport · Boutique Bastille
        </p>
      </div>
      <StockTabs />
      <Outlet />
    </div>
  );
}
