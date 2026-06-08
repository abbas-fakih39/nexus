import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  getStats,
  getRevenueSeries,
  getTopProducts,
  getCategoryBreakdown,
  getDormantProducts,
  getLowStock,
  getRecentSales,
  type Period,
  type DashboardStats,
  type RevenuePoint,
  type TopProduct,
  type CategorySlice,
  type DormantProduct,
  type LowStockProduct,
  type RecentSale,
} from '../../api/dashboard';
import { formatEuro, formatDateTime } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: 'year', label: 'Cette année' },
];
const DAYS_FOR: Record<Period, number> = { today: 7, '7d': 7, '30d': 30, year: 90 };

const ACCENT = '#059669';
const AMBER = '#d97706';
// Palette catégorielle à teintes distinctes (sans bleu) pour différencier les parts.
const CAT_COLORS = ['#059669', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#ef4444'];

const PAYMENT_LABEL: Record<string, string> = { card: 'Carte', cash: 'Espèces', transfer: 'Virement' };

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (cur: number, prev: number): number | null => (prev > 0 ? round1(((cur - prev) / prev) * 100) : null);

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [cats, setCats] = useState<CategorySlice[]>([]);
  const [dormant, setDormant] = useState<DormantProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recent, setRecent] = useState<RecentSale[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStats(period),
      getRevenueSeries(DAYS_FOR[period]),
      getTopProducts(period),
      getCategoryBreakdown(period),
      getDormantProducts(period),
      getLowStock(),
      getRecentSales(),
    ])
      .then(([s, rev, tp, cb, dp, ls, rs]) => {
        setStats(s);
        setSeries(rev);
        setTop(tp);
        setCats(cb);
        setDormant(dp);
        setLowStock(ls);
        setRecent(rs);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const flowData = useMemo(
    () => [
      { name: 'Ventes', value: stats?.revenue ?? 0, fill: ACCENT },
      { name: 'Achats', value: stats?.purchasesTotal ?? 0, fill: AMBER },
    ],
    [stats],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête + période */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Tableau de bord</h2>
          <p className="mt-1 text-sm text-ink-mute">Vue d'ensemble de l'activité.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                period === p.value ? 'bg-accent text-white shadow-sm' : 'text-ink-mute hover:bg-canvas'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <div className="grid min-h-[60vh] place-items-center">
          <Spinner className="h-8 w-8 text-accent" />
        </div>
      ) : (
        <>
          {/* KPI avec tendance vs période précédente */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Chiffre d'affaires" value={formatEuro(stats.revenue)} accent trend={pct(stats.revenue, stats.prev.revenue)} />
            <Kpi label="Marge" value={formatEuro(stats.margin)} hint={`${stats.marginRate}% du CA`} trend={pct(stats.margin, stats.prev.margin)} />
            <Kpi label="Ventes" value={String(stats.salesCount)} hint={`Panier moy. ${formatEuro(stats.avgBasket)}`} trend={pct(stats.salesCount, stats.prev.salesCount)} />
            <Kpi label="Valeur du stock" value={formatEuro(stats.stockValue)} hint={`${stats.lowStockCount} alerte(s)`} hintWarn={stats.lowStockCount > 0} />
          </div>

          {/* Ligne 1 : CA dans le temps (2/3) + Alertes stock (1/3, prioritaire) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Chiffre d'affaires" subtitle={`${DAYS_FOR[period]} derniers jours`} className="lg:col-span-2">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dayMonth} tick={{ fontSize: 11, fill: '#6B7B73' }} minTickGap={24} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7B73' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} fill="url(#caFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Panel title="Alertes stock" badge={lowStock.length} tone="warn">
              {lowStock.length === 0 ? (
                <Empty text="Aucun produit sous le seuil. 👍" />
              ) : (
                <ul className="divide-y divide-border">
                  {lowStock.slice(0, 6).map((p) => {
                    const out = p.stock <= 0;
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-semibold text-ink">{p.name}</div>
                          <div className="truncate text-[11.5px] text-ink-faint">{p.category?.name ?? '—'} · seuil {p.alertThreshold}</div>
                        </div>
                        <Badge tone={out ? 'danger' : 'warn'}>{out ? 'Rupture' : `${p.stock} ${p.unit}`}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          {/* Ligne 2 : Top produits (2/3) + Répartition catégorie (1/3) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Top produits" subtitle="par chiffre d'affaires" className="lg:col-span-2">
              {top.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7B73' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tickFormatter={truncate} width={130} tick={{ fontSize: 11, fill: '#16201B' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#f4f7f5' }} />
                      <Bar dataKey="revenue" fill={ACCENT} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Répartition par catégorie">
              {cats.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="flex h-[260px] flex-col">
                  <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                      <Pie data={cats} dataKey="revenue" nameKey="category" innerRadius={45} outerRadius={80} paddingAngle={2} stroke="none">
                        {cats.map((_, i) => (
                          <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<MoneyTooltip nameKey="category" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                    {cats.slice(0, 6).map((c, i) => (
                      <span key={c.category} className="flex items-center gap-1.5 text-[11px] text-ink-mute">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        {c.category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Ligne 3 : Ventes vs Achats + Produits dormants + Ventes récentes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Ventes vs Achats" subtitle="sur la période">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#16201B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7B73' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#f4f7f5' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={56}>
                      {flowData.map((d) => (
                        <Cell key={d.name} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Panel title="Produits dormants" badge={dormant.length} hint="en stock, 0 vente sur la période">
              {dormant.length === 0 ? (
                <Empty text="Tout le stock a tourné. 🎉" />
              ) : (
                <ul className="divide-y divide-border">
                  {dormant.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{p.name}</div>
                        <div className="truncate text-[11.5px] text-ink-faint">{p.category?.name ?? '—'} · {p.stock} {p.unit}</div>
                      </div>
                      <span className="shrink-0 font-mono text-[12.5px] font-semibold tabular-nums text-ink-mute">{formatEuro(p.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Ventes récentes">
              {recent.length === 0 ? (
                <Empty text="Aucune vente pour le moment." />
              ) : (
                <ul className="divide-y divide-border">
                  {recent.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{s.clientName || 'Client comptoir'}</div>
                        <div className="truncate font-mono text-[11.5px] text-ink-faint tabular-nums">
                          {formatDateTime(s.createdAt)} · {PAYMENT_LABEL[s.paymentMethod]}
                        </div>
                      </div>
                      <span className={`shrink-0 font-mono text-[13.5px] font-semibold tabular-nums ${s.status === 'cancelled' ? 'text-ink-faint line-through' : 'text-ink'}`}>
                        {formatEuro(s.finalAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- helpers & sous-composants ---------- */

const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
function dayMonth(d: string) {
  return isDateKey(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : d;
}
function truncate(s: string) {
  return s.length > 20 ? `${s.slice(0, 19)}…` : s;
}

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: Record<string, unknown>; value: number }[];
  label?: string;
}
function MoneyTooltip({ active, payload, label, nameKey }: TooltipPayload & { nameKey?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const title = nameKey ? String(row.payload[nameKey]) : label != null ? dayMonth(String(label)) : '';
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-md">
      {title && <div className="font-semibold text-ink">{title}</div>}
      <div className="font-mono tabular-nums text-accent-deep">{formatEuro(row.value)}</div>
    </div>
  );
}

function TrendChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${up ? 'bg-accent-softer text-accent-deep' : 'bg-danger-soft text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  hintWarn,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  hintWarn?: boolean;
  trend?: number | null;
}) {
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${accent ? 'border-accent/30 bg-accent-softer' : 'border-border bg-surface'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-medium text-ink-mute">{label}</div>
        {trend != null && <TrendChip value={trend} />}
      </div>
      <div className={`mt-1 font-mono text-[26px] font-bold tabular-nums ${accent ? 'text-accent-deep' : 'text-ink'}`}>{value}</div>
      {hint && <div className={`mt-0.5 text-[11.5px] ${hintWarn ? 'font-semibold text-warn' : 'text-ink-faint'}`}>{hint}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, className = '', children }: { title: string; subtitle?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      <div className="mb-3">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {subtitle && <p className="text-[12px] text-ink-faint">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Panel({ title, badge, tone, hint, children }: { title: string; badge?: number; tone?: 'warn'; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {badge !== undefined && badge > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-canvas text-ink-mute'}`}>{badge}</span>
        )}
      </div>
      {hint && <p className="-mt-1 mb-2 text-[11.5px] text-ink-faint">{hint}</p>}
      {children}
    </div>
  );
}

function EmptyChart() {
  return <div className="grid h-[260px] place-items-center text-sm text-ink-mute">Aucune donnée sur la période.</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-ink-mute">{text}</div>;
}
