import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  getMyDay,
  getLowStock,
  getRecentSales,
  type MyDay,
  type LowStockProduct,
  type RecentSale,
} from '../../api/dashboard';
import { formatEuro, formatDateTime } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';

const PAYMENT_LABEL: Record<string, string> = { card: 'Carte', cash: 'Espèces', transfer: 'Virement' };

const todayLabel = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export default function MonEspace() {
  const name = useAuthStore((s) => s.user?.name ?? '');

  const [loading, setLoading] = useState(true);
  const [myDay, setMyDay] = useState<MyDay | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recent, setRecent] = useState<RecentSale[]>([]);

  useEffect(() => {
    Promise.all([getMyDay(), getLowStock(), getRecentSales()])
      .then(([md, ls, rs]) => {
        setMyDay(md);
        setLowStock(ls);
        setRecent(rs);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Bonjour, {name.split(' ')[0] || 'bienvenue'} 👋</h2>
        <p className="mt-1 text-sm capitalize text-ink-mute">{todayLabel}</p>
      </div>

      {loading || !myDay ? (
        <div className="grid min-h-[50vh] place-items-center">
          <Spinner className="h-8 w-8 text-accent" />
        </div>
      ) : (
        <>
          {/* Accès rapides */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/ventes"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-accent bg-accent px-6 py-5 text-white shadow-sm transition hover:bg-accent-deep"
            >
              <div>
                <div className="text-lg font-bold">Nouvelle vente</div>
                <div className="text-[13px] text-white/80">Ouvrir la caisse</div>
              </div>
              <CartIcon />
            </Link>
            <Link
              to="/stock"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-6 py-5 text-ink shadow-sm transition hover:bg-canvas"
            >
              <div>
                <div className="text-lg font-bold">Consulter le stock</div>
                <div className="text-[13px] text-ink-mute">Produits & disponibilités</div>
              </div>
              <BoxIcon />
            </Link>
          </div>

          {/* Mon activité du jour */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Mes ventes aujourd'hui" value={String(myDay.salesToday)} />
            <StatCard label="Articles vendus" value={String(myDay.itemsSold)} />
          </div>

          {/* Panneaux */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Alertes stock" badge={lowStock.length}>
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
                          <div className="truncate text-[11.5px] text-ink-faint">{p.category?.name ?? '—'}</div>
                        </div>
                        <Badge tone={out ? 'danger' : 'warn'}>{out ? 'Rupture' : `${p.stock} ${p.unit}`}</Badge>
                      </li>
                    );
                  })}
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

/* ---------- sous-composants ---------- */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="text-[12px] font-medium text-ink-mute">{label}</div>
      <div className="mt-1 font-mono text-[26px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
}

function Panel({ title, badge, children }: { title: string; badge?: number; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-ink-mute">{text}</div>;
}

const CartIcon = () => (
  <svg className="h-9 w-9 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h2l3 13h12l2-9H6" />
    <circle cx="9" cy="20" r="1.6" />
    <circle cx="17" cy="20" r="1.6" />
  </svg>
);
const BoxIcon = () => (
  <svg className="h-9 w-9 text-ink-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 16l9 5 9-5" />
  </svg>
);
