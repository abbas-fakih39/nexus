import api from './axios';

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface SupplierInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const getSuppliers = () =>
  api.get<Supplier[]>('/suppliers').then((r) => r.data);

export const createSupplier = (data: SupplierInput) =>
  api.post<Supplier>('/suppliers', data).then((r) => r.data);

export const updateSupplier = (id: string, data: Partial<SupplierInput>) =>
  api.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data);

export const deleteSupplier = (id: string) =>
  api.delete(`/suppliers/${id}`).then((r) => r.data);
