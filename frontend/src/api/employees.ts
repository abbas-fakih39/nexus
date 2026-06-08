import api from './axios';

/** Compte de connexion éventuellement rattaché à une fiche. */
export interface LinkedAccount {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: string; // Decimal sérialisé en chaîne
  hiredAt: string;
  createdAt: string;
  user: LinkedAccount | null;
  _count: { payments: number };
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: number;
  hiredAt: string; // AAAA-MM-JJ
  userId?: string | null;
}

export const getEmployees = () =>
  api.get<Employee[]>('/employees').then((r) => r.data);

export const createEmployee = (data: EmployeeInput) =>
  api.post<Employee>('/employees', data).then((r) => r.data);

export const updateEmployee = (id: string, data: Partial<EmployeeInput>) =>
  api.patch<Employee>(`/employees/${id}`, data).then((r) => r.data);

export const deleteEmployee = (id: string) =>
  api.delete(`/employees/${id}`).then((r) => r.data);
