import { Outlet } from 'react-router-dom';
import AchatsTabs from './AchatsTabs';

/** Cadre commun de la zone Achats : titre + onglets (Nouvel achat / Historique) + contenu. */
export default function AchatsLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Achats fournisseurs</h2>
        <p className="mt-1 text-sm text-ink-mute">Réapprovisionnez le stock et suivez vos commandes.</p>
      </div>
      <AchatsTabs />
      <Outlet />
    </div>
  );
}
