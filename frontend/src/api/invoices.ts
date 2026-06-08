import api from './axios';

export type InvoiceType = 'sale' | 'purchase';
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';

export interface InvoiceSummary {
  id: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  createdAt: string;
  saleId: string | null;
  purchaseId: string | null;
  sale?: {
    id: string;
    clientName: string | null;
    finalAmount: string;
    soldBy?: { name: string };
  } | null;
  purchase?: {
    id: string;
    totalAmount: string;
    supplier?: { name: string };
    createdBy?: { name: string };
  } | null;
}

export const getInvoices = (params?: { type?: InvoiceType; status?: InvoiceStatus }) => {
  const qs = new URLSearchParams();
  if (params?.type) qs.set('type', params.type);
  if (params?.status) qs.set('status', params.status);
  const q = qs.toString();
  return api.get<InvoiceSummary[]>(`/invoices${q ? `?${q}` : ''}`).then((r) => r.data);
};

export const updateInvoiceStatus = (id: string, status: InvoiceStatus) =>
  api.patch<InvoiceSummary>(`/invoices/${id}/status`, { status }).then((r) => r.data);

export type InvoicePdfFormat = 'a4' | 'receipt';

/** Récupère le PDF en blob (le token JWT passe via l'intercepteur axios) et l'ouvre dans un onglet. */
export const openInvoicePdf = async (id: string, format: InvoicePdfFormat = 'a4') => {
  const q = format === 'receipt' ? '?format=receipt' : '';
  const res = await api.get(`/invoices/${id}/pdf${q}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
