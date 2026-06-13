import { AbsenceStatus, AbsenceType } from '@prisma/client';
import { computeLeaveBalance } from './leave-balance';

/** Fabrique une absence minimale pour les tests. */
function abs(
  type: AbsenceType,
  status: AbsenceStatus,
  days: number,
  startDate = new Date('2026-03-02'),
) {
  return { type, status, days, startDate };
}

describe('computeLeaveBalance', () => {
  const YEAR = 2026;

  it('renvoie un solde plein quand il n’y a aucune absence', () => {
    expect(computeLeaveBalance(25, [], YEAR)).toEqual({
      quota: 25,
      taken: 0,
      pending: 0,
      remaining: 25,
    });
  });

  it('compte les congés payés approuvés dans « pris » et réduit le restant', () => {
    const r = computeLeaveBalance(
      25,
      [abs(AbsenceType.paid_leave, AbsenceStatus.approved, 5)],
      YEAR,
    );
    expect(r.taken).toBe(5);
    expect(r.remaining).toBe(20);
    expect(r.pending).toBe(0);
  });

  it('compte les congés payés en attente sans toucher au restant', () => {
    const r = computeLeaveBalance(
      25,
      [abs(AbsenceType.paid_leave, AbsenceStatus.pending, 3)],
      YEAR,
    );
    expect(r.pending).toBe(3);
    expect(r.taken).toBe(0);
    expect(r.remaining).toBe(25);
  });

  it('ignore les demandes refusées', () => {
    const r = computeLeaveBalance(
      25,
      [abs(AbsenceType.paid_leave, AbsenceStatus.rejected, 4)],
      YEAR,
    );
    expect(r.taken).toBe(0);
    expect(r.pending).toBe(0);
    expect(r.remaining).toBe(25);
  });

  it('ignore les types autres que congé payé (maladie, sans solde…)', () => {
    const r = computeLeaveBalance(
      25,
      [
        abs(AbsenceType.sick, AbsenceStatus.approved, 3),
        abs(AbsenceType.unpaid_leave, AbsenceStatus.approved, 2),
      ],
      YEAR,
    );
    expect(r.taken).toBe(0);
    expect(r.remaining).toBe(25);
  });

  it('ne compte que les absences de l’année demandée', () => {
    const r = computeLeaveBalance(
      25,
      [
        abs(
          AbsenceType.paid_leave,
          AbsenceStatus.approved,
          5,
          new Date('2025-03-02'),
        ),
        abs(
          AbsenceType.paid_leave,
          AbsenceStatus.approved,
          2,
          new Date('2026-03-02'),
        ),
      ],
      YEAR,
    );
    expect(r.taken).toBe(2);
    expect(r.remaining).toBe(23);
  });

  it('gère les demi-journées et l’arrondi', () => {
    const r = computeLeaveBalance(
      25,
      [
        abs(AbsenceType.paid_leave, AbsenceStatus.approved, 0.5),
        abs(AbsenceType.paid_leave, AbsenceStatus.approved, 1.5),
        abs(AbsenceType.paid_leave, AbsenceStatus.pending, 0.5),
      ],
      YEAR,
    );
    expect(r.taken).toBe(2);
    expect(r.pending).toBe(0.5);
    expect(r.remaining).toBe(23);
  });

  it('accepte les jours sérialisés en chaîne (Decimal)', () => {
    const r = computeLeaveBalance(
      25,
      [
        {
          type: AbsenceType.paid_leave,
          status: AbsenceStatus.approved,
          days: '5',
          startDate: new Date('2026-03-02'),
        },
      ],
      YEAR,
    );
    expect(r.taken).toBe(5);
  });
});
