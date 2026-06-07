import api from './axios';
import type { Category } from './categories';
import type { Supplier } from './suppliers';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  /** Decimal sérialisé en string par Prisma (ex. "12.90"). */
  price: string;
  costPrice: string | null;
  stock: number;
  alertThreshold: number;
  unit: string;
  createdAt: string;
  categoryId: string;
  supplierId: string | null;
  category?: Category;
  supplier?: Supplier | null;
}

export interface ProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  price: number;
  costPrice?: number;
  stock?: number;
  alertThreshold?: number;
  unit?: string;
  categoryId: string;
  supplierId?: string;
}

export const getProducts = () =>
  api.get<Product[]>('/products').then((r) => r.data);

export const getLowStockProducts = () =>
  api.get<Product[]>('/products/low-stock').then((r) => r.data);

export const getProduct = (id: string) =>
  api.get<Product>(`/products/${id}`).then((r) => r.data);

export const createProduct = (data: ProductInput) =>
  api.post<Product>('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<ProductInput>) =>
  api.patch<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then((r) => r.data);
