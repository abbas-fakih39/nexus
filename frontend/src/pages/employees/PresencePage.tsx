import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  getTardiness,
  createTardiness,
  deleteTardiness,
  getOvertime,
  createOvertime,
  deleteOvertime,
  type Tardiness,
  type Overtime,
} from "../../api/attendance";
import { getEmployees, type Employee } from "../../api/employees";
import { formatDate } from "../../utils/format";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
}

const today = () => new Date().toISOString().slice(0, 10);

export default function PresencePage() {
  const [tardiness, setTardiness] = useState<Tardiness[]>([]);
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [tardOpen, setTardOpen] = useState(false);
  const [overOpen, setOverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tardForm, setTardForm] = useState({
    employeeId: "",
    date: today(),
    minutes: "",
    justified: false,
    note: "",
  });
  const [overForm, setOverForm] = useState({
    employeeId: "",
    date: today(),
    hours: "",
    note: "",
  });

  const [delTard, setDelTard] = useState<Tardiness | null>(null);
  const [delOver, setDelOver] = useState<Overtime | null>(null);

  async function reload() {
    const [t, o, e] = await Promise.all([
      getTardiness(),
      getOvertime(),
      getEmployees(),
    ]);
    setTardiness(t);
    setOvertime(o);
    setEmployees(e);
  }
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  function openTard() {
    setTardForm({
      employeeId: "",
      date: today(),
      minutes: "",
      justified: false,
      note: "",
    });
    setFormError(null);
    setTardOpen(true);
  }
  function openOver() {
    setOverForm({ employeeId: "", date: today(), hours: "", note: "" });
    setFormError(null);
    setOverOpen(true);
  }

  async function submitTard(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!tardForm.employeeId) return setFormError("Sélectionnez un employé.");
    const minutes = Number(tardForm.minutes);
    if (!tardForm.minutes || Number.isNaN(minutes) || minutes < 1)
      return setFormError("Minutes invalides.");
    setSaving(true);
    try {
      await createTardiness({
        employeeId: tardForm.employeeId,
        date: tardForm.date,
        minutes,
        justified: tardForm.justified,
        note: tardForm.note.trim() || undefined,
      });
      setTardOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  }

  async function submitOver(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!overForm.employeeId) return setFormError("Sélectionnez un employé.");
    const hours = Number(overForm.hours);
    if (!overForm.hours || Number.isNaN(hours) || hours <= 0)
      return setFormError("Heures invalides.");
    setSaving(true);
    try {
      await createOvertime({
        employeeId: overForm.employeeId,
        date: overForm.date,
        hours,
        note: overForm.note.trim() || undefined,
      });
      setOverOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelTard() {
    if (!delTard) return;
    try {
      await deleteTardiness(delTard.id);
      setDelTard(null);
      await reload();
    } catch (err) {
      setError(apiError(err, "Suppression impossible."));
    }
  }
  async function confirmDelOver() {
    if (!delOver) return;
    try {
      await deleteOvertime(delOver.id);
      setDelOver(null);
      await reload();
    } catch (err) {
      setError(apiError(err, "Suppression impossible."));
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  const noEmployees = employees.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </div>
      )}

      {/* Retards */}
      <Section
        title="Retards"
        action={
          <Button onClick={openTard} icon={<PlusIcon />} disabled={noEmployees}>
            Ajouter un retard
          </Button>
        }
      >
        <Table
          label="Retards"
          head={["Employé", "Date", "Retard", "Justifié", "Note", ""]}
        >
          {tardiness.map((t) => (
            <tr
              key={t.id}
              className="border-b border-border last:border-0 hover:bg-canvas"
            >
              <td className="px-5 py-3 font-semibold text-ink">
                {t.employee.firstName} {t.employee.lastName}
              </td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">
                {formatDate(t.date)}
              </td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">
                {t.minutes} min
              </td>
              <td className="px-5 py-3">
                <Badge tone={t.justified ? "success" : "warn"}>
                  {t.justified ? "Justifié" : "Non justifié"}
                </Badge>
              </td>
              <td className="px-5 py-3 text-ink-soft">{t.note ?? "—"}</td>
              <td className="px-5 py-3 text-right">
                <IconButton
                  label="Supprimer"
                  danger
                  onClick={() => setDelTard(t)}
                >
                  <TrashIcon />
                </IconButton>
              </td>
            </tr>
          ))}
        </Table>
        {tardiness.length === 0 && <Empty text="Aucun retard enregistré." />}
      </Section>

      {/* Heures supplémentaires */}
      <Section
        title="Heures supplémentaires"
        action={
          <Button onClick={openOver} icon={<PlusIcon />} disabled={noEmployees}>
            Ajouter des heures sup
          </Button>
        }
      >
        <Table
          label="Heures supplémentaires"
          head={["Employé", "Date", "Heures", "Note", ""]}
        >
          {overtime.map((o) => (
            <tr
              key={o.id}
              className="border-b border-border last:border-0 hover:bg-canvas"
            >
              <td className="px-5 py-3 font-semibold text-ink">
                {o.employee.firstName} {o.employee.lastName}
              </td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">
                {formatDate(o.date)}
              </td>
              <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">
                {Number(o.hours)} h
              </td>
              <td className="px-5 py-3 text-ink-soft">{o.note ?? "—"}</td>
              <td className="px-5 py-3 text-right">
                <IconButton
                  label="Supprimer"
                  danger
                  onClick={() => setDelOver(o)}
                >
                  <TrashIcon />
                </IconButton>
              </td>
            </tr>
          ))}
        </Table>
        {overtime.length === 0 && (
          <Empty text="Aucune heure supplémentaire enregistrée." />
        )}
      </Section>

      {/* Modale retard */}
      <Modal
        open={tardOpen}
        onClose={() => setTardOpen(false)}
        title="Ajouter un retard"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTardOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" form="tard-form" loading={saving}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form
          id="tard-form"
          onSubmit={submitTard}
          className="flex flex-col gap-4"
        >
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {formError}
            </div>
          )}
          <Select
            label="Employé *"
            value={tardForm.employeeId}
            onChange={(e) =>
              setTardForm((f) => ({ ...f, employeeId: e.target.value }))
            }
            autoFocus
          >
            <option value="">Sélectionner…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} — {e.jobTitle}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={tardForm.date}
              onChange={(e) =>
                setTardForm((f) => ({ ...f, date: e.target.value }))
              }
            />
            <Input
              label="Minutes de retard *"
              type="number"
              min="1"
              value={tardForm.minutes}
              onChange={(e) =>
                setTardForm((f) => ({ ...f, minutes: e.target.value }))
              }
              placeholder="15"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={tardForm.justified}
              onChange={(e) =>
                setTardForm((f) => ({ ...f, justified: e.target.checked }))
              }
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
            />
            Retard justifié
          </label>
          <Input
            label="Note"
            value={tardForm.note}
            onChange={(e) =>
              setTardForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Optionnel"
          />
        </form>
      </Modal>

      {/* Modale heures sup */}
      <Modal
        open={overOpen}
        onClose={() => setOverOpen(false)}
        title="Ajouter des heures supplémentaires"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOverOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" form="over-form" loading={saving}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form
          id="over-form"
          onSubmit={submitOver}
          className="flex flex-col gap-4"
        >
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {formError}
            </div>
          )}
          <Select
            label="Employé *"
            value={overForm.employeeId}
            onChange={(e) =>
              setOverForm((f) => ({ ...f, employeeId: e.target.value }))
            }
            autoFocus
          >
            <option value="">Sélectionner…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} — {e.jobTitle}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={overForm.date}
              onChange={(e) =>
                setOverForm((f) => ({ ...f, date: e.target.value }))
              }
            />
            <Input
              label="Heures *"
              type="number"
              min="0.25"
              step="0.25"
              value={overForm.hours}
              onChange={(e) =>
                setOverForm((f) => ({ ...f, hours: e.target.value }))
              }
              placeholder="2"
            />
          </div>
          <Input
            label="Note"
            value={overForm.note}
            onChange={(e) =>
              setOverForm((f) => ({ ...f, note: e.target.value }))
            }
            placeholder="Optionnel"
          />
        </form>
      </Modal>

      {/* Confirmations suppression */}
      <Modal
        open={Boolean(delTard)}
        onClose={() => setDelTard(null)}
        title="Supprimer le retard"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDelTard(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelTard}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Confirmer la suppression de ce retard ?
        </p>
      </Modal>
      <Modal
        open={Boolean(delOver)}
        onClose={() => setDelOver(null)}
        title="Supprimer les heures sup"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDelOver(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelOver}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Confirmer la suppression de ces heures supplémentaires ?
        </p>
      </Modal>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {action}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function Table({
  head,
  children,
  label,
}: {
  head: string[];
  children: ReactNode;
  label: string;
}) {
  return (
    <table aria-label={label} className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {head.map((h, i) => (
            <th
              key={i}
              className={`px-5 py-3 ${i === head.length - 1 ? "text-right" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-5 py-12 text-center text-sm text-ink-mute">{text}</div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-canvas ${danger ? "hover:text-danger" : "hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

const PlusIcon = () => (
  <svg
    className="h-[18px] w-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const TrashIcon = () => (
  <svg
    className="h-[17px] w-[17px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
