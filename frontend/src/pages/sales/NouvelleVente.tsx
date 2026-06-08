import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProducts, type Product } from '../../api/products';
import { getCategories, type Category } from '../../api/categories';
import { createSale, type CreateSaleInput, type PaymentMethod } from '../../api/sales';
import { formatEuro } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import InvoiceActions from '../../components/InvoiceActions';

interface CartLine {
  product: Product;
  quantity: number;
  discount: number; // %
}

function initials(name: string): string {
  return name.replace(/[^a-zA-ZÀ-ÿ ]/g, '').trim().slice(0, 2).toUpperCase();
}
function lineTotal(l: CartLine): number {
  return Number(l.product.price) * l.quantity * (1 - l.discount / 100);
}

const PAYMENTS: { value: PaymentMethod; label: string; icon: ReactNode }[] = [
  { value: 'card', label: 'Carte', icon: <CardIcon /> },
  { value: 'cash', label: 'Espèces', icon: <CashIcon /> },
  { value: 'transfer', label: 'Virement', icon: <TransferIcon /> },
];

export default function NouvelleVente() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientName, setClientName] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [received, setReceived] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ total: number; change: number | null; invoiceId: string | null } | null>(null);

  function loadProducts() {
    return getProducts().then(setProducts);
  }

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
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

  const subtotal = useMemo(() => cart.reduce((s, l) => s + lineTotal(l), 0), [cart]);
  const final = subtotal * (1 - globalDiscount / 100);
  const receivedNum = Number(received);
  const change = payment === 'cash' && received !== '' ? receivedNum - final : null;

  function addToCart(p: Product) {
    if (p.stock <= 0) return;
    setCart((c) => {
      const existing = c.find((l) => l.product.id === p.id);
      if (existing) {
        return c.map((l) =>
          l.product.id === p.id ? { ...l, quantity: Math.min(l.quantity + 1, p.stock) } : l,
        );
      }
      return [...c, { product: p, quantity: 1, discount: 0 }];
    });
  }
  const inCart = (id: string) => cart.some((l) => l.product.id === id);

  function setQty(id: string, qty: number) {
    setCart((c) =>
      c.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(1, Math.min(qty, l.product.stock)) } : l)),
    );
  }
  function setLineDiscount(id: string, d: number) {
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, discount: Math.max(0, Math.min(d, 100)) } : l)));
  }
  function removeLine(id: string) {
    setCart((c) => c.filter((l) => l.product.id !== id));
  }

  const canValidate =
    cart.length > 0 && !submitting && (payment !== 'cash' || (received !== '' && receivedNum >= final));

  async function validate() {
    setError(null);
    setSubmitting(true);
    const payload: CreateSaleInput = {
      clientName: clientName.trim() || undefined,
      discount: globalDiscount || undefined,
      paymentMethod: payment,
      items: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        discount: l.discount || undefined,
      })),
    };
    try {
      const created = await createSale(payload);
      setSuccess({ total: final, change, invoiceId: created.invoice?.id ?? null });
      // reset
      setCart([]);
      setClientName('');
      setGlobalDiscount(0);
      setReceived('');
      setPayment('card');
      await loadProducts(); // stock à jour
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Échec de la vente.'));
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
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(340px,380px)]">
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
                    {out ? 'Rupture' : `${p.stock} en stock`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold tabular-nums text-ink">{formatEuro(p.price)}</span>
                  <Button size="sm" variant={inCart(p.id) ? 'secondary' : 'primary'} disabled={out} onClick={() => addToCart(p)}>
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

      {/* ---------- Panier ---------- */}
      <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-[88px]">
        <div className="text-lg font-bold tracking-tight text-ink">Récapitulatif</div>

        <Input placeholder="Nom du client (optionnel)" value={clientName} onChange={(e) => setClientName(e.target.value)} />

        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{error}</div>
        )}

        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-mute">
            Panier vide — ajoutez des produits.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{l.product.name}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Stepper value={l.quantity} onChange={(v) => setQty(l.product.id, v)} max={l.product.stock} />
                    <span className="font-mono text-[12px] text-ink-mute">× {formatEuro(l.product.price)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-faint">Remise</span>
                    <input
                      type="number" min={0} max={100} value={l.discount || ''}
                      onChange={(e) => setLineDiscount(l.product.id, Number(e.target.value))}
                      placeholder="0"
                      className="h-7 w-14 rounded-md border border-border bg-canvas px-2 text-[12px] tabular-nums text-ink outline-none focus:border-accent"
                    />
                    <span className="text-[11px] text-ink-faint">%</span>
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

        {/* Résumé */}
        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-ink-mute">
            <span>Sous-total ({cart.length} article{cart.length > 1 ? 's' : ''})</span>
            <span className="font-mono tabular-nums">{formatEuro(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-ink-mute">
            <span>Remise globale</span>
            <div className="flex items-center gap-1">
              <input
                type="number" min={0} max={100} value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(Math.max(0, Math.min(Number(e.target.value), 100)))}
                placeholder="0"
                className="h-7 w-14 rounded-md border border-border bg-canvas px-2 text-right text-[12px] tabular-nums text-ink outline-none focus:border-accent"
              />
              <span className="text-[11px] text-ink-faint">%</span>
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-semibold text-ink">Total à payer</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">{formatEuro(final)}</span>
          </div>
        </div>

        {/* Paiement */}
        <div>
          <div className="mb-2 text-[12px] font-semibold text-ink-soft">Mode de paiement</div>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENTS.map((m) => (
              <button
                key={m.value} type="button" onClick={() => setPayment(m.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[12px] font-semibold transition ${
                  payment === m.value ? 'border-accent bg-accent-softer text-accent-deep' : 'border-border text-ink-mute hover:bg-canvas'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Espèces : monnaie à rendre */}
        {payment === 'cash' && (
          <div className="flex flex-col gap-2 rounded-xl bg-canvas p-3">
            <Input label="Montant reçu (€)" type="number" min="0" step="0.01" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={final.toFixed(2)} />
            {change !== null && (
              <div className={`flex justify-between text-sm font-semibold ${change < 0 ? 'text-danger' : 'text-accent-deep'}`}>
                <span>{change < 0 ? 'Manque' : 'À rendre'}</span>
                <span className="font-mono tabular-nums">{formatEuro(Math.abs(change))}</span>
              </div>
            )}
          </div>
        )}

        <Button onClick={validate} loading={submitting} disabled={!canValidate} className="w-full">
          Valider la vente · {formatEuro(final)}
        </Button>
      </aside>

      {/* Confirmation */}
      <Modal
        open={Boolean(success)}
        onClose={() => setSuccess(null)}
        title="Vente validée ✅"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {success?.invoiceId ? <InvoiceActions invoiceId={success.invoiceId} paid /> : <span />}
            <Button onClick={() => setSuccess(null)}>Nouvelle vente</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-mute">Total encaissé</span>
            <span className="font-mono font-bold tabular-nums text-ink">{formatEuro(success?.total ?? 0)}</span>
          </div>
          {success?.change != null && (
            <div className="flex justify-between">
              <span className="text-ink-mute">Monnaie rendue</span>
              <span className="font-mono font-bold tabular-nums text-accent-deep">{formatEuro(success.change)}</span>
            </div>
          )}
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

function Stepper({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border">
      <button type="button" aria-label="Diminuer" onClick={() => onChange(value - 1)} className="grid h-7 w-7 place-items-center text-ink-mute transition hover:text-ink disabled:opacity-40" disabled={value <= 1}>
        <MinusIcon />
      </button>
      <span className="w-7 text-center font-mono text-[13px] font-semibold tabular-nums text-ink">{value}</span>
      <button type="button" aria-label="Augmenter" onClick={() => onChange(value + 1)} className="grid h-7 w-7 place-items-center text-ink-mute transition hover:text-ink disabled:opacity-40" disabled={value >= max}>
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
function CardIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
}
function CashIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>;
}
function TransferIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
}
