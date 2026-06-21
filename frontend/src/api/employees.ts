import api from "./axios";
import type { AbsenceType, AbsenceStatus } from "./absences";

/** Compte de connexion éventuellement rattaché à une fiche. */
export interface LinkedAccount {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

/** Solde de congés payés (année en cours). */
export interface LeaveBalance {
  quota: number;
  taken: number;
  pending: number;
  remaining: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: string; // Decimal sérialisé en chaîne
  hiredAt: string;
  leaveQuota: number;
  createdAt: string;
  user: LinkedAccount | null;
  _count: { payments: number };
  leaveBalance: LeaveBalance;
}

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: number;
  hiredAt: string; // AAAA-MM-JJ
  leaveQuota?: number;
  userId?: string | null;
}

// ── Données du profil personnel (GET /employees/me) ──

export interface MySalaryLine {
  id: string;
  amount: string;
  month: string;
  note: string | null;
  paidAt: string;
}

export interface MyAbsence {
  id: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  days: string;
  status: AbsenceStatus;
  reason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface MyTardiness {
  id: string;
  date: string;
  minutes: number;
  justified: boolean;
  note: string | null;
  createdAt: string;
}

export interface MyOvertime {
  id: string;
  date: string;
  hours: string;
  note: string | null;
  createdAt: string;
}

export interface MyCounters {
  tardinessCount: number;
  tardinessMinutes: number;
  overtimeHours: number;
}

export interface MyEmployee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  baseSalary: string;
  hiredAt: string;
  leaveQuota: number;
  createdAt: string;
  user: LinkedAccount | null;
  payments: MySalaryLine[];
  absences: MyAbsence[];
  tardiness: MyTardiness[];
  overtimes: MyOvertime[];
  leaveBalance: LeaveBalance;
  counters: MyCounters;
}

export const getEmployees = () =>
  api.get<Employee[]>("/employees").then((r) => r.data);

export const getMyEmployee = () =>
  api.get<MyEmployee>("/employees/me").then((r) => r.data);

export const createEmployee = (data: EmployeeInput) =>
  api.post<Employee>("/employees", data).then((r) => r.data);

export const updateEmployee = (id: string, data: Partial<EmployeeInput>) =>
  api.patch<Employee>(`/employees/${id}`, data).then((r) => r.data);

export const deleteEmployee = (id: string) =>
  api.delete(`/employees/${id}`).then((r) => r.data);
