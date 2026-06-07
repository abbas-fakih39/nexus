import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '../../api/categories';
import { getProducts, type Product } from '../../api/products';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

function apiError(err: unknown, fallback: string): string {
  const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m ?? fallback);
}

export default function CategoriesPage() {
  const canManage = useAuthStore((s) => s.user?.role === 'owner');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function reload() {
    const [c, p] = await Promise.all([getCategories(), getProducts()]);
    setCategories(c);
    setProducts(p);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) map[p.categoryId] = (map[p.categoryId] ?? 0) + 1;
    return map;
  }, [products]);

  function openAdd() {
    setEditing(null);
    setName('');
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) return setFormError('Le nom est obligatoire.');
    setSaving(true);
    try {
      if (editing) await updateCategory(editing.id, { name: name.trim() });
      else await createCategory({ name: name.trim() });
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
      await deleteCategory(deleteTarget.id);
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
          <Button onClick={openAdd} icon={<PlusIcon />}>Ajouter une catégorie</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3">Catégorie</th>
              <th className="px-5 py-3 text-right">Produits</th>
              {canManage && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-canvas">
                <td className="px-5 py-3 font-semibold text-ink">{c.name}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-mute">
                  {countByCategory[c.id] ?? 0}
                </td>
                {canManage && (
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Modifier" onClick={() => openEdit(c)}><PencilIcon /></IconButton>
                      <IconButton label="Supprimer" danger onClick={() => { setDeleteError(null); setDeleteTarget(c); }}><TrashIcon /></IconButton>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink-mute">Aucune catégorie.</div>
        )}
      </div>

      {/* Ajout / édition */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" form="category-form" loading={saving}>{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{formError}</div>
          )}
          <Input label="Nom de la catégorie *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Chaussures" autoFocus />
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer la catégorie"
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
