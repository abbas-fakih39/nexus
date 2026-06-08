import api from './axios';

export type Period = 'today' | '7d' | '30d' | 'year';

export interface DashboardStats {
  period: string;
  revenue: number;
  margin: number;
  marginRate: number;
  salesCount: number;
  avgBasket: number;
  purchasesTotal: number;
  stockValue: number;
  lowStockCount: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  purchases: number;
}

export interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export interface CategorySlice {
  category: string;
  revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  alertThreshold: number;
  unit: string;
  category?: { name: string } | null;
  supplier?: { name: string } | null;
}

export interface RecentSale {
  id: string;
  clientName: string | null;
  finalAmount: string;
  status: 'completed' | 'cancelled';
  paymentMethod: 'card' | 'cash' | 'transfer';
  createdAt: string;
  soldBy?: { name: string };
  _count?: { items: number };
}

export const getStats = (period: Period) =>
  api.get<DashboardStats>(`/dashboard/stats?period=${period}`).then((r) => r.data);

export const getRevenueSeries = (days: number) =>
  api.get<RevenuePoint[]>(`/dashboard/revenue-series?days=${days}`).then((r) => r.data);

export const getTopProducts = (period: Period) =>
  api.get<TopProduct[]>(`/dashboard/top-products?period=${period}`).then((r) => r.data);

export const getCategoryBreakdown = (period: Period) =>
  api.get<CategorySlice[]>(`/dashboard/category-breakdown?period=${period}`).then((r) => r.data);

export const getLowStock = () =>
  api.get<LowStockProduct[]>('/dashboard/low-stock').then((r) => r.data);

export const getRecentSales = () =>
  api.get<RecentSale[]>('/dashboard/recent-sales').then((r) => r.data);
