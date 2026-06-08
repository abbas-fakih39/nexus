import api from './axios';

export type AbsenceType = 'paid_leave' | 'unpaid_leave' | 'sick' | 'other';
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export const ABSENCE_TYPE_LABEL: Record<AbsenceType, string> = {
  paid_leave: 'Congé payé',
  unpaid_leave: 'Sans solde',
  sick: 'Maladie',
  other: 'Autre',
};

export const ABSENCE_STATUS_LABEL: Record<AbsenceStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

export interface Absence {
  id: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  days: string; // Decimal sérialisé
  status: AbsenceStatus;
  reason: string | null;
  decidedAt: string | null;
  createdAt: string;
  employee: { id: string; firstName: string; lastName: string; jobTitle: string };
}

export interface CreateAbsenceInput {
  type: AbsenceType;
  startDate: string;
  endDate: string;
  reason?: string;
  days?: number;
  employeeId?: string; // requis pour l'owner
}

export const getAbsences = () =>
  api.get<Absence[]>('/absences').then((r) => r.data);

export const createAbsence = (data: CreateAbsenceInput) =>
  api.post<Absence>('/absences', data).then((r) => r.data);

export const decideAbsence = (id: string, status: 'approved' | 'rejected') =>
  api.patch<Absence>(`/absences/${id}/status`, { status }).then((r) => r.data);

export const deleteAbsence = (id: string) =>
  api.delete(`/absences/${id}`).then((r) => r.data);
