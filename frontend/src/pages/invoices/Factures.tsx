import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  getInvoices,
  updateInvoiceStatus,
  type InvoiceSummary,
  type InvoiceType,
  type InvoiceStatus,
} from '../../api/invoices';
import { formatEuro, formatDateTime } from '../../utils/format';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import InvoiceActions from '../../components/InvoiceActions';

const STATUS_BADGE: Record<InvoiceStatus, { tone: 'success' | 'warn' | 'danger'; label: string }> = {
  paid: { tone: 'success', label: 'Payée' },
  pending: { tone: 'warn', label: 'En attente' },
  cancelled: { tone: 'danger', label: 'Annulée' },
};

function amountOf(inv: InvoiceSummary): string {
  return inv.type === 'sale' ? (inv.sale?.finalAmount ?? '0') : (inv.purchase?.totalAmount ?? '0');
}
function partyOf(inv: InvoiceSummary): string {
  if (inv.type === 'sale') return inv.sale?.clientName || 'Client comptoir';
  return inv.purchase?.supplier?.name ?? '—';
}

export default function Factures() {
  const isOwner = useAuthStore((s) => s.user?.role === 'owner');

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'all' | InvoiceType>('all');
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setInvoices(await getInvoices());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) => (type === 'all' || i.type === type) && (status === 'all' || i.status === status),
      ),
    [invoices, type, status],
  );

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const pending = invoices.filter((i) => i.status === 'pending').length;
    const cancelled = invoices.filter((i) => i.status === 'cancelled').length;
    return { total: invoices.length, paid, pending, cancelled };
  }, [invoices]);

  async function changeStatus(inv: InvoiceSummary, next: InvoiceStatus) {
    setBusyId(inv.id);
    try {
      const updated = await updateInvoiceStatus(inv.id, next);
      setInvoices((list) => list.map((i) => (i.id === inv.id ? { ...i, status: updated.status } : i)));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Factures</h2>
        <p className="mt-1 text-sm text-ink-mute">Ventes et achats — téléchargez les PDF, suivez les règlements.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Factures" value={String(stats.total)} />
        <StatCard label="Payées" value={String(stats.paid)} tone="accent" />
        <StatCard label="En attente" value={String(stats.pending)} tone={stats.pending ? 'warn' : undefined} />
        <StatCard label="Annulées" value={String(stats.cancelled)} tone={stats.cancelled ? 'danger' : undefined} />
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as 'all' | InvoiceType)}>
          <option value="all">Tous les types</option>
          <option value="sale">Ventes</option>
          <option value="purchase">Achats</option>
        </Select>
        <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value as 'all' | InvoiceStatus)}>
          <option value="all">Tous les statuts</option>
          <option value="paid">Payées</option>
          <option value="pending">En attente</option>
          <option value="cancelled">Annulées</option>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner className="h-8 w-8 text-accent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-3">Numéro</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Tiers</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const badge = STATUS_BADGE[inv.status];
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-canvas">
                      <td className="px-5 py-3 font-mono text-[12.5px] font-semibold text-ink tabular-nums">{inv.number}</td>
                      <td className="px-5 py-3 font-mono text-[12.5px] text-ink-soft tabular-nums">{formatDateTime(inv.createdAt)}</td>
                      <td className="px-5 py-3">
                        <TypeChip type={inv.type} />
                      </td>
                      <td className="px-5 py-3 text-ink">{partyOf(inv)}</td>
                      <td className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${inv.status === 'cancelled' ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {formatEuro(amountOf(inv))}
                      </td>
                      <td className="px-5 py-3">
                        {isOwner && inv.status !== 'cancelled' ? (
                          <select
                            value={inv.status}
                            disabled={busyId === inv.id}
                            onChange={(e) => changeStatus(inv, e.target.value as InvoiceStatus)}
                            className="rounded-lg border border-border bg-canvas px-2 py-1 text-[12.5px] font-semibold text-ink outline-none transition hover:border-border-strong focus:border-accent disabled:opacity-50"
                          >
                            <option value="paid">Payée</option>
                            <option value="pending">En attente</option>
                          </select>
                        ) : (
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <InvoiceActions invoiceId={inv.id} paid={inv.status === 'paid'} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="px-5 py-16 text-center text-sm text-ink-mute">Aucune facture pour ces critères.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- composants locaux ---------- */

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'warn' | 'danger' }) {
  const color = tone === 'accent' ? 'text-accent-deep' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-[12px] font-medium text-ink-mute">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function TypeChip({ type }: { type: InvoiceType }) {
  const isSale = type === 'sale';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        isSale ? 'bg-accent-softer text-accent-deep' : 'bg-canvas text-ink-mute'
      }`}
    >
      {isSale ? 'Vente' : 'Achat'}
    </span>
  );
}
