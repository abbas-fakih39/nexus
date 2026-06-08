import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AbsenceStatus, AbsenceType } from '@prisma/client';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prisma: {
    employee: { findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      employee: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn() },
    };
    service = new EmployeesService(prisma as never);
  });

  const dto = {
    firstName: 'Sofiane',
    lastName: 'Benali',
    jobTitle: 'Caissier',
    baseSalary: 1700,
    hiredAt: '2023-09-15',
    userId: 'u1',
  };

  describe('create (rattachement de compte)', () => {
    it('400 si le compte est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('400 si le compte est un owner', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'owner', employee: null });
      await expect(service.create(dto)).rejects.toThrow('Seul un compte employé peut être lié à une fiche');
    });

    it('400 si le compte est déjà lié à une autre fiche', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'employee', employee: { id: 'autre' } });
      await expect(service.create(dto)).rejects.toThrow('déjà lié');
    });

    it('crée la fiche et renvoie le solde de congés', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'employee', employee: null });
      prisma.employee.create.mockResolvedValue({
        id: 'e1', firstName: 'Sofiane', leaveQuota: 25, user: null, _count: { payments: 0 }, absences: [],
      });
      const result = await service.create(dto);
      expect(result.leaveBalance).toEqual({ quota: 25, taken: 0, pending: 0, remaining: 25 });
      expect(result).not.toHaveProperty('absences'); // absences brutes retirées
    });
  });

  describe('remove', () => {
    it('404 si la fiche est introuvable', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.remove('e1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 si la fiche a des paiements de salaire', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e1', _count: { payments: 2 } });
      await expect(service.remove('e1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.employee.delete).not.toHaveBeenCalled();
    });

    it('supprime une fiche sans paiement', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e1', _count: { payments: 0 } });
      const result = await service.remove('e1');
      expect(prisma.employee.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('findMine', () => {
    it('404 sans fiche associée', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.findMine('u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('calcule solde et compteurs annuels (hors année précédente)', async () => {
      const Y = new Date().getFullYear();
      prisma.employee.findUnique.mockResolvedValue({
        id: 'e1',
        leaveQuota: 25,
        user: null,
        payments: [],
        absences: [
          { type: AbsenceType.paid_leave, status: AbsenceStatus.approved, days: 5, startDate: new Date(Y, 2, 2) },
          { type: AbsenceType.paid_leave, status: AbsenceStatus.pending, days: 2, startDate: new Date(Y, 3, 2) },
        ],
        tardiness: [
          { date: new Date(Y, 5, 2), minutes: 15 },
          { date: new Date(Y - 1, 5, 2), minutes: 99 }, // année précédente → ignoré
        ],
        overtimes: [
          { date: new Date(Y, 5, 10), hours: 3 },
          { date: new Date(Y - 1, 5, 10), hours: 5 }, // ignoré
        ],
      });

      const me = await service.findMine('u1');
      expect(me.leaveBalance).toEqual({ quota: 25, taken: 5, pending: 2, remaining: 20 });
      expect(me.counters).toEqual({ tardinessCount: 1, tardinessMinutes: 15, overtimeHours: 3 });
    });
  });
});
