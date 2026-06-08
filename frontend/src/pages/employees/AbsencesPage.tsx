import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getAbsences,
  createAbsence,
  decideAbsence,
  deleteAbsence,
  ABSENCE_TYPE_LABEL,
  ABSENCE_STATUS_LABEL,
  type Absence,
  type AbsenceType,
  type AbsenceStatus,
  type CreateAbsenceInput,
} from '../../api/absences';
import { getEmployees, type Employee } from '../../api/employees';
import { formatDate } from '../../utils/format';
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

const STATUS_TONE: Record<AbsenceStatus, 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  approved: 'success',
  rejected: 'danger',
};

const TYPES: AbsenceType[] = ['paid_leave', 'unpaid_leave', 'sick', 'other'];

interface FormState {
  employeeId: string;
  type: AbsenceType;
  mode: 'single' | 'range';
  date: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: string;
}
const EMPTY: FormState = { employeeId: '', type: 'paid_leave', mode: 'single', date: '', startDate: '', endDate: '', reason: '', days: '' };

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [fEmployee, setFEmployee] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fType, setFType] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Absence | null>(null);

  async function reload() {
    const [abs, emps] = await Promise.all([getAbsences(), getEmployees()]);
    setAbsences(abs);
    setEmployees(emps);
  }
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      absences.filter(
        (a) =>
          (!fEmployee || a.employee.id === fEmployee) &&
          (!fStatus || a.status === fStatus) &&
          (!fType || a.type === fType),
      ),
    [absences, fEmployee, fStatus, fType],
  );

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function openAdd() {
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employeeId) return setFormError('Sélectionnez un employé.');

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

    const payload: CreateAbsenceInput = {
      employeeId: form.employeeId,
      type: form.type,
      startDate,
      endDate,
      reason: form.reason.trim() || undefined,
      days: form.days ? Number(form.days) : undefined,
    };
    setSaving(true);
    try {
      await createAbsence(payload);
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  }

  async function decide(a: Absence, status: 'approved' | 'rejected') {
    setRowError(null);
    setBusyId(a.id);
    try {
      await decideAbsence(a.id, status);
      await reload();
    } catch (err) {
      setRowError(apiError(err, 'Action impossible.'));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteAbsence(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setRowError(apiError(err, 'Suppression impossible.'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  const pendingCount = absences.filter((a) => a.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-mute">
          {pendingCount > 0
            ? `${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente de validation.`
            : 'Aucune demande en attente.'}
        </p>
        <Button onClick={openAdd} icon={<PlusIcon />} disabled={employees.length === 0}>
          Saisir une absence
        </Button>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={fEmployee} onChange={(e) => setFEmployee(e.target.value)}>
          <option value="">Tous les employés</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
          ))}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {(Object.keys(ABSENCE_STATUS_LABEL) as AbsenceStatus[]).map((s) => (
            <option key={s} value={s}>{ABSENCE_STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <Select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Tous les types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{ABSENCE_TYPE_LABEL[t]}</option>
          ))}
        </Select>
      </div>

      {rowError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{rowError}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table aria-label="Absences" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Employé</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Période</th>
                <th className="px-5 py-3 text-right">Jours</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Motif</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3 font-semibold text-ink">{a.employee.firstName} {a.employee.lastName}</td>
                  <td className="px-5 py-3"><Badge tone="neutral">{ABSENCE_TYPE_LABEL[a.type]}</Badge></td>
                  <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{formatDate(a.startDate)} → {formatDate(a.endDate)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-soft">{Number(a.days)}</td>
                  <td className="px-5 py-3"><Badge tone={STATUS_TONE[a.status]}>{ABSENCE_STATUS_LABEL[a.status]}</Badge></td>
                  <td className="px-5 py-3 text-ink-soft">{a.reason ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {a.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => decide(a, 'approved')} disabled={busyId === a.id}
                            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-accent-deep transition hover:bg-accent-softer disabled:opacity-50">Approuver</button>
                          <button type="button" onClick={() => decide(a, 'rejected')} disabled={busyId === a.id}
                            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-50">Refuser</button>
                        </>
                      )}
                      <IconButton label="Supprimer" danger onClick={() => { setRowError(null); setDeleteTarget(a); }}><TrashIcon /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">Aucune absence.</div>
        )}
      </div>

      {/* Saisie */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Saisir une absence"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="absence-form" loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <form id="absence-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <Select label="Employé *" value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} autoFocus>
            <option value="">Sélectionner…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.jobTitle}</option>
            ))}
          </Select>
          <Select label="Type *" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ABSENCE_TYPE_LABEL[t]}</option>
            ))}
          </Select>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">Durée</span>
            <div className="flex gap-2">
              <ModeButton active={form.mode === 'single'} onClick={() => set('mode', 'single')}>1 jour</ModeButton>
              <ModeButton active={form.mode === 'range'} onClick={() => set('mode', 'range')}>Plusieurs jours</ModeButton>
            </div>
          </div>
          {form.mode === 'single' ? (
            <Input label="Date *" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Du *" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              <Input label="Au *" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          )}
          <Input label="Jours (laisser vide = calcul auto des jours ouvrés)" type="number" min="0.5" step="0.5" value={form.days} onChange={(e) => set('days', e.target.value)} placeholder="Ex. 0.5 pour une demi-journée" />
          <Input
            label={form.type === 'other' ? 'Motif *' : 'Motif'}
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
            placeholder={form.type === 'other' ? 'Obligatoire pour une absence « Autre »' : 'Optionnel'}
          />
          <p className="text-[12px] text-ink-faint">Une absence saisie par le gérant est directement approuvée.</p>
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'absence"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete} loading={busyId === deleteTarget?.id}>Supprimer</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Confirmer la suppression de cette absence de{' '}
          <span className="font-semibold text-ink">{deleteTarget?.employee.firstName} {deleteTarget?.employee.lastName}</span> ?
        </p>
      </Modal>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function IconButton({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-canvas ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}>
      {children}
    </button>
  );
}

const PlusIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const TrashIcon = () => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
