import { useEffect, useMemo, useState } from 'react';
import { getMyEmployee, type MyEmployee } from '../../api/employees';
import { formatEuro, formatDate } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';

/** "2026-06" → "juin 2026". */
function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function MonProfil() {
  const [me, setMe] = useState<MyEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getMyEmployee()
      .then(setMe)
      .catch((err) => {
        if ((err as { response?: { status?: number } })?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = useMemo(
    () => (me ? me.payments.reduce((s, p) => s + Number(p.amount), 0) : 0),
    [me],
  );

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  if (notFound || !me) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Mon profil</h2>
        <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center shadow-sm">
          <p className="text-sm text-ink-mute">
            Aucune fiche employé n'est associée à votre compte.<br />
            Contactez le gérant si vous pensez qu'il s'agit d'une erreur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Mon profil</h2>
        <p className="mt-1 text-sm text-ink-mute">Votre fiche et l'historique de vos salaires.</p>
      </div>

      {/* Fiche */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-bold text-ink">{me.firstName} {me.lastName}</div>
            <div className="mt-0.5 text-sm text-ink-mute">{me.jobTitle}</div>
          </div>
          <div className="rounded-xl bg-accent-softer px-4 py-2 text-right">
            <div className="text-[11px] font-medium text-accent-deep/80">Salaire de base</div>
            <div className="font-mono text-lg font-bold tabular-nums text-accent-deep">{formatEuro(me.baseSalary)}</div>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <Field label="Date d'embauche" value={formatDate(me.hiredAt)} mono />
          <Field label="Compte de connexion" value={me.user?.email ?? '—'} />
          <Field label="Paiements reçus" value={`${me.payments.length}`} mono />
        </dl>
      </div>

      {/* Historique salaires */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">Historique des salaires</h3>
          <p className="text-sm text-ink-mute">
            Total perçu <span className="font-semibold text-ink">{formatEuro(totalPaid)}</span>
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3">Mois</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Note</th>
                  <th className="px-5 py-3">Payé le</th>
                </tr>
              </thead>
              <tbody>
                {me.payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3 capitalize text-ink-soft">{formatMonth(p.month)}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-ink">{formatEuro(p.amount)}</td>
                    <td className="px-5 py-3 text-ink-soft">{p.note ?? '—'}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-ink-mute">{formatDate(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {me.payments.length === 0 && (
            <div className="px-5 py-14 text-center text-sm text-ink-mute">Aucun salaire enregistré pour le moment.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-ink-mute">{label}</dt>
      <dd className={`mt-1 text-[15px] font-semibold text-ink ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</dd>
    </div>
  );
}
