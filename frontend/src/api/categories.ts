import api from './axios';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface CategoryInput {
  name: string;
}

export const getCategories = () =>
  api.get<Category[]>('/categories').then((r) => r.data);

export const createCategory = (data: CategoryInput) =>
  api.post<Category>('/categories', data).then((r) => r.data);

export const updateCategory = (id: string, data: Partial<CategoryInput>) =>
  api.patch<Category>(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: string) =>
  api.delete(`/categories/${id}`).then((r) => r.data);
