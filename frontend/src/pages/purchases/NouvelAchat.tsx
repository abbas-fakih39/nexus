import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProducts, type Product } from '../../api/products';
import { getCategories, type Category } from '../../api/categories';
import { getSuppliers, type Supplier } from '../../api/suppliers';
import { createPurchase, type CreatePurchaseInput } from '../../api/purchases';
import { formatEuro } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

interface CartLine {
  product: Product;
  quantity: number;
  unitCost: number; // coût d'achat unitaire (€)
}

function initials(name: string): string {
  return name.replace(/[^a-zA-ZÀ-ÿ ]/g, '').trim().slice(0, 2).toUpperCase();
}
function lineTotal(l: CartLine): number {
  return l.unitCost * l.quantity;
}

export default function NouvelAchat() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ total: number; items: number } | null>(null);

  function loadProducts() {
    return getProducts().then(setProducts);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, categoryId]);

  const total = useMemo(() => cart.reduce((s, l) => s + lineTotal(l), 0), [cart]);

  function addToCart(p: Product) {
    setCart((c) => {
      const existing = c.find((l) => l.product.id === p.id);
      if (existing) {
        return c.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...c, { product: p, quantity: 1, unitCost: Number(p.costPrice) || 0 }];
    });
  }
  const inCart = (id: string) => cart.some((l) => l.product.id === id);

  function setQty(id: string, qty: number) {
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, qty) } : l)));
  }
  function setUnitCost(id: string, cost: number) {
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, unitCost: Math.max(0, cost) } : l)));
  }
  function removeLine(id: string) {
    setCart((c) => c.filter((l) => l.product.id !== id));
  }

  const canValidate = cart.length > 0 && Boolean(supplierId) && !submitting;

  async function validate() {
    setError(null);
    setSubmitting(true);
    const payload: CreatePurchaseInput = {
      supplierId,
      notes: notes.trim() || undefined,
      items: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitCost: l.unitCost,
      })),
    };
    try {
      await createPurchase(payload);
      setSuccess({ total, items: cart.length });
      setCart([]);
      setSupplierId('');
      setNotes('');
      await loadProducts(); // stock + costPrice à jour
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : (m ?? "Échec de l'enregistrement."));
    } finally {
      setSubmitting(false);
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
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,400px)]">
      {/* ---------- Sélection produits ---------- */}
      <section className="flex flex-col gap-4">
        <Input
          icon={<SearchIcon />}
          placeholder="Rechercher un produit ou un SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <Pill active={categoryId === ''} onClick={() => setCategoryId('')}>Tous</Pill>
          {categories.map((c) => (
            <Pill key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </Pill>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.stock <= p.alertThreshold;
            return (
              <div key={p.id} className="flex flex-col rounded-xl border border-border bg-surface p-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-softer text-[13px] font-bold text-accent-deep">
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{p.name}</div>
                    <div className="truncate font-mono text-[11px] text-ink-faint">{p.sku ?? '—'}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`text-[11.5px] font-semibold ${out ? 'text-danger' : low ? 'text-warn' : 'text-ink-mute'}`}>
                    {out ? 'Rupture — à réapprovisionner' : low ? `${p.stock} en stock (faible)` : `${p.stock} en stock`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[12.5px] tabular-nums text-ink-mute">
                    Coût {formatEuro(p.costPrice)}
                  </span>
                  <Button size="sm" variant={inCart(p.id) ? 'secondary' : 'primary'} onClick={() => addToCart(p)}>
                    {inCart(p.id) ? 'Ajouté' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-ink-mute">Aucun produit.</div>
          )}
        </div>
      </section>

      {/* ---------- Bon de commande ---------- */}
      <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-[88px]">
        <div className="text-lg font-bold tracking-tight text-ink">Bon de commande</div>

        <Select
          label="Fournisseur"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">Sélectionner un fournisseur…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>

        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</div>
        )}

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-mute">
            Aucune ligne — ajoutez des produits à commander.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{l.product.name}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Stepper value={l.quantity} onChange={(v) => setQty(l.product.id, v)} />
                    <span className="text-[12px] text-ink-faint">{l.product.unit}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-faint">Coût unit.</span>
                    <input
                      type="number" min={0} step="0.01" value={l.unitCost || ''}
                      onChange={(e) => setUnitCost(l.product.id, Number(e.target.value))}
                      placeholder="0.00"
                      className="h-7 w-20 rounded-md border border-border bg-canvas px-2 text-right text-[12px] tabular-nums text-ink outline-none focus:border-accent"
                    />
                    <span className="text-[11px] text-ink-faint">€</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold tabular-nums text-ink">{formatEuro(lineTotal(l))}</span>
                  <button type="button" onClick={() => removeLine(l.product.id)} aria-label="Retirer" className="text-ink-faint transition hover:text-danger">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Input
          label="Notes (optionnel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="N° de commande, remarques…"
        />

        {/* Total */}
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-semibold text-ink">Total HT</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-ink">{formatEuro(total)}</span>
        </div>

        <Button onClick={validate} loading={submitting} disabled={!canValidate} className="w-full">
          Enregistrer l'achat · {formatEuro(total)}
        </Button>
        {!supplierId && cart.length > 0 && (
          <p className="-mt-1 text-center text-[12px] text-ink-faint">Sélectionnez un fournisseur pour valider.</p>
        )}
      </aside>

      {/* Confirmation */}
      <Modal
        open={Boolean(success)}
        onClose={() => setSuccess(null)}
        title="Achat enregistré ✅"
        footer={<Button onClick={() => setSuccess(null)}>Nouvel achat</Button>}
      >
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-ink-soft">
            Le stock a été mis à jour et le coût d'achat des produits enregistré.
          </p>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-ink-mute">Montant ({success?.items} ligne{(success?.items ?? 0) > 1 ? 's' : ''})</span>
            <span className="font-mono font-bold tabular-nums text-ink">{formatEuro(success?.total ?? 0)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- composants locaux ---------- */

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
        active ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-ink-mute hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border">
      <button type="button" aria-label="Diminuer" onClick={() => onChange(value - 1)} className="grid h-7 w-7 place-items-center text-ink-mute transition hover:text-ink disabled:opacity-40" disabled={value <= 1}>
        <MinusIcon />
      </button>
      <span className="w-7 text-center font-mono text-[13px] font-semibold tabular-nums text-ink">{value}</span>
      <button type="button" aria-label="Augmenter" onClick={() => onChange(value + 1)} className="grid h-7 w-7 place-items-center text-ink-mute transition hover:text-ink">
        <PlusIcon />
      </button>
    </div>
  );
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function PlusIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function MinusIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function TrashIcon() {
  return <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}
