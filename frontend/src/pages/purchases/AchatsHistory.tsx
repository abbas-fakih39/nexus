import { useEffect, useMemo, useState } from 'react';
import {
  getPurchases,
  getPurchase,
  cancelPurchase,
  type PurchaseSummary,
  type PurchaseDetail,
  type PurchaseStatus,
} from '../../api/purchases';
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

const STATUS_BADGE: Record<PurchaseStatus, { tone: 'success' | 'danger'; label: string }> = {
  received: { tone: 'success', label: 'Reçu' },
  cancelled: { tone: 'danger', label: 'Annulé' },
};

export default function AchatsHistory() {
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<'all' | PurchaseStatus>('all');
  const [search, setSearch] = useState('');

  // Détail (modale)
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setPurchases(await getPurchases({ from: from || undefined, to: to || undefined }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!q || (p.supplier?.name ?? '').toLowerCase().includes(q)),
    );
  }, [purchases, status, search]);

  const { page, pageCount, pageItems, total, pageSize, setPage } = usePagination(
    filtered,
    10,
    `${status}|${search}|${from}|${to}`,
  );

  const stats = useMemo(() => {
    const received = purchases.filter((p) => p.status === 'received');
    const spent = received.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    return {
      count: purchases.length,
      received: received.length,
      cancelled: purchases.length - received.length,
      spent,
    };
  }, [purchases]);

  async function openDetail(id: string) {
    setCancelError('');
    setDetailLoading(true);
    try {
      setDetail(await getPurchase(id));
    } finally {
      setDetailLoading(false);
    }
  }

  async function confirmCancel() {
    if (!detail) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelPurchase(detail.id);
      setDetail(null);
      await load();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setCancelError(Array.isArray(m) ? m.join(', ') : (m ?? "Impossible d'annuler cet achat."));
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
        <StatCard label="Achats" value={String(stats.count)} />
        <StatCard label="Reçus" value={String(stats.received)} />
        <StatCard label="Annulés" value={String(stats.cancelled)} tone={stats.cancelled ? 'danger' : undefined} />
        <StatCard label="Total dépensé" value={formatEuro(stats.spent)} tone="accent" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3">
        <Input label="Recherche fournisseur" icon={searchIcon} placeholder="Nom du fournisseur…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input type="date" label="Du" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="Au" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value as 'all' | PurchaseStatus)}>
          <option value="all">Tous les statuts</option>
          <option value="received">Reçus</option>
          <option value="cancelled">Annulés</option>
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
            <table aria-label="Historique des achats" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3 text-right">Articles</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Créé par</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const badge = STATUS_BADGE[p.status];
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas"
                      onClick={() => openDetail(p.id)}
                    >
                      <td className="px-5 py-3 font-mono text-[12.5px] text-ink-soft tabular-nums">
                        {formatDateTime(p.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-ink">{p.supplier?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-right font-mono text-ink-soft tabular-nums">{p._count?.items ?? '—'}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${p.status === 'cancelled' ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {formatEuro(p.totalAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-ink-mute">{p.createdBy?.name ?? '—'}</td>
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
                Aucun achat pour ces critères.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale détail */}
      <Modal
        open={Boolean(detail) || detailLoading}
        onClose={() => setDetail(null)}
        title="Détail de l'achat"
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
                {detail.status === 'received' && (
                  <Button variant="danger" onClick={confirmCancel} loading={cancelling}>
                    Annuler l'achat
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
          <PurchaseDetailView detail={detail} />
        )}
      </Modal>
    </div>
  );
}

/* ---------- vue détail ---------- */

function PurchaseDetailView({ detail }: { detail: PurchaseDetail }) {
  const badge = STATUS_BADGE[detail.status];

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[13px] text-ink-mute tabular-nums">{formatDateTime(detail.createdAt)}</div>
          <div className="mt-1 text-base font-semibold text-ink">{detail.supplier?.name ?? '—'}</div>
          <div className="mt-0.5 text-[13px] text-ink-mute">Créé par {detail.createdBy?.name ?? '—'}</div>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      {detail.notes && (
        <div className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-ink-soft">
          <span className="font-semibold text-ink-mute">Notes : </span>{detail.notes}
        </div>
      )}

      {/* Lignes */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table aria-label="Articles de l'achat" className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2.5">Article</th>
              <th className="px-4 py-2.5 text-right">Coût unit.</th>
              <th className="px-4 py-2.5 text-right">Qté</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((it) => {
              const unit = Number(it.unitCost);
              const lineTotal = unit * it.quantity;
              return (
                <tr key={it.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{it.product?.name ?? 'Produit supprimé'}</div>
                    {it.product?.sku && <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{it.product.sku}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-soft tabular-nums">{formatEuro(it.unitCost)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-soft tabular-nums">
                    {it.quantity} <span className="text-[11px] text-ink-faint">{it.product?.unit}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink tabular-nums">{formatEuro(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="ml-auto w-full max-w-xs">
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-ink">
          <span>Total HT</span>
          <span className="font-mono tabular-nums">{formatEuro(detail.totalAmount)}</span>
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
