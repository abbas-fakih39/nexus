import { Outlet } from 'react-router-dom';
import EmployesTabs from './EmployesTabs';

/** Cadre commun du module Employés : titre + onglets (Fiches | Salaires) + contenu. */
export default function EmployesLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Employés</h2>
        <p className="mt-1 text-sm text-ink-mute">Fiches du personnel et paiements de salaire.</p>
      </div>
      <EmployesTabs />
      <Outlet />
    </div>
  );
}
