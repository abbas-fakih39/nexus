import api from './axios';
import type { Role } from '../store/authStore';

/** Compte tel que renvoyé par POST/PATCH (sans détail d'activité). */
export interface AccountBase {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Compte enrichi (GET /users) : activité + lien éventuel vers une fiche employé. */
export interface Account extends AccountBase {
  _count: { sales: number; purchases: number };
  employee: { id: string } | null;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  password: string;
}

export const getAccounts = () => api.get<Account[]>('/users').then((r) => r.data);

export const createAccount = (data: CreateAccountInput) =>
  api.post<AccountBase>('/users', data).then((r) => r.data);

export const setAccountActive = (id: string, isActive: boolean) =>
  api.patch<AccountBase>(`/users/${id}/active`, { isActive }).then((r) => r.data);

export const deleteAccount = (id: string) => api.delete(`/users/${id}`).then((r) => r.data);
