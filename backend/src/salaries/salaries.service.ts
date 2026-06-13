import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto';

/** Employé renvoyé avec chaque paiement (pour l'affichage de la liste). */
const PAYMENT_INCLUDE = {
  employee: {
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  },
} satisfies Prisma.SalaryPaymentInclude;

@Injectable()
export class SalariesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.salaryPayment.findMany({
      orderBy: [{ month: 'desc' }, { paidAt: 'desc' }],
      include: PAYMENT_INCLUDE,
    });
  }

  async create(dto: CreateSalaryPaymentDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');

    // Un seul paiement par employé et par mois.
    const existing = await this.prisma.salaryPayment.findFirst({
      where: { employeeId: dto.employeeId, month: dto.month },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Un paiement existe déjà pour cet employé sur ce mois',
      );
    }

    return this.prisma.salaryPayment.create({
      data: {
        employeeId: dto.employeeId,
        amount: dto.amount,
        month: dto.month,
        note: dto.note ?? null,
      },
      include: PAYMENT_INCLUDE,
    });
  }
}
