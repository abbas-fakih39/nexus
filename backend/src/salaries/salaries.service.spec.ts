import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalariesService } from './salaries.service';

describe('SalariesService', () => {
  let service: SalariesService;
  let prisma: {
    employee: { findUnique: jest.Mock };
    salaryPayment: { findFirst: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      employee: { findUnique: jest.fn() },
      salaryPayment: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'pay1' }),
      },
    };
    service = new SalariesService(prisma as never);
  });

  const dto = { employeeId: 'e1', amount: 1700, month: '2026-05', note: 'Mai' };

  it('404 si l’employé n’existe pas', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.salaryPayment.create).not.toHaveBeenCalled();
  });

  it('400 si un paiement existe déjà pour cet employé ce mois-là', async () => {
    prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.salaryPayment.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.salaryPayment.create).not.toHaveBeenCalled();
  });

  it('enregistre le paiement quand l’employé existe et qu’il n’y a pas de doublon', async () => {
    prisma.employee.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.salaryPayment.findFirst.mockResolvedValue(null);
    await service.create(dto);
    expect(prisma.salaryPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'e1',
          amount: 1700,
          month: '2026-05',
          note: 'Mai',
        }),
      }),
    );
  });
});
