import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dateKey(d: Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function periodFrom(period: string): Date {
  const now = new Date();
  if (period === 'today') return startOfDay(now);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  const d = startOfDay(now);
  d.setDate(d.getDate() - (period === '7d' ? 6 : 29)); // 7d / 30d (défaut), inclusif
  return d;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** Agrégat ventes (CA, marge, nb) sur un intervalle [gte, lt?). */
  private async salesAgg(gte: Date, lt?: Date) {
    const sales = await this.prisma.sale.findMany({
      where: { status: 'completed', createdAt: { gte, ...(lt ? { lt } : {}) } },
      select: {
        finalAmount: true,
        items: { select: { unitCost: true, quantity: true } },
      },
    });
    let revenue = 0;
    let cost = 0;
    for (const s of sales) {
      revenue += num(s.finalAmount);
      for (const it of s.items) cost += num(it.unitCost) * it.quantity;
    }
    return {
      revenue: round2(revenue),
      margin: round2(revenue - cost),
      salesCount: sales.length,
    };
  }

  /** KPIs de la période + comparaison avec la période précédente de même durée. */
  async stats(period: string) {
    const now = new Date();
    const from = periodFrom(period);
    const prevFrom = new Date(
      from.getTime() - (now.getTime() - from.getTime()),
    );

    const [cur, prev] = await Promise.all([
      this.salesAgg(from),
      this.salesAgg(prevFrom, from),
    ]);

    const purchasesAgg = await this.prisma.purchase.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'received', createdAt: { gte: from } },
    });

    const products = await this.prisma.product.findMany({
      select: { costPrice: true, stock: true, alertThreshold: true },
    });
    const stockValue = products.reduce(
      (s, p) => s + num(p.costPrice) * p.stock,
      0,
    );
    const lowStockCount = products.filter(
      (p) => p.stock <= p.alertThreshold,
    ).length;

    return {
      period,
      revenue: cur.revenue,
      margin: cur.margin,
      marginRate: cur.revenue ? round2((cur.margin / cur.revenue) * 100) : 0,
      salesCount: cur.salesCount,
      avgBasket: cur.salesCount ? round2(cur.revenue / cur.salesCount) : 0,
      purchasesTotal: round2(num(purchasesAgg._sum.totalAmount ?? 0)),
      stockValue: round2(stockValue),
      lowStockCount,
      prev: {
        revenue: prev.revenue,
        margin: prev.margin,
        salesCount: prev.salesCount,
      },
    };
  }

  /** Produits en stock mais sans aucune vente sur la période (surstock à écouler). */
  async dormantProducts(period: string) {
    const from = periodFrom(period);
    const sold = await this.prisma.saleItem.findMany({
      where: { sale: { status: 'completed', createdAt: { gte: from } } },
      select: { productId: true },
      distinct: ['productId'],
    });
    const soldIds = new Set(sold.map((s) => s.productId));
    const products = await this.prisma.product.findMany({
      where: { stock: { gt: 0 } },
      include: { category: { select: { name: true } } },
    });
    return products
      .filter((p) => !soldIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        category: p.category,
        value: round2(num(p.costPrice) * p.stock),
      }))
      .sort((a, b) => b.value - a.value);
  }

  /** Série journalière (CA & achats) sur les `days` derniers jours. */
  async revenueSeries(days: number) {
    const from = startOfDay(new Date());
    from.setDate(from.getDate() - (days - 1));

    const [sales, purchases] = await Promise.all([
      this.prisma.sale.findMany({
        where: { status: 'completed', createdAt: { gte: from } },
        select: { finalAmount: true, createdAt: true },
      }),
      this.prisma.purchase.findMany({
        where: { status: 'received', createdAt: { gte: from } },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    const map = new Map<
      string,
      { date: string; revenue: number; purchases: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      map.set(dateKey(d), { date: dateKey(d), revenue: 0, purchases: 0 });
    }
    for (const s of sales) {
      const e = map.get(dateKey(s.createdAt));
      if (e) e.revenue = round2(e.revenue + num(s.finalAmount));
    }
    for (const p of purchases) {
      const e = map.get(dateKey(p.createdAt));
      if (e) e.purchases = round2(e.purchases + num(p.totalAmount));
    }
    return [...map.values()];
  }

  /** Meilleures ventes (par CA) sur la période. */
  async topProducts(period: string) {
    const from = periodFrom(period);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { status: 'completed', createdAt: { gte: from } } },
      select: {
        quantity: true,
        unitPrice: true,
        discount: true,
        product: { select: { id: true, name: true } },
      },
    });
    const agg = new Map<
      string,
      { name: string; qty: number; revenue: number }
    >();
    for (const it of items) {
      const rev =
        num(it.unitPrice) * it.quantity * (1 - num(it.discount) / 100);
      const e = agg.get(it.product.id) ?? {
        name: it.product.name,
        qty: 0,
        revenue: 0,
      };
      e.qty += it.quantity;
      e.revenue = round2(e.revenue + rev);
      agg.set(it.product.id, e);
    }
    return [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }

  /** Répartition du CA par catégorie sur la période. */
  async categoryBreakdown(period: string) {
    const from = periodFrom(period);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { status: 'completed', createdAt: { gte: from } } },
      select: {
        quantity: true,
        unitPrice: true,
        discount: true,
        product: { select: { category: { select: { name: true } } } },
      },
    });
    const agg = new Map<string, number>();
    for (const it of items) {
      const rev =
        num(it.unitPrice) * it.quantity * (1 - num(it.discount) / 100);
      const name = it.product.category?.name ?? 'Sans catégorie';
      agg.set(name, round2((agg.get(name) ?? 0) + rev));
    }
    return [...agg.entries()]
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /** Produits sous le seuil d'alerte (réappro à prévoir). */
  lowStock() {
    return this.prisma.product
      .findMany({
        include: {
          category: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { stock: 'asc' },
      })
      .then((list) => list.filter((p) => p.stock <= p.alertThreshold));
  }

  /** Activité du jour de l'utilisateur courant (non financière) : ses ventes + articles. */
  async myDay(userId: string) {
    const from = startOfDay(new Date());
    const sales = await this.prisma.sale.findMany({
      where: {
        soldById: userId,
        status: 'completed',
        createdAt: { gte: from },
      },
      select: { items: { select: { quantity: true } } },
    });
    const itemsSold = sales.reduce(
      (s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0),
      0,
    );
    return { salesToday: sales.length, itemsSold };
  }

  /** Dernières ventes (tous statuts). */
  recentSales() {
    return this.prisma.sale.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        soldBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });
  }
}
