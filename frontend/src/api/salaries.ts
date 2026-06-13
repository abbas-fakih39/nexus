import api from "./axios";

export interface SalaryPayment {
  id: string;
  amount: string; // Decimal sérialisé en chaîne
  month: string; // AAAA-MM
  note: string | null;
  paidAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  };
}

export interface SalaryPaymentInput {
  employeeId: string;
  amount: number;
  month: string; // AAAA-MM
  note?: string;
}

export const getSalaryPayments = () =>
  api.get<SalaryPayment[]>("/salary-payments").then((r) => r.data);

export const createSalaryPayment = (data: SalaryPaymentInput) =>
  api.post<SalaryPayment>("/salary-payments", data).then((r) => r.data);
