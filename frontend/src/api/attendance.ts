import api from "./axios";

interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export interface Tardiness {
  id: string;
  date: string;
  minutes: number;
  justified: boolean;
  note: string | null;
  createdAt: string;
  employee: EmployeeRef;
}

export interface Overtime {
  id: string;
  date: string;
  hours: string; // Decimal sérialisé
  note: string | null;
  createdAt: string;
  employee: EmployeeRef;
}

export interface CreateTardinessInput {
  employeeId: string;
  date: string;
  minutes: number;
  justified?: boolean;
  note?: string;
}

export interface CreateOvertimeInput {
  employeeId: string;
  date: string;
  hours: number;
  note?: string;
}

export const getTardiness = () =>
  api.get<Tardiness[]>("/tardiness").then((r) => r.data);

export const createTardiness = (data: CreateTardinessInput) =>
  api.post<Tardiness>("/tardiness", data).then((r) => r.data);

export const deleteTardiness = (id: string) =>
  api.delete(`/tardiness/${id}`).then((r) => r.data);

export const getOvertime = () =>
  api.get<Overtime[]>("/overtime").then((r) => r.data);

export const createOvertime = (data: CreateOvertimeInput) =>
  api.post<Overtime>("/overtime", data).then((r) => r.data);

export const deleteOvertime = (id: string) =>
  api.delete(`/overtime/${id}`).then((r) => r.data);
