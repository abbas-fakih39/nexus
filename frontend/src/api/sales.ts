import api from './axios';

export type PaymentMethod = 'card' | 'cash' | 'transfer';
export type SaleStatus = 'completed' | 'cancelled';

export interface SaleSummary {
  id: string;
  clientName: string | null;
  /** Decimal sérialisé en string. */
  totalAmount: string;
  discount: string;
  finalAmount: string;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  soldById: string;
  soldBy?: { id: string; name: string };
  _count?: { items: number };
}

export interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  productId: string;
  product?: { id: string; name: string; sku: string | null; unit: string };
}

export interface SaleDetail extends SaleSummary {
  items: SaleItem[];
  invoice?: { id: string; number: string } | null;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface CreateSaleInput {
  clientName?: string;
  discount?: number;
  paymentMethod: PaymentMethod;
  items: CreateSaleItemInput[];
}

export const createSale = (data: CreateSaleInput) =>
  api.post<SaleDetail>('/sales', data).then((r) => r.data);

export const getSales = (params?: { from?: string; to?: string }) => {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const q = qs.toString();
  return api.get<SaleSummary[]>(`/sales${q ? `?${q}` : ''}`).then((r) => r.data);
};

export const getSale = (id: string) =>
  api.get<SaleDetail>(`/sales/${id}`).then((r) => r.data);

export const cancelSale = (id: string) =>
  api.post<SaleSummary>(`/sales/${id}/cancel`, {}).then((r) => r.data);
