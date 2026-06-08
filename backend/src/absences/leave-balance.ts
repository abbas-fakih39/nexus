import { AbsenceStatus, AbsenceType } from '@prisma/client';

export interface LeaveBalance {
  quota: number;
  taken: number; // congés payés approuvés (année en cours)
  pending: number; // congés payés en attente (année en cours)
  remaining: number; // quota - taken
}

interface AbsenceLike {
  type: AbsenceType;
  status: AbsenceStatus;
  startDate: Date;
  days: unknown; // Decimal | number | string
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Solde de congés payés sur l'année donnée (par défaut l'année en cours). */
export function computeLeaveBalance(
  quota: number,
  absences: AbsenceLike[],
  year: number = new Date().getFullYear(),
): LeaveBalance {
  let taken = 0;
  let pending = 0;
  for (const a of absences) {
    if (a.type !== AbsenceType.paid_leave) continue;
    if (new Date(a.startDate).getFullYear() !== year) continue;
    const d = Number(a.days);
    if (Number.isNaN(d)) continue;
    if (a.status === AbsenceStatus.approved) taken += d;
    else if (a.status === AbsenceStatus.pending) pending += d;
  }
  taken = round1(taken);
  pending = round1(pending);
  return { quota, taken, pending, remaining: round1(quota - taken) };
}
