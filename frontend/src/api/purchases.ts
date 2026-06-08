import api from './axios';

export type PurchaseStatus = 'received' | 'cancelled';

export interface PurchaseSummary {
  id: string;
  /** Decimal sérialisé en string. */
  totalAmount: string;
  status: PurchaseStatus;
  notes: string | null;
  createdAt: string;
  supplierId: string;
  createdById: string;
  supplier?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  _count?: { items: number };
}

export interface PurchaseItem {
  id: string;
  quantity: number;
  unitCost: string;
  productId: string;
  product?: { id: string; name: string; sku: string | null; unit: string };
}

export interface PurchaseDetail extends PurchaseSummary {
  items: PurchaseItem[];
  invoice?: { id: string; number: string } | null;
}

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export const createPurchase = (data: CreatePurchaseInput) =>
  api.post<PurchaseDetail>('/purchases', data).then((r) => r.data);

export const getPurchases = (params?: { from?: string; to?: string }) => {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const q = qs.toString();
  return api.get<PurchaseSummary[]>(`/purchases${q ? `?${q}` : ''}`).then((r) => r.data);
};

export const getPurchase = (id: string) =>
  api.get<PurchaseDetail>(`/purchases/${id}`).then((r) => r.data);

export const cancelPurchase = (id: string) =>
  api.post<PurchaseSummary>(`/purchases/${id}/cancel`, {}).then((r) => r.data);
