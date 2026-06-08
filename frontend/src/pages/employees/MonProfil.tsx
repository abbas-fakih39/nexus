import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { getMyEmployee, type MyEmployee } from '../../api/employees';
import {
  createAbsence,
  deleteAbsence,
  ABSENCE_TYPE_LABEL,
  ABSENCE_STATUS_LABEL,
  type AbsenceType,
  type AbsenceStatus,
} from '../../api/absences';
import { formatEuro, formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m ?? fallback);
}

/** "2026-06" → "juin 2026". */
function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const STATUS_TONE: Record<AbsenceStatus, 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
};
const TYPES: AbsenceType[] = ['paid_leave', 'unpaid_leave', 'sick', 'other'];

export default function MonProfil() {
  const [me, setMe] = useState<MyEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'paid_leave' as AbsenceType,
    mode: 'single' as 'single' | 'range',
    date: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function load() {
    return getMyEmployee()
      .then(setMe)
      .catch((err) => {
        if ((err as { response?: { status?: number } })?.response?.status === 404) setNotFound(true);
      });
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  function openRequest() {
    setForm({ type: 'paid_leave', mode: 'single', date: '', startDate: '', endDate: '', reason: '' });
    setFormError(null);
    setFormOpen(true);
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    let startDate: string;
    let endDate: string;
    if (form.mode === 'single') {
      if (!form.date) return setFormError('Renseignez la date.');
      startDate = endDate = form.date;
    } else {
      if (!form.startDate || !form.endDate) return setFormError('Renseignez les dates.');
      if (form.endDate < form.startDate) return setFormError('La date de fin doit être après le début.');
      startDate = form.startDate;
      endDate = form.endDate;
    }
    if (form.type === 'other' && !form.reason.trim()) {
      return setFormError('Le motif est obligatoire pour une absence de type « Autre ».');
    }

    setSaving(true);
    try {
      await createAbsence({
        type: form.type,
        startDate,
        endDate,
        reason: form.reason.trim() || undefined,
      });
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(apiError(err, 'Échec de la demande.'));
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    setRowError(null);
    setCancelId(id);
    try {
      await deleteAbsence(id);
      await load();
    } catch (err) {
      setRowError(apiError(err, 'Annulation impossible.'));
    } finally {
      setCancelId(null);
    }
  }

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

  const lb = me.leaveBalance;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Mon profil</h2>
        <p className="mt-1 text-sm text-ink-mute">Votre fiche, vos congés, absences et salaires.</p>
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

      {/* Solde de congés */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-bold text-ink">Solde de congés payés</h3>
          <Button onClick={openRequest} icon={<PlusIcon />}>Demander un congé</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Quota annuel" value={`${lb.quota} j`} />
          <Stat label="Pris" value={`${lb.taken} j`} />
          <Stat label="En attente" value={`${lb.pending} j`} tone="warn" />
          <Stat label="Restants" value={`${lb.remaining} j`} tone="accent" />
        </div>
      </div>

      {rowError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{rowError}</div>
      )}

      {/* Absences */}
      <Section title="Mes absences">
        <Table label="Mes absences" head={['Type', 'Période', 'Jours', 'Statut', 'Motif', '']}>
          {me.absences.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-0 hover:bg-canvas">
              <td className="px-5 py-3"><Badge tone="neutral">{ABSENCE_TYPE_LABEL[a.type]}</Badge></td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{formatDate(a.startDate)} → {formatDate(a.endDate)}</td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{Number(a.days)}</td>
              <td className="px-5 py-3"><Badge tone={STATUS_TONE[a.status]}>{ABSENCE_STATUS_LABEL[a.status]}</Badge></td>
              <td className="px-5 py-3 text-ink-soft">{a.reason ?? '—'}</td>
              <td className="px-5 py-3 text-right">
                {a.status === 'pending' && (
                  <button type="button" onClick={() => cancel(a.id)} disabled={cancelId === a.id}
                    className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-50">Annuler</button>
                )}
              </td>
            </tr>
          ))}
        </Table>
        {me.absences.length === 0 && <Empty text="Aucune absence." />}
      </Section>

      {/* Retards */}
      <Section title="Mes retards" subtitle={`${me.counters.tardinessCount} cette année · ${me.counters.tardinessMinutes} min cumulées`}>
        <Table label="Mes retards" head={['Date', 'Retard', 'Justifié', 'Note']}>
          {me.tardiness.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0 hover:bg-canvas">
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{formatDate(t.date)}</td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{t.minutes} min</td>
              <td className="px-5 py-3"><Badge tone={t.justified ? 'success' : 'warn'}>{t.justified ? 'Justifié' : 'Non justifié'}</Badge></td>
              <td className="px-5 py-3 text-ink-soft">{t.note ?? '—'}</td>
            </tr>
          ))}
        </Table>
        {me.tardiness.length === 0 && <Empty text="Aucun retard. 👍" />}
      </Section>

      {/* Heures sup */}
      <Section title="Mes heures supplémentaires" subtitle={`${me.counters.overtimeHours} h cette année`}>
        <Table label="Mes heures supplémentaires" head={['Date', 'Heures', 'Note']}>
          {me.overtimes.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0 hover:bg-canvas">
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{formatDate(o.date)}</td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{Number(o.hours)} h</td>
              <td className="px-5 py-3 text-ink-soft">{o.note ?? '—'}</td>
            </tr>
          ))}
        </Table>
        {me.overtimes.length === 0 && <Empty text="Aucune heure supplémentaire." />}
      </Section>

      {/* Salaires */}
      <Section title="Historique des salaires">
        <Table label="Historique des salaires" head={['Mois', 'Montant', 'Note', 'Payé le']}>
          {me.payments.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
              <td className="px-5 py-3 capitalize text-ink-soft">{formatMonth(p.month)}</td>
              <td className="px-5 py-3 font-mono tabular-nums font-semibold text-ink">{formatEuro(p.amount)}</td>
              <td className="px-5 py-3 text-ink-soft">{p.note ?? '—'}</td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-mute">{formatDate(p.paidAt)}</td>
            </tr>
          ))}
        </Table>
        {me.payments.length === 0 && <Empty text="Aucun salaire enregistré pour le moment." />}
      </Section>

      {/* Demande de congé */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Demander un congé"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="leave-form" loading={saving}>Envoyer la demande</Button>
          </>
        }
      >
        <form id="leave-form" onSubmit={submitRequest} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <Select label="Type *" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AbsenceType }))} autoFocus>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ABSENCE_TYPE_LABEL[t]}</option>
            ))}
          </Select>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Durée</span>
            <div className="flex gap-2">
              <ModeButton active={form.mode === 'single'} onClick={() => setForm((f) => ({ ...f, mode: 'single' }))}>1 jour</ModeButton>
              <ModeButton active={form.mode === 'range'} onClick={() => setForm((f) => ({ ...f, mode: 'range' }))}>Plusieurs jours</ModeButton>
            </div>
          </div>
          {form.mode === 'single' ? (
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Du *" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              <Input label="Au *" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          )}
          <Input
            label={form.type === 'other' ? 'Motif *' : 'Motif'}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder={form.type === 'other' ? 'Obligatoire pour une absence « Autre »' : 'Optionnel'}
          />
          <p className="text-[12px] text-ink-faint">Votre demande sera transmise au gérant pour validation.</p>
        </form>
      </Modal>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-border bg-canvas text-ink-mute hover:border-border-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'accent' }) {
  const color = tone === 'accent' ? 'text-accent-deep' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="rounded-xl border border-border bg-canvas px-4 py-3">
      <div className="text-[11px] font-medium text-ink-mute">{label}</div>
      <div className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {subtitle && <span className="text-[12px] text-ink-mute">{subtitle}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function Table({ head, children, label }: { head: string[]; children: ReactNode; label: string }) {
  return (
    <table aria-label={label} className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {head.map((h, i) => (
            <th key={i} className={`px-5 py-3 ${i === head.length - 1 ? 'text-right' : ''}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-ink-mute">{text}</div>;
}

const PlusIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
