import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type Employee,
  type EmployeeInput,
} from '../../api/employees';
import { getAccounts, type Account } from '../../api/users';
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

interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: string;
  hiredAt: string;
  leaveQuota: string;
  userId: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  baseSalary: '',
  hiredAt: '',
  leaveQuota: '25',
  userId: '',
};

function toForm(e: Employee | null): FormState {
  return {
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    jobTitle: e?.jobTitle ?? '',
    baseSalary: e ? String(e.baseSalary) : '',
    hiredAt: e ? e.hiredAt.slice(0, 10) : '',
    leaveQuota: e ? String(e.leaveQuota) : '25',
    userId: e?.user?.id ?? '',
  };
}

export default function FichesEmployes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function reload() {
    const [emps, accs] = await Promise.all([getEmployees(), getAccounts()]);
    setEmployees(emps);
    setAccounts(accs);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  // Comptes employés rattachables : libres + celui déjà lié à la fiche en édition.
  const linkableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.role === 'employee' &&
          (a.employee === null || a.employee.id === editing?.id),
      ),
    [accounts, editing],
  );

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm(toForm(e));
    setFormError(null);
    setFormOpen(true);
  }

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Choisir un compte importe son nom (champ unique « name » → prénom + nom).
  function onAccountChange(userId: string) {
    const acc = linkableAccounts.find((a) => a.id === userId);
    setForm((f) => {
      if (!acc) return { ...f, userId };
      const [first, ...rest] = acc.name.trim().split(/\s+/);
      return { ...f, userId, firstName: first ?? f.firstName, lastName: rest.join(' ') || f.lastName };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) return setFormError('Le nom et le prénom sont obligatoires.');
    if (!form.jobTitle.trim()) return setFormError('Le poste est obligatoire.');
    const salary = Number(form.baseSalary);
    if (!form.baseSalary || Number.isNaN(salary) || salary < 0) return setFormError('Salaire de base invalide.');
    if (!form.hiredAt) return setFormError("La date d'embauche est obligatoire.");
    const quota = Number(form.leaveQuota);
    if (form.leaveQuota === '' || !Number.isInteger(quota) || quota < 0) return setFormError('Quota de congés invalide.');

    const payload: EmployeeInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      jobTitle: form.jobTitle.trim(),
      baseSalary: salary,
      hiredAt: form.hiredAt,
      leaveQuota: quota,
      userId: form.userId || null,
    };

    setSaving(true);
    try {
      if (editing) await updateEmployee(editing.id, payload);
      else await createEmployee(payload);
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setDeleteError(apiError(err, 'Suppression impossible.'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-mute">
          Gérez les fiches du personnel et rattachez-les éventuellement à un compte de connexion.
        </p>
        <Button onClick={openAdd} icon={<PlusIcon />}>Ajouter un employé</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Employé</th>
                <th className="px-5 py-3">Poste</th>
                <th className="px-5 py-3 text-right">Salaire de base</th>
                <th className="px-5 py-3">Embauché le</th>
                <th className="px-5 py-3 text-right">Congés restants</th>
                <th className="px-5 py-3">Compte</th>
                <th className="px-5 py-3 text-right">Paiements</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3 font-semibold text-ink">{e.firstName} {e.lastName}</td>
                  <td className="px-5 py-3 text-ink-soft">{e.jobTitle}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-soft">{formatEuro(e.baseSalary)}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-ink-mute">{formatDate(e.hiredAt)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-soft">
                    {e.leaveBalance.remaining} / {e.leaveBalance.quota} j
                  </td>
                  <td className="px-5 py-3">
                    {e.user ? (
                      <Badge tone={e.user.isActive ? 'success' : 'danger'}>
                        {e.user.isActive ? e.user.email : `${e.user.email} (désactivé)`}
                      </Badge>
                    ) : (
                      <span className="text-ink-faint">Aucun</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-mute">{e._count.payments}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Modifier" onClick={() => openEdit(e)}><PencilIcon /></IconButton>
                      <IconButton label="Supprimer" danger onClick={() => { setDeleteError(null); setDeleteTarget(e); }}><TrashIcon /></IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employees.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">Aucun employé.</div>
        )}
      </div>

      {/* Ajout / édition */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Modifier la fiche employé" : 'Ajouter un employé'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="employee-form" loading={saving}>{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <div>
            <Select label="Compte de connexion (optionnel)" value={form.userId} onChange={(e) => onAccountChange(e.target.value)} autoFocus>
              <option value="">Aucun — saisir manuellement</option>
              {linkableAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.email}</option>
              ))}
            </Select>
            <p className="mt-1.5 text-[12px] text-ink-faint">
              Choisir un compte importe automatiquement son nom. Les comptes se créent dans Paramètres → Comptes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom *" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Sofiane" />
            <Input label="Nom *" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Benali" />
          </div>
          <Input label="Poste *" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Caissier, Vendeur…" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Salaire de base (€) *" type="number" min="0" step="0.01" value={form.baseSalary} onChange={(e) => set('baseSalary', e.target.value)} placeholder="1800" />
            <Input label="Date d'embauche *" type="date" value={form.hiredAt} onChange={(e) => set('hiredAt', e.target.value)} />
            <Input label="Congés payés (j/an) *" type="number" min="0" step="1" value={form.leaveQuota} onChange={(e) => set('leaveQuota', e.target.value)} placeholder="25" />
          </div>
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la fiche"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>Supprimer</Button>
          </>
        }
      >
        {deleteError && (
          <div role="alert" className="mb-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{deleteError}</div>
        )}
        <p className="text-sm text-ink-soft">
          Confirmer la suppression de la fiche de <span className="font-semibold text-ink">{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ?
          {deleteTarget && deleteTarget._count.payments > 0 && (
            <span className="mt-2 block text-[12px] text-ink-mute">
              Cette fiche a des paiements de salaire enregistrés : la suppression sera refusée.
            </span>
          )}
        </p>
      </Modal>
    </div>
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
const PencilIcon = () => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const TrashIcon = () => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
