import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  getSales,
  getSale,
  cancelSale,
  type SaleSummary,
  type SaleDetail,
  type PaymentMethod,
  type SaleStatus,
} from '../../api/sales';
import { formatEuro, formatDateTime } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import { usePagination } from '../../hooks/usePagination';
import InvoiceActions from '../../components/InvoiceActions';

const searchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  card: 'Carte',
  cash: 'Espèces',
  transfer: 'Virement',
};

const STATUS_BADGE: Record<SaleStatus, { tone: 'success' | 'danger'; label: string }> = {
  completed: { tone: 'success', label: 'Validée' },
  cancelled: { tone: 'danger', label: 'Annulée' },
};

export default function SalesHistory() {
  const canCancel = useAuthStore((s) => s.user?.role === 'owner');

  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<'all' | SaleStatus>('all');
  const [search, setSearch] = useState('');

  // Détail (modale)
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setSales(await getSales({ from: from || undefined, to: to || undefined }));
    } finally {
      setLoading(false);
    }
  }

  // Recharge quand les bornes de date changent (le statut est filtré côté client).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter(
      (s) =>
        (status === 'all' || s.status === status) &&
        (!q || (s.clientName ?? '').toLowerCase().includes(q)),
    );
  }, [sales, status, search]);

  const { page, pageCount, pageItems, total, pageSize, setPage } = usePagination(
    filtered,
    10,
    `${status}|${search}|${from}|${to}`,
  );

  const stats = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'completed');
    const revenue = completed.reduce((sum, s) => sum + Number(s.finalAmount), 0);
    return {
      count: sales.length,
      completed: completed.length,
      cancelled: sales.length - completed.length,
      revenue,
    };
  }, [sales]);

  async function openDetail(id: string) {
    setCancelError('');
    setDetailLoading(true);
    try {
      setDetail(await getSale(id));
    } finally {
      setDetailLoading(false);
    }
  }

  async function confirmCancel() {
    if (!detail) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelSale(detail.id);
      setDetail(null);
      await load();
    } catch {
      setCancelError("Impossible d'annuler cette vente.");
    } finally {
      setCancelling(false);
    }
  }

  function resetFilters() {
    setFrom('');
    setTo('');
    setStatus('all');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cartes stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ventes" value={String(stats.count)} />
        <StatCard label="Validées" value={String(stats.completed)} />
        <StatCard label="Annulées" value={String(stats.cancelled)} tone={stats.cancelled ? 'danger' : undefined} />
        <StatCard label="Chiffre d'affaires" value={formatEuro(stats.revenue)} tone="accent" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3">
        <Input label="Recherche client" icon={searchIcon} placeholder="Nom du client…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input type="date" label="Du" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="Au" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value as 'all' | SaleStatus)}>
          <option value="all">Tous les statuts</option>
          <option value="completed">Validées</option>
          <option value="cancelled">Annulées</option>
        </Select>
        <div className="flex items-end">
          <Button variant="secondary" size="md" className="w-full" onClick={resetFilters}>
            Réinitialiser
          </Button>
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Historique des ventes" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3 text-right">Articles</th>
                  <th className="px-5 py-3">Paiement</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Vendeur</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => {
                  const badge = STATUS_BADGE[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas"
                      onClick={() => openDetail(s.id)}
                    >
                      <td className="px-5 py-3 font-mono text-[12.5px] text-ink-soft tabular-nums">
                        {formatDateTime(s.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-ink">{s.clientName || <span className="text-ink-faint">Client comptoir</span>}</td>
                      <td className="px-5 py-3 text-right font-mono text-ink-soft tabular-nums">{s._count?.items ?? '—'}</td>
                      <td className="px-5 py-3 text-ink-soft">{PAYMENT_LABEL[s.paymentMethod]}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${s.status === 'cancelled' ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {formatEuro(s.finalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-ink-mute">{s.soldBy?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-right text-ink-faint">
                        <ChevronIcon />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />

            {filtered.length === 0 && (
              <div className="px-5 py-16 text-center text-sm text-ink-mute">
                Aucune vente pour ces critères.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale détail */}
      <Modal
        open={Boolean(detail) || detailLoading}
        onClose={() => setDetail(null)}
        title="Détail de la vente"
        size="lg"
        footer={
          detail ? (
            <>
              {detail.invoice && <InvoiceActions invoiceId={detail.invoice.id} paid={detail.invoice.status === 'paid'} />}
              <div className="ml-auto flex items-center gap-3">
                {cancelError && <span className="text-[13px] text-danger">{cancelError}</span>}
                <Button variant="secondary" onClick={() => setDetail(null)} disabled={cancelling}>
                  Fermer
                </Button>
                {canCancel && detail.status === 'completed' && (
                  <Button variant="danger" onClick={confirmCancel} loading={cancelling}>
                    Annuler la vente
                  </Button>
                )}
              </div>
            </>
          ) : undefined
        }
      >
        {detailLoading || !detail ? (
          <div className="grid place-items-center py-12">
            <Spinner className="h-7 w-7 text-accent" />
          </div>
        ) : (
          <SaleDetailView detail={detail} />
        )}
      </Modal>
    </div>
  );
}

/* ---------- vue détail ---------- */

function SaleDetailView({ detail }: { detail: SaleDetail }) {
  const badge = STATUS_BADGE[detail.status];
  const globalDiscount = Number(detail.discount);

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[13px] text-ink-mute tabular-nums">{formatDateTime(detail.createdAt)}</div>
          <div className="mt-1 text-base font-semibold text-ink">
            {detail.clientName || 'Client comptoir'}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-mute">
            {PAYMENT_LABEL[detail.paymentMethod]} · Vendu par {detail.soldBy?.name ?? '—'}
          </div>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      {/* Lignes */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table aria-label="Articles de la vente" className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2.5">Article</th>
              <th className="px-4 py-2.5 text-right">P.U.</th>
              <th className="px-4 py-2.5 text-right">Qté</th>
              <th className="px-4 py-2.5 text-right">Remise</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((it) => {
              const unit = Number(it.unitPrice);
              const disc = Number(it.discount);
              const lineTotal = unit * it.quantity * (1 - disc / 100);
              return (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{it.product?.name ?? 'Produit supprimé'}</div>
                    {it.product?.sku && <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{it.product.sku}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-soft tabular-nums">{formatEuro(it.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-soft tabular-nums">{it.quantity}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-soft tabular-nums">{disc ? `${disc}%` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink tabular-nums">{formatEuro(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Récapitulatif */}
      <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between text-ink-mute">
          <span>Sous-total</span>
          <span className="font-mono tabular-nums">{formatEuro(detail.totalAmount)}</span>
        </div>
        {globalDiscount > 0 && (
          <div className="flex justify-between text-ink-mute">
            <span>Remise globale ({globalDiscount}%)</span>
            <span className="font-mono tabular-nums">
              −{formatEuro(Number(detail.totalAmount) - Number(detail.finalAmount))}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-ink">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatEuro(detail.finalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- petits composants ---------- */

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'danger';
}) {
  const valueColor = tone === 'accent' ? 'text-accent-deep' : tone === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-[12px] font-medium text-ink-mute">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}

const ChevronIcon = () => (
  <svg className="ml-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
