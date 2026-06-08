import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getProducts, deleteProduct, type Product } from '../../api/products';
import { getCategories, type Category } from '../../api/categories';
import { getSuppliers, type Supplier } from '../../api/suppliers';
import { formatEuro } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import ProductFormModal from './ProductFormModal';

type Status = 'ok' | 'faible' | 'rupture';

function statusOf(p: Product): Status {
  if (p.stock <= 0) return 'rupture';
  if (p.stock <= p.alertThreshold) return 'faible';
  return 'ok';
}

const STATUS_BADGE: Record<Status, { tone: 'success' | 'warn' | 'danger'; label: string }> = {
  ok: { tone: 'success', label: 'En stock' },
  faible: { tone: 'warn', label: 'Stock faible' },
  rupture: { tone: 'danger', label: 'Rupture' },
};

const searchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function Stock() {
  const canManage = useAuthStore((s) => s.user?.role === 'owner');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProducts() {
    setProducts(await getProducts());
  }

  useEffect(() => {
    Promise.all([getProducts(), getCategories(), getSuppliers()])
      .then(([p, c, s]) => {
        setProducts(p);
        setCategories(c);
        setSuppliers(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const value = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
    return {
      total: products.length,
      value,
      low: products.filter((p) => statusOf(p) === 'faible').length,
      rupture: products.filter((p) => statusOf(p) === 'rupture').length,
    };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (supplierId && p.supplierId !== supplierId) return false;
      if (status !== 'all' && statusOf(p) !== status) return false;
      return true;
    });
  }, [products, search, categoryId, supplierId, status]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await loadProducts();
    } catch {
      // l'erreur (ex. produit déjà vendu) reste affichée par le backend ; on garde la modale ouverte
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barre d'action */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={openAdd} icon={<PlusIcon />}>
            Ajouter un produit
          </Button>
        </div>
      )}

      {/* Cartes stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total références" value={String(stats.total)} />
        <StatCard label="Valeur du stock" value={formatEuro(stats.value)} />
        <StatCard label="Stock faible" value={String(stats.low)} tone="warn" />
        <StatCard label="En rupture" value={String(stats.rupture)} tone="danger" />
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input icon={searchIcon} placeholder="Rechercher un produit, SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Tous les fournisseurs</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | Status)}>
          <option value="all">Tous les statuts</option>
          <option value="ok">En stock</option>
          <option value="faible">Stock faible</option>
          <option value="rupture">Rupture</option>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table aria-label="Produits en stock" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Produit</th>
                <th className="px-5 py-3">Catégorie</th>
                <th className="px-5 py-3">Fournisseur</th>
                <th className="px-5 py-3 text-right">Prix</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3 text-right">Seuil</th>
                <th className="px-5 py-3">Statut</th>
                {canManage && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = statusOf(p);
                const badge = STATUS_BADGE[st];
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{p.name}</div>
                      {p.sku && <div className="mt-0.5 font-mono text-[11.5px] text-ink-faint">{p.sku}</div>}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{p.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-soft">{p.supplier?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-ink tabular-nums">{formatEuro(p.price)}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${st === 'rupture' ? 'text-danger' : st === 'faible' ? 'text-warn' : 'text-ink'}`}>
                      {p.stock} <span className="font-sans text-[11px] font-normal text-ink-faint">{p.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-ink-mute tabular-nums">{p.alertThreshold}</td>
                    <td className="px-5 py-3">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton label="Modifier" onClick={() => openEdit(p)}>
                            <PencilIcon />
                          </IconButton>
                          <IconButton label="Supprimer" danger onClick={() => setDeleteTarget(p)}>
                            <TrashIcon />
                          </IconButton>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-ink-mute">
            Aucun produit ne correspond à ces filtres.
          </div>
        )}
      </div>

      {/* Modale ajout / édition */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadProducts}
        product={editing}
        categories={categories}
        suppliers={suppliers}
      />

      {/* Confirmation de suppression */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer le produit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Confirmer la suppression de <span className="font-semibold text-ink">{deleteTarget?.name}</span> ?
          Cette action est définitive.
        </p>
      </Modal>
    </div>
  );
}

/* ---------- petits composants locaux ---------- */

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'warn' | 'danger' }) {
  const valueColor = tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-[12px] font-medium text-ink-mute">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
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
      className={`grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-canvas ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
    >
      {children}
    </button>
  );
}

const PlusIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const PencilIcon = () => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
