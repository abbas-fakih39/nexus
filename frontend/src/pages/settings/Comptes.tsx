import { useEffect, useState, type FormEvent } from "react";
import { useAuthStore } from "../../store/authStore";
import {
  getAccounts,
  createAccount,
  setAccountActive,
  deleteAccount,
  type Account,
  type CreateAccountInput,
} from "../../api/users";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : (m ?? fallback);
}

const dateFr = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

interface FormState {
  name: string;
  email: string;
  password: string;
}
const EMPTY: FormState = { name: "", email: "", password: "" };

export default function Comptes() {
  const currentId = useAuthStore((s) => s.user?.id);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function reload() {
    setAccounts(await getAccounts());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  }
  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return setFormError("Le nom est obligatoire.");
    if (form.password.length < 6)
      return setFormError("Le mot de passe doit faire au moins 6 caractères.");

    const payload: CreateAccountInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    setSaving(true);
    try {
      await createAccount(payload);
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(apiError(err, "Échec de la création du compte."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: Account) {
    setRowError(null);
    setBusyId(a.id);
    try {
      await setAccountActive(a.id, !a.isActive);
      await reload();
    } catch (err) {
      setRowError(apiError(err, "Action impossible."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setDeleteError(apiError(err, "Suppression impossible."));
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
          Créez des accès pour vos employés. Un compte désactivé ne peut plus se
          connecter.
        </p>
        <Button onClick={openAdd} icon={<PlusIcon />}>
          Ajouter un compte
        </Button>
      </div>

      {rowError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {rowError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table aria-label="Comptes utilisateurs" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Utilisateur</th>
                <th className="px-5 py-3">Rôle</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Activité</th>
                <th className="px-5 py-3">Créé le</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const isOwner = a.role === "owner";
                const isSelf = a.id === currentId;
                const ops = a._count.sales + a._count.purchases;
                return (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-canvas"
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">
                        {a.name}
                        {isSelf && (
                          <span className="ml-2 text-[11px] font-medium text-ink-faint">
                            (vous)
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-ink-mute">{a.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={isOwner ? "neutral" : "success"}>
                        {isOwner ? "Propriétaire" : "Employé"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={a.isActive ? "success" : "danger"}>
                        {a.isActive ? "Actif" : "Désactivé"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {ops === 0 ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        `${a._count.sales} ventes · ${a._count.purchases} achats`
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono tabular-nums text-ink-mute">
                      {dateFr(a.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {isOwner || isSelf ? (
                          <span className="text-[12px] text-ink-faint">—</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleActive(a)}
                              disabled={busyId === a.id}
                              className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink-mute transition hover:bg-canvas hover:text-ink disabled:opacity-50"
                            >
                              {a.isActive ? "Désactiver" : "Réactiver"}
                            </button>
                            <IconButton
                              label="Supprimer"
                              danger
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(a);
                              }}
                            >
                              <TrashIcon />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {accounts.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">
            Aucun compte.
          </div>
        )}
      </div>

      {/* Création */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Ajouter un compte employé"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" form="account-form" loading={saving}>
              Créer le compte
            </Button>
          </>
        }
      >
        <form
          id="account-form"
          onSubmit={handleCreate}
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
          <Input
            label="Nom complet *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex. Sofiane Benali"
            autoFocus
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="employe@maboutique.fr"
          />
          <Input
            label="Mot de passe *"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="6 caractères minimum"
          />
          <p className="text-[12px] text-ink-faint">
            L'employé se connecte avec cet email et ce mot de passe. Il aura un
            accès limité (ventes, stock en lecture).
          </p>
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le compte"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Supprimer
            </Button>
          </>
        }
      >
        {deleteError && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {deleteError}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          Confirmer la suppression du compte de{" "}
          <span className="font-semibold text-ink">{deleteTarget?.name}</span> ?
          {deleteTarget &&
            deleteTarget._count.sales + deleteTarget._count.purchases > 0 && (
              <span className="mt-2 block text-[12px] text-ink-mute">
                Ce compte a un historique d'opérations : la suppression sera
                refusée. Préférez la désactivation.
              </span>
            )}
        </p>
      </Modal>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
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
