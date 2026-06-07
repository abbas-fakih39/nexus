import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
  type SupplierInput,
} from '../../api/suppliers';
import { getProducts, type Product } from '../../api/products';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m ?? fallback);
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY: FormState = { name: '', email: '', phone: '', address: '' };

function toForm(s: Supplier | null): FormState {
  return {
    name: s?.name ?? '',
    email: s?.email ?? '',
    phone: s?.phone ?? '',
    address: s?.address ?? '',
  };
}

export default function SuppliersPage() {
  const canManage = useAuthStore((s) => s.user?.role === 'owner');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function reload() {
    const [s, p] = await Promise.all([getSuppliers(), getProducts()]);
    setSuppliers(s);
    setProducts(p);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const countBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) if (p.supplierId) map[p.supplierId] = (map[p.supplierId] ?? 0) + 1;
    return map;
  }, [products]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm(toForm(s));
    setFormError(null);
    setFormOpen(true);
  }

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return setFormError('Le nom est obligatoire.');

    const payload: SupplierInput = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    setSaving(true);
    try {
      if (editing) await updateSupplier(editing.id, payload);
      else await createSupplier(payload);
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
      await deleteSupplier(deleteTarget.id);
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
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openAdd} icon={<PlusIcon />}>Ajouter un fournisseur</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Fournisseur</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Téléphone</th>
                <th className="px-5 py-3 text-right">Produits</th>
                {canManage && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3 font-semibold text-ink">{s.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.email ?? '—'}</td>
                  <td className="px-5 py-3 font-mono tabular-nums text-ink-soft">{s.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-mute">{countBySupplier[s.id] ?? 0}</td>
                  {canManage && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Modifier" onClick={() => openEdit(s)}><PencilIcon /></IconButton>
                        <IconButton label="Supprimer" danger onClick={() => { setDeleteError(null); setDeleteTarget(s); }}><TrashIcon /></IconButton>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {suppliers.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">Aucun fournisseur.</div>
        )}
      </div>

      {/* Ajout / édition */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="supplier-form" loading={saving}>{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <Input label="Nom *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Nike France" autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="pro@nike.fr" />
            <Input label="Téléphone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+33 1 40 00 10 10" />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rue, code postal, ville" />
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le fournisseur"
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
          Confirmer la suppression de <span className="font-semibold text-ink">{deleteTarget?.name}</span> ?
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
