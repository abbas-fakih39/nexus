import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbsenceStatus } from '@prisma/client';
import { AbsencesService } from './absences.service';

describe('AbsencesService', () => {
  let service: AbsencesService;
  let prisma: {
    absence: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    employee: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      absence: {
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'a1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      employee: { findUnique: jest.fn() },
    };
    service = new AbsencesService(prisma as never);
  });

  const base = { type: 'paid_leave' as const, startDate: '2026-06-03', endDate: '2026-06-09' };

  describe('create', () => {
    it('refuse une date de fin antérieure au début', async () => {
      await expect(
        service.create({ ...base, startDate: '2026-06-10', endDate: '2026-06-05', employeeId: 'e1' }, { id: 'o', role: 'owner' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('owner : saisie directe approuvée, jours ouvrés calculés (03→09 juin = 5)', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
      await service.create({ ...base, employeeId: 'e1' }, { id: 'o', role: 'owner' });
      expect(prisma.absence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: 'e1',
            status: AbsenceStatus.approved,
            days: 5,
            decidedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('owner : exige un employeeId', async () => {
      await expect(service.create({ ...base }, { id: 'o', role: 'owner' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('owner : 404 si l’employé n’existe pas', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.create({ ...base, employeeId: 'x' }, { id: 'o', role: 'owner' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('employé : demande en attente sur SA fiche (employeeId du body ignoré)', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'fiche1' });
      await service.create({ ...base, employeeId: 'autre' }, { id: 'u1', role: 'employee' });
      expect(prisma.employee.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
      expect(prisma.absence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ employeeId: 'fiche1', status: AbsenceStatus.pending, decidedAt: null }),
        }),
      );
    });

    it('employé : 400 sans fiche associée', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.create({ ...base }, { id: 'u1', role: 'employee' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('respecte un nombre de jours fourni (demi-journée)', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
      await service.create({ ...base, employeeId: 'e1', days: 0.5 }, { id: 'o', role: 'owner' });
      expect(prisma.absence.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ days: 0.5 }) }),
      );
    });
  });

  describe('decide', () => {
    it('refuse une décision « pending »', async () => {
      await expect(service.decide('a1', AbsenceStatus.pending)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 si l’absence n’existe pas', async () => {
      prisma.absence.findUnique.mockResolvedValue(null);
      await expect(service.decide('a1', AbsenceStatus.approved)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('approuve et renseigne decidedAt', async () => {
      prisma.absence.findUnique.mockResolvedValue({ id: 'a1' });
      await service.decide('a1', AbsenceStatus.approved);
      expect(prisma.absence.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: AbsenceStatus.approved, decidedAt: expect.any(Date) }) }),
      );
    });
  });

  describe('remove', () => {
    it('404 si introuvable', async () => {
      prisma.absence.findUnique.mockResolvedValue(null);
      await expect(service.remove('a1', { id: 'o', role: 'owner' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('owner : supprime n’importe quelle absence', async () => {
      prisma.absence.findUnique.mockResolvedValue({ id: 'a1', status: AbsenceStatus.approved, employee: { userId: 'someone' } });
      await service.remove('a1', { id: 'o', role: 'owner' });
      expect(prisma.absence.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('employé : 403 si ce n’est pas sa fiche', async () => {
      prisma.absence.findUnique.mockResolvedValue({ id: 'a1', status: AbsenceStatus.pending, employee: { userId: 'autre' } });
      await expect(service.remove('a1', { id: 'u1', role: 'employee' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('employé : 400 si sa demande est déjà approuvée', async () => {
      prisma.absence.findUnique.mockResolvedValue({ id: 'a1', status: AbsenceStatus.approved, employee: { userId: 'u1' } });
      await expect(service.remove('a1', { id: 'u1', role: 'employee' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('employé : annule sa propre demande en attente', async () => {
      prisma.absence.findUnique.mockResolvedValue({ id: 'a1', status: AbsenceStatus.pending, employee: { userId: 'u1' } });
      await service.remove('a1', { id: 'u1', role: 'employee' });
      expect(prisma.absence.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });
  });
});
