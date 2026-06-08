import { Outlet } from 'react-router-dom';
import ParametresTabs from './ParametresTabs';

/** Cadre commun des Paramètres : titre + onglets (Magasin | Comptes) + contenu. */
export default function ParametresLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Paramètres</h2>
        <p className="mt-1 text-sm text-ink-mute">Informations de la boutique et comptes d'accès.</p>
      </div>
      <ParametresTabs />
      <Outlet />
    </div>
  );
}
