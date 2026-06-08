import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getSalaryPayments,
  createSalaryPayment,
  type SalaryPayment,
  type SalaryPaymentInput,
} from '../../api/salaries';
import { getEmployees, type Employee } from '../../api/employees';
import { formatEuro, formatDate } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
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

const currentMonth = () => new Date().toISOString().slice(0, 7);

interface FormState {
  employeeId: string;
  month: string;
  amount: string;
  note: string;
}

export default function SalairesPage() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ employeeId: '', month: currentMonth(), amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function reload() {
    const [pays, emps] = await Promise.all([getSalaryPayments(), getEmployees()]);
    setPayments(pays);
    setEmployees(emps);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => payments.reduce((s, p) => s + Number(p.amount), 0),
    [payments],
  );

  function openAdd() {
    setForm({ employeeId: '', month: currentMonth(), amount: '', note: '' });
    setFormError(null);
    setFormOpen(true);
  }

  // Sélection d'un employé → pré-remplit le montant avec son salaire de base.
  function onEmployeeChange(employeeId: string) {
    const emp = employees.find((e) => e.id === employeeId);
    setForm((f) => ({ ...f, employeeId, amount: emp ? String(emp.baseSalary) : f.amount }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employeeId) return setFormError('Sélectionnez un employé.');
    if (!form.month) return setFormError('Sélectionnez un mois.');
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) return setFormError('Montant invalide.');

    const payload: SalaryPaymentInput = {
      employeeId: form.employeeId,
      month: form.month,
      amount,
      note: form.note.trim() || undefined,
    };

    setSaving(true);
    try {
      await createSalaryPayment(payload);
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de l'enregistrement du paiement."));
    } finally {
      setSaving(false);
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
          {payments.length} paiement{payments.length > 1 ? 's' : ''} · total versé{' '}
          <span className="font-semibold text-ink">{formatEuro(total)}</span>
        </p>
        <Button onClick={openAdd} icon={<PlusIcon />} disabled={employees.length === 0}>
          Enregistrer un paiement
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Employé</th>
                <th className="px-5 py-3">Mois</th>
                <th className="px-5 py-3 text-right">Montant</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3">Payé le</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-ink">{p.employee.firstName} {p.employee.lastName}</div>
                    <div className="text-[12px] text-ink-mute">{p.employee.jobTitle}</div>
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-soft">{formatMonth(p.month)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-ink">{formatEuro(p.amount)}</td>
                  <td className="px-5 py-3 text-ink-soft">{p.note ?? '—'}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-ink-mute">{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">
            {employees.length === 0 ? 'Créez d’abord une fiche employé.' : 'Aucun paiement enregistré.'}
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Enregistrer un paiement de salaire"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="salary-form" loading={saving}>Enregistrer</Button>
          </>
        }
      >
        <form id="salary-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <Select label="Employé *" value={form.employeeId} onChange={(e) => onEmployeeChange(e.target.value)} autoFocus>
            <option value="">Sélectionner…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.jobTitle}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mois *" type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
            <Input label="Montant (€) *" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="1800" />
          </div>
          <Input label="Note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Prime, acompte… (optionnel)" />
          <p className="text-[12px] text-ink-faint">Un seul paiement par employé et par mois.</p>
        </form>
      </Modal>
    </div>
  );
}

const PlusIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
